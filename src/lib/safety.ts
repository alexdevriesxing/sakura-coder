import { BLOCKED_COMMAND_PATTERNS, EXACT_CONFIRMATIONS, HIGH_RISK_COMMAND_PATTERNS, SAFE_COMMAND_PATTERNS, SECRET_FILE_PATTERNS } from '../data/guardrails';
import { getModeDefinition } from '../data/modes';
import type { ProposedFileChange, RiskLevel, SafetyDecision, SakuraMode } from '../types/sakura';

const includesPattern = (input: string, patterns: string[]) => {
  const normalized = input.toLowerCase();
  return patterns.filter((pattern) => normalized.includes(pattern.toLowerCase()));
};

export function assessCommandRisk(command: string, mode: SakuraMode): SafetyDecision {
  const modeDefinition = getModeDefinition(mode);
  const blocked = includesPattern(command, BLOCKED_COMMAND_PATTERNS);
  if (blocked.length > 0) {
    return {
      allowed: false,
      riskLevel: 'critical',
      reason: `Blocked destructive command pattern: ${blocked.join(', ')}`,
      requiresExactConfirmation: EXACT_CONFIRMATIONS.critical,
      blockedPatterns: blocked,
    };
  }

  if (!modeDefinition.canRunTerminal) {
    return {
      allowed: false,
      riskLevel: 'medium',
      reason: `${modeDefinition.label} Mode is not allowed to run terminal commands.`,
    };
  }

  const highRisk = includesPattern(command, HIGH_RISK_COMMAND_PATTERNS);
  if (highRisk.length > 0) {
    return {
      allowed: false,
      riskLevel: 'high',
      reason: `High-risk command requires explicit approval: ${highRisk.join(', ')}`,
      requiresExactConfirmation: EXACT_CONFIRMATIONS.high,
      blockedPatterns: highRisk,
    };
  }

  const safe = includesPattern(command, SAFE_COMMAND_PATTERNS);
  if (safe.length > 0 || /^(cat|type|grep|rg|findstr|npm run typecheck|npm run test)/i.test(command.trim())) {
    return {
      allowed: true,
      riskLevel: 'low',
      reason: 'Command appears to be read-only or validation-focused.',
    };
  }

  return {
    allowed: false,
    riskLevel: 'medium',
    reason: 'Unknown command. Require review before execution.',
    requiresExactConfirmation: 'I approve this command for this workspace.',
  };
}

export function assessFileRead(relativePath: string, userApprovedSecretRead = false): SafetyDecision {
  const normalized = relativePath.replaceAll('\\\\', '/').toLowerCase();
  const secret = SECRET_FILE_PATTERNS.find((pattern) => normalized.endsWith(pattern.toLowerCase()));
  if (secret && !userApprovedSecretRead) {
    return {
      allowed: false,
      riskLevel: 'high',
      reason: `Reading secret-like file "${secret}" requires explicit user approval.`,
      requiresExactConfirmation: 'I approve reading this secret file once.',
    };
  }
  return { allowed: true, riskLevel: 'low', reason: 'File read allowed.' };
}

export function assessFileChange(change: ProposedFileChange, mode: SakuraMode): SafetyDecision {
  const modeDefinition = getModeDefinition(mode);
  const path = change.relativePath.toLowerCase();
  const isMarkdown = path.endsWith('.md') || path.endsWith('.mdx');
  const secret = SECRET_FILE_PATTERNS.find((pattern) => path.endsWith(pattern));

  if (secret) {
    return {
      allowed: false,
      riskLevel: 'critical',
      reason: `The agent may not modify secret-like file ${change.relativePath}.`,
      requiresExactConfirmation: EXACT_CONFIRMATIONS.critical,
    };
  }

  if (change.action === 'delete') {
    return {
      allowed: false,
      riskLevel: 'high',
      reason: 'Deletes require manual review and exact confirmation.',
      requiresExactConfirmation: EXACT_CONFIRMATIONS.high,
    };
  }

  if (isMarkdown && modeDefinition.canEditMarkdown) {
    return { allowed: true, riskLevel: change.riskLevel, reason: 'Markdown edit allowed with diff approval.' };
  }

  if (!isMarkdown && modeDefinition.canEditCode) {
    return { allowed: true, riskLevel: change.riskLevel, reason: 'Code edit allowed with diff approval.' };
  }

  return {
    allowed: false,
    riskLevel: 'medium',
    reason: `${modeDefinition.label} Mode does not allow this type of file change.`,
  };
}

export function highestRisk(levels: RiskLevel[]): RiskLevel {
  const order: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  return levels.reduce((current, next) => (order.indexOf(next) > order.indexOf(current) ? next : current), 'low');
}
