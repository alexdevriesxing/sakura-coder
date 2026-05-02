import type { RiskLevel, SakuraMode } from '../types/sakura';

export interface ModeDefinition {
  id: SakuraMode;
  label: string;
  summary: string;
  canEditMarkdown: boolean;
  canEditCode: boolean;
  canRunTerminal: boolean;
  canGenerateAssets: boolean;
  requiresDiffApproval: boolean;
  defaultRisk: RiskLevel;
}

export const MODE_DEFINITIONS: ModeDefinition[] = [
  {
    id: 'ask',
    label: 'Ask',
    summary: 'Answer questions and explain code without changing files.',
    canEditMarkdown: false,
    canEditCode: false,
    canRunTerminal: false,
    canGenerateAssets: false,
    requiresDiffApproval: false,
    defaultRisk: 'low',
  },
  {
    id: 'context',
    label: 'Context Builder',
    summary: 'Ask guided questions and turn rough descriptions into structured project context.',
    canEditMarkdown: true,
    canEditCode: false,
    canRunTerminal: false,
    canGenerateAssets: false,
    requiresDiffApproval: true,
    defaultRisk: 'low',
  },
  {
    id: 'plan',
    label: 'Plan',
    summary: 'Inspect, plan, and create implementation roadmaps without touching source code.',
    canEditMarkdown: true,
    canEditCode: false,
    canRunTerminal: false,
    canGenerateAssets: false,
    requiresDiffApproval: true,
    defaultRisk: 'low',
  },
  {
    id: 'docs',
    label: 'Docs',
    summary: 'Create and maintain Markdown documentation, PRDs, GDDs, READMEs and prompts.',
    canEditMarkdown: true,
    canEditCode: false,
    canRunTerminal: false,
    canGenerateAssets: false,
    requiresDiffApproval: true,
    defaultRisk: 'low',
  },
  {
    id: 'build',
    label: 'Build',
    summary: 'Generate source changes only after diff preview and approval.',
    canEditMarkdown: true,
    canEditCode: true,
    canRunTerminal: true,
    canGenerateAssets: false,
    requiresDiffApproval: true,
    defaultRisk: 'medium',
  },
  {
    id: 'review',
    label: 'Review',
    summary: 'Inspect code and propose review comments without editing files.',
    canEditMarkdown: true,
    canEditCode: false,
    canRunTerminal: false,
    canGenerateAssets: false,
    requiresDiffApproval: true,
    defaultRisk: 'low',
  },
  {
    id: 'debug',
    label: 'Debug',
    summary: 'Run safe diagnostics and propose fixes, then move to Build Mode for edits.',
    canEditMarkdown: true,
    canEditCode: false,
    canRunTerminal: true,
    canGenerateAssets: false,
    requiresDiffApproval: true,
    defaultRisk: 'medium',
  },
  {
    id: 'asset',
    label: 'Asset Studio',
    summary: 'Generate original image prompts and assets through Flux, never overwrite assets silently.',
    canEditMarkdown: true,
    canEditCode: false,
    canRunTerminal: false,
    canGenerateAssets: true,
    requiresDiffApproval: true,
    defaultRisk: 'low',
  },
  {
    id: 'refactor',
    label: 'Refactor',
    summary: 'Propose scoped refactors with explicit affected files and validation plan.',
    canEditMarkdown: true,
    canEditCode: true,
    canRunTerminal: true,
    canGenerateAssets: false,
    requiresDiffApproval: true,
    defaultRisk: 'high',
  },
  {
    id: 'release',
    label: 'Release',
    summary: 'Run validation, create release notes, package builds. Deploy only with explicit approval.',
    canEditMarkdown: true,
    canEditCode: false,
    canRunTerminal: true,
    canGenerateAssets: false,
    requiresDiffApproval: true,
    defaultRisk: 'high',
  },
];

export const getModeDefinition = (mode: SakuraMode): ModeDefinition => {
  const found = MODE_DEFINITIONS.find((item) => item.id === mode);
  if (!found) throw new Error(`Unknown Sakura mode: ${mode}`);
  return found;
};
