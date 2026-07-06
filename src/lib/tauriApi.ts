import { invoke, convertFileSrc } from '@tauri-apps/api/core';

export { convertFileSrc };
import type {
  AgentToolResult,
  BackgroundJob,
  Diagnostic,
  FileNode,
  GeneratedAsset,
  GeneratedAudio,
  GitStatus,
  McpServer,
  Memory,
  PreviewSession,
  ProjectChangeApplyResult,
  ProjectContextBundle,
  ProjectFileContent,
  ProposedFileChange,
  Rule,
  SakuraProject,
  SakuraProjectTemplate,
  SemanticIndexEntry,
  SemanticSearchResult,
  TerminalCommandResult,
  WorkflowId,
} from '../types/sakura';

export const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error(`Tauri command "${command}" is unavailable in browser preview.`);
  }
  return invoke<T>(command, args);
}

export async function createProject(args: {
  rootPath: string;
  name: string;
  template: SakuraProjectTemplate;
  workflowId?: WorkflowId;
}): Promise<SakuraProject> {
  return safeInvoke<SakuraProject>('create_project', args);
}

export async function loadProject(rootPath: string): Promise<SakuraProject> {
  return safeInvoke<SakuraProject>('load_project', { rootPath });
}

export async function listProjectTree(rootPath: string): Promise<FileNode[]> {
  return safeInvoke<FileNode[]>('list_project_tree', { rootPath });
}

export async function readProjectFile(rootPath: string, relativePath: string): Promise<string> {
  return safeInvoke<string>('read_project_file', { rootPath, relativePath });
}

export async function readProjectFiles(rootPath: string, relativePaths: string[]): Promise<ProjectFileContent[]> {
  return safeInvoke<ProjectFileContent[]>('read_project_files', { rootPath, relativePaths });
}

export async function writeProjectFile(args: {
  rootPath: string;
  relativePath: string;
  content: string;
  createCheckpoint: boolean;
}): Promise<string> {
  return safeInvoke<string>('write_project_file', args);
}

export async function applyProjectChanges(args: {
  rootPath: string;
  changes: ProposedFileChange[];
  createCheckpoint: boolean;
}): Promise<ProjectChangeApplyResult> {
  return safeInvoke<ProjectChangeApplyResult>('apply_project_changes', args);
}

export async function writeBinaryFile(args: {
  rootPath: string;
  relativePath: string;
  base64Content: string;
}): Promise<void> {
  return safeInvoke<void>('write_binary_file', args);
}

export async function deleteProjectFile(args: {
  rootPath: string;
  relativePath: string;
}): Promise<void> {
  return safeInvoke<void>('delete_project_file', args);
}

export async function createProjectDirectory(args: {
  rootPath: string;
  relativePath: string;
}): Promise<void> {
  return safeInvoke<void>('create_project_directory', args);
}

export async function createCheckpoint(rootPath: string, label: string): Promise<string> {
  return safeInvoke<string>('create_checkpoint', { rootPath, label });
}

export async function appendSessionLog(rootPath: string, entry: unknown): Promise<string> {
  return safeInvoke<string>('append_session_log', { rootPath, entry });
}

export async function runSafeCommand(args: {
  rootPath: string;
  command: string;
  mode: string;
  userApproved: boolean;
}): Promise<TerminalCommandResult> {
  return safeInvoke<TerminalCommandResult>('run_safe_command', args);
}

export async function saveGeneratedAsset(args: {
  rootPath: string;
  asset: GeneratedAsset;
  uri?: string;
}): Promise<GeneratedAsset> {
  return safeInvoke<GeneratedAsset>('save_generated_asset', args);
}

export async function saveGeneratedAudio(args: {
  rootPath: string;
  audio: GeneratedAudio;
  uri?: string;
}): Promise<GeneratedAudio> {
  return safeInvoke<GeneratedAudio>('save_generated_audio', args);
}

export async function listCheckpoints(rootPath: string): Promise<string[]> {
  return safeInvoke<string[]>('list_checkpoints', { rootPath });
}

