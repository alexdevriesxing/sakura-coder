import type { RiskLevel } from '../types/sakura';

export interface TerminalHistoryEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  blocked: boolean;
  riskLevel: RiskLevel;
  timestamp: string;
  pendingConfirmation?: string;
}

const MAX_LINES = 500;

export function trimHistory(entries: TerminalHistoryEntry[], maxLines = MAX_LINES): TerminalHistoryEntry[] {
  let total = 0;
  const kept: TerminalHistoryEntry[] = [];
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    const lines =
      (entry.stdout ? entry.stdout.split('\n').length : 0) +
      (entry.stderr ? entry.stderr.split('\n').length : 0) +
      1;
    if (total + lines <= maxLines) {
      kept.unshift(entry);
      total += lines;
    }
  }
  return kept;
}
