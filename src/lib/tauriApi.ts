import { invoke } from '@tauri-apps/api/core';
import type { FileNode, GeneratedAsset, GeneratedAudio, SakuraProject, SakuraProjectTemplate, TerminalCommandResult, WorkflowId } from '../types/sakura';

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

export async function writeProjectFile(args: {
  rootPath: string;
  relativePath: string;
  content: string;
  createCheckpoint: boolean;
}): Promise<string> {
  return safeInvoke<string>('write_project_file', args);
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