export async function loadProjectMemory(rootPath: string): Promise<any> {
  return safeInvoke<any>('load_project_memory', { rootPath });
}

export async function searchProject(rootPath: string, query: string): Promise<any[]> {
  return safeInvoke<any[]>('search_project', { rootPath, query });
}

export async function buildProjectContext(args: {
  rootPath: string;
  userMessage: string;
  openFileRelativePath?: string | null;
}): Promise<ProjectContextBundle> {
  return safeInvoke<ProjectContextBundle>('build_project_context', args);
}

export async function executeAgentTool(args: {
  rootPath: string;
  toolName: string;
  args: Record<string, unknown>;
  mode: string;
  userApproved: boolean;
}): Promise<AgentToolResult> {
  return safeInvoke<AgentToolResult>('execute_agent_tool', args);
}

export async function buildSemanticIndex(rootPath: string): Promise<SemanticIndexEntry[]> {
  return safeInvoke<SemanticIndexEntry[]>('build_semantic_index', { rootPath });
}

export async function querySemanticIndex(rootPath: string, query: string): Promise<SemanticSearchResult[]> {
  return safeInvoke<SemanticSearchResult[]>('query_semantic_index', { rootPath, query });
}

export async function getDiagnostics(rootPath: string): Promise<Diagnostic[]> {
  return safeInvoke<Diagnostic[]>('get_diagnostics', { rootPath });
}

export async function gitStatus(rootPath: string): Promise<GitStatus> {
  return safeInvoke<GitStatus>('git_status', { rootPath });
}

export async function gitDiff(rootPath: string, staged = false): Promise<string> {
  return safeInvoke<string>('git_diff', { rootPath, staged });
}

export async function gitCommit(args: {
  rootPath: string;
  message: string;
  userApproved: boolean;
}): Promise<string> {
  return safeInvoke<string>('git_commit', args);
}

export async function restoreCheckpoint(rootPath: string, checkpoint: string): Promise<string> {
  return safeInvoke<string>('restore_checkpoint', { rootPath, checkpoint });
}

export async function listRules(rootPath: string): Promise<Rule[]> {
  return safeInvoke<Rule[]>('list_rules', { rootPath });
}

export async function listMemories(rootPath: string): Promise<Memory[]> {
  return safeInvoke<Memory[]>('list_memories', { rootPath });
}

export async function saveMemory(rootPath: string, content: string, source: string): Promise<Memory> {
  return safeInvoke<Memory>('save_memory', { rootPath, content, source });
}

export async function deleteMemory(rootPath: string, memoryId: string): Promise<Memory[]> {
  return safeInvoke<Memory[]>('delete_memory', { rootPath, memoryId });
}

export async function listMcpServers(rootPath: string): Promise<McpServer[]> {
  return safeInvoke<McpServer[]>('list_mcp_servers', { rootPath });
}

export async function saveMcpServers(rootPath: string, servers: McpServer[]): Promise<McpServer[]> {
  return safeInvoke<McpServer[]>('save_mcp_servers', { rootPath, servers });
}

export async function callMcpTool(args: {
  rootPath: string;
  serverId: string;
  toolName: string;
  args: Record<string, unknown>;
  userApproved: boolean;
}): Promise<AgentToolResult> {
  return safeInvoke<AgentToolResult>('call_mcp_tool', args);
}

export async function runPreviewCheck(rootPath: string, url?: string | null): Promise<PreviewSession> {
  return safeInvoke<PreviewSession>('run_preview_check', { rootPath, url });
}

export async function listBackgroundJobs(rootPath: string): Promise<BackgroundJob[]> {
  return safeInvoke<BackgroundJob[]>('list_background_jobs', { rootPath });
}

export async function createBackgroundJob(rootPath: string, goal: string): Promise<BackgroundJob> {
  return safeInvoke<BackgroundJob>('create_background_job', { rootPath, goal });
}

export async function updateBackgroundJob(args: {
  rootPath: string;
  jobId: string;
  status: string;
  logEntry?: string;
}): Promise<BackgroundJob> {
  return safeInvoke<BackgroundJob>('update_background_job', args);
}
