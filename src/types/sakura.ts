export type SakuraMode =
  | 'ask'
  | 'context'
  | 'plan'
  | 'docs'
  | 'build'
  | 'review'
  | 'debug'
  | 'asset'
  | 'refactor'
  | 'release';

export type ApprovalMode = 'yolo' | 'step' | 'auto';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ProviderMode = 'mock' | 'live';

export interface SakuraProject {
  name: string;
  rootPath: string;
  template: SakuraProjectTemplate;
  createdAt: string;
  updatedAt: string;
}

export type SakuraProjectTemplate =
  | 'blank'
  | 'cloudflare-worker'
  | 'cloudflare-pages-react'
  | 'phaser-game'
  | 'phaser-asset-heavy-game'
  | 'content-website'
  | 'investor-crm'
  | 'fmcg-database'
  | 'nextjs-saas'
  | 'retro-c64'
  | 'retro-amiga';

export interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
}

export interface OpenFile {
  absolutePath: string;
  relativePath: string;
  content: string;
  language: string;
  dirty: boolean;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: string;
  mode: SakuraMode;
  metadata?: Record<string, unknown>;
}

export interface DiffApproval {
  id: string;
  changes: ProposedFileChange[];
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface AgentTask {
  id: string;
  goal: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  mode: SakuraMode;
  approvalMode: ApprovalMode;
  runUntilComplete: boolean;
  steps: AgentTaskStep[];
  currentStep: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface AgentTaskStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  changes: ProposedFileChange[];
  approval?: DiffApproval;
  output?: string;
}

export interface AgentRequest {
  mode: SakuraMode;
  project?: SakuraProject | null;
  goal: string;
  input: string;
  contextFiles?: Array<{ relativePath: string; content: string }>;
  systemPrompt?: string;
}

export interface AgentResponse {
  kind: 'text' | 'plan' | 'patch' | 'document' | 'asset_prompt' | 'error';
  content: string;
  summary?: string;
  proposedFiles?: ProposedFileChange[];
  riskLevel?: RiskLevel;
  metadata?: Record<string, unknown>;
}

export interface ProposedFileChange {
  id: string;
  relativePath: string;
  action: 'create' | 'modify' | 'delete' | 'rename';
  reason: string;
  oldContent?: string;
  newContent?: string;
  riskLevel: RiskLevel;
}

export interface DiffPreview {
  id: string;
  title: string;
  riskLevel: RiskLevel;
  changes: ProposedFileChange[];
  createdAt: string;
  approved: boolean;
}

export interface SafetyDecision {
  allowed: boolean;
  riskLevel: RiskLevel;
  reason: string;
  requiresExactConfirmation?: string;
  blockedPatterns?: string[];
}

export interface TerminalCommandRequest {
  command: string;
  cwd: string;
  mode: SakuraMode;
  userApproved?: boolean;
}

export interface TerminalCommandResult {
  command: string;
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  riskLevel: RiskLevel;
  blocked: boolean;
}

export interface GeneratedAsset {
  id: string;
  filename: string;
  relativePath: string;
  prompt: string;
  negativePrompt: string;
  assetType: string;
  model: string;
  createdAt: string;
  sourceWorker: string;
  status: 'prompted' | 'generated' | 'saved' | 'failed';
  previewUrl?: string;
}

export interface ContextQuestion {
  id: string;
  question: string;
  category: 'product' | 'technical' | 'audience' | 'business' | 'gameplay' | 'asset' | 'safety';
  required: boolean;
  answer?: string;
}

export interface SakuraMemory {
  projectName: string;
  stack: string[];
  rules: string[];
  decisions: Array<{ date: string; decision: string }>;
  openQuestions: string[];
  workerEndpoints: {
    qwen: string;
    flux: string;
    minimax?: string;
  };
}

export type WorkflowId =
  | 'general-coding'
  | 'game-development'
  | 'website-webapp'
  | 'app-development'
  | 'ai-cloudflare'
  | 'asset-generation'
  | 'audio-generation'
  | 'python-scripting'
  | 'retro-game-dev';

export interface ImageAssetType {
  id: string;
  description: string;
  outputFolder: string;
  defaultAspectRatio?: string;
  defaultFormat?: string;
  requiredMetadata: string[];
}

export interface AudioAudioType {
  id: string;
  description: string;
  outputFolder: string;
  defaultDuration?: number;
  loopable: boolean;
  requiredMetadata: string[];
}

export interface WorkflowProfile {
  id: WorkflowId;
  displayName: string;
  description: string;
  recommendedStacks: string[];
  defaultDocs: string[];
  requiredQuestions: string[];
  defaultFolders: string[];
  systemPrompt: string;
  guardrails: string[];
  validationChecklist: string[];
  releaseChecklist: string[];
  imageAssetTypes: ImageAssetType[];
  imagePromptTemplate: string;
  imageNegativePromptTemplate: string;
  audioAudioTypes: AudioAudioType[];
  audioPromptTemplate: string;
  audioNegativePromptTemplate: string;
  outputFolders: {
    images: string;
    audio: string;
  };
  starterTemplates: StarterTemplate[];
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  url: string;
  recommended: boolean;
}

export interface SakuraConfig {
  projectName: string;
  createdAt: string;
  updatedAt: string;
  sakuraVersion: string;
  activeWorkflowId: WorkflowId;
  activeMode: SakuraMode;
  providerMode: ProviderMode;
  qwenWorkerUrl: string;
  fluxWorkerUrl: string;
  minimaxMusicWorkerUrl: string;
}

export interface GeneratedAudio {
  id: string;
  filename: string;
  relativePath: string;
  prompt: string;
  negativePrompt: string;
  audioType: string;
  provider: string;
  createdAt: string;
  status: 'prompted' | 'generated' | 'saved' | 'failed';
  durationSeconds?: number;
  loop: boolean;
  bpm?: number;
  key?: string;
  previewUrl?: string;
}

export interface ExtendedSakuraMemory {
  projectName: string;
  workflowId: WorkflowId;
  projectType: string;
  goals: string[];
  assumptions: string[];
  decisions: string[];
  openQuestions: string[];
  preferredStack: string[];
  guardrails: string[];
  generatedDocuments: string[];
  assetStyleGuide: Record<string, unknown>;
  audioStyleGuide: Record<string, unknown>;
  generatedAssets: GeneratedAsset[];
  generatedAudio: GeneratedAudio[];
}
