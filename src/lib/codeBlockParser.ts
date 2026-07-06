import type { ProposedFileChange, RiskLevel } from '../types/sakura';
export { highestRisk } from './safety';

export interface ParsedCodeBlock {
  language: string;
  relativePath: string;
  content: string;
}

/**
 * Matches fenced code blocks with a filename annotation.
 * Captures: (1) language, (2) relative file path, (3) block content.
 *
 * Matches:   ```typescript src/foo.ts
 * Does NOT match blocks with only a language tag and no path.
 */
const ANNOTATED_BLOCK_RE = /```(\w+)\s+([\w./-]+\.\w+)\n([\s\S]*?)```/g;

/**
 * Extract all annotated fenced code blocks from an agent response string.
 * Blocks with only a language identifier (no file path) are skipped.
 */
export function parseAnnotatedCodeBlocks(responseText: string): ParsedCodeBlock[] {
  const results: ParsedCodeBlock[] = [];
  // Reset lastIndex in case the regex is reused
  ANNOTATED_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ANNOTATED_BLOCK_RE.exec(responseText)) !== null) {
    const [, language, relativePath, content] = match;
    results.push({ language, relativePath, content });
  }
  return results;
}

function computeRiskLevel(relativePath: string): RiskLevel {
  const lower = relativePath.toLowerCase();
  const name = lower.split('/').pop() ?? lower;

  // Critical: secrets and sensitive config
  if (
    name === '.env' ||
    name.startsWith('.env.') ||
    name.endsWith('.key') ||
    name.endsWith('.pem') ||
    name === 'config.json'
  ) {
    return 'critical';
  }

  // High: dependency manifests and lock files
  if (
    name === 'package.json' ||
    name === 'cargo.toml' ||
    name.endsWith('.lock')
  ) {
    return 'high';
  }

  // Medium: source code
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.rs') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.py') ||
    lower.endsWith('.css') ||
    lower.endsWith('.html')
  ) {
    return 'medium';
  }

  // Low: markdown, assets, everything else
  return 'low';
}

/**
 * Convert parsed code blocks into ProposedFileChange objects.
 * action is 'create' if oldContent is undefined, 'modify' otherwise.
 */
export function toProposedFileChanges(
  blocks: ParsedCodeBlock[],
  existingContents: Record<string, string>
): ProposedFileChange[] {
  return blocks.map((block) => {
    const oldContent = existingContents[block.relativePath];
    return {
      id: crypto.randomUUID(),
      relativePath: block.relativePath,
      action: oldContent !== undefined ? 'modify' : 'create',
      reason: 'Proposed by Sakura agent response.',
      oldContent,
      newContent: block.content,
      riskLevel: computeRiskLevel(block.relativePath),
    };
  });
}
