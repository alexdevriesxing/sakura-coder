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
  workflowId: string;
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
  | 'crm-application'
  | 'nextjs-saas'
  | 'retro-c64'
  | 'retro-amiga'
  | 'python-scripting'
  | 'chrome-extension'
  | 'mobile-app-expo'
  | 'tauri-desktop-app'
  | 'portfolio-site'
  | 'shadcn-ui-library';

export interface FileNode {
  name: string;
  path: string;
  relativePath: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
}

export interface OpenFile {
  name: string;
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

export interface LlmWaterfallAttempt {
  provider: 'openrouter' | 'cloudflare' | string;
  model: string;
  status: 'skipped' | 'ok' | 'error' | 'quota-exhausted' | string;
  httpStatus?: number;
  reason?: string;
  retryAfter?: string | null;
  usage?: unknown;
}

export interface LlmMetadata {
  providerUsed: string | null;
  modelUsed: string | null;
  quotaStatus: 'ok' | 'degraded' | 'exhausted' | 'unknown' | string;
  usage?: unknown;
  waterfallAttempts: LlmWaterfallAttempt[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'approval_required';
}

export interface ToolResult {
  toolName: string;
  ok: boolean;
  output: unknown;
  error?: string | null;
}

export type AgentToolResult = ToolResult;

export interface AgentStep {
  id: string;
  runId: string;
  kind: 'model' | 'tool_call' | 'tool_result' | 'diff' | 'command' | 'validation' | 'checkpoint' | 'final' | 'error';
  title: string;
  detail?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  goal: string;
  status: 'queued' | 'running' | 'needs_approval' | 'stopped' | 'completed' | 'failed';
  modelUsed?: string | null;
  providerUsed?: string | null;
  quotaStatus?: string;
  usage?: unknown;
  waterfallAttempts: LlmWaterfallAttempt[];
  steps: AgentStep[];
  createdAt: string;
  updatedAt: string;
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

export interface AudioGenerationRequest {
  prompt: string;
  negativePrompt: string;
  filename: string;
  audioType: string;
  duration?: number;
  loop?: boolean;
  bpm?: number;
  key?: string;
  lyrics?: string;
  isInstrumental?: boolean;
  referenceUrl?: string;
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
  newRelativePath?: string;
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

export interface ProjectFileContent {
  relativePath: string;
  content: string;
  exists: boolean;
  error?: string | null;
}

export interface ProjectSearchResult {
  path: string;
  relativePath: string;
  lineNumber: number;
  lineContent: string;
}

export interface ProjectContextFile {
  relativePath: string;
  content: string;
  reason: string;
  truncated: boolean;
}

export interface ProjectContextBundle {
  files: ProjectContextFile[];
  fileTreeSummary: string[];
  searchResults: ProjectSearchResult[];
  memory?: unknown;
  diffSummaries: string[];
  truncated: boolean;
  droppedFiles: string[];
}

export interface VisualAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface ProjectChangeApplyResult {
  checkpoint: string;
  applied: string[];
}

export interface SemanticIndexEntry {
  relativePath: string;
  language: string;
  symbols: string[];
  imports: string[];
  preview: string;
  lineCount: number;
  updatedAt: string;
}

export interface SemanticSearchResult {
  relativePath: string;
  score: number;
  symbols: string[];
  imports: string[];
  preview: string;
}

export interface Diagnostic {
  source: string;
  severity: 'error' | 'warning' | 'info' | string;
  message: string;
  relativePath?: string | null;
  lineNumber?: number | null;
  command?: string | null;
}

export interface Rule {
  id: string;
  scope: string;
  relativePath: string;
  content: string;
  enabled: boolean;
}

export interface Memory {
  id: string;
  content: string;
  source: string;
  createdAt: string;
}

export interface McpServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  enabled: boolean;
  approvalMode: 'always' | 'prompt' | 'never' | string;
}

export interface GitFileStatus {
  path: string;
  status: string;
}

export interface GitStatus {
  branch: string;
  clean: boolean;
  files: GitFileStatus[];
}

export interface PreviewSession {
  id: string;
  url?: string | null;
  status: string;
  notes: string[];
  screenshotPath?: string | null;
  createdAt: string;
}

export interface BackgroundJob {
  id: string;
  goal: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | string;
  createdAt: string;
  updatedAt: string;
  log: string[];
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
