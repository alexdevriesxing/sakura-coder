import type { RiskLevel } from '../types/sakura';

export const BLOCKED_COMMAND_PATTERNS = [
  'rm -rf',
  'del /s',
  'rmdir /s',
  'Remove-Item -Recurse -Force',
  'git reset --hard',
  'git clean -fd',
  'format ',
  'diskpart',
  'mkfs',
  'dd if=',
  'npm publish',
  'pnpm publish',
  'yarn publish',
  'wrangler deploy',
  'vercel deploy --prod',
  'docker system prune',
  'chmod -R 777',
  'chown -R',
  'sudo ',
];

export const HIGH_RISK_COMMAND_PATTERNS = [
  'npm install',
  'pnpm add',
  'yarn add',
  'cargo add',
  'npx',
  'npm run build',
  'npm run tauri:build',
  'cargo build',
  'git push',
  'git commit',
  'git checkout',
  'git merge',
  'git rebase',
  'python -m pip install',
  'pip install',
];

export const SAFE_COMMAND_PATTERNS = [
  'pwd',
  'ls',
  'dir',
  'git status',
  'git diff',
  'git log',
  'npm run typecheck',
  'npm test',
  'npm run test',
  'npm run lint',
  'cargo check',
  'cargo test',
];

export const EXACT_CONFIRMATIONS: Record<RiskLevel, string | undefined> = {
  low: undefined,
  medium: undefined,
  high: 'I understand the risk and approve this action.',
  critical: 'APPROVE CRITICAL ACTION',
};

export const SECRET_FILE_PATTERNS = [
  '.env',
  '.env.local',
  '.env.production',
  'id_rsa',
  'id_ed25519',
  'secrets.json',
  'credentials.json',
  '.npmrc',
  '.pypirc',
];

export const WORKSPACE_RULES = [
  'Never edit outside the active project workspace.',
  'Never read secret files unless the user explicitly approves a one-time read.',
  'Never overwrite assets or source files silently.',
  'Always create a checkpoint before applying edits.',
  'Always show a diff before applying code changes.',
  'Always summarize created, modified and deleted files after a task.',
  'Always keep patches small enough for a human to review.',
];
