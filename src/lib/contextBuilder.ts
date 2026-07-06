import type { GeneratedAsset, GeneratedAudio, OpenFile, ProjectContextBundle, SakuraMemory } from '../types/sakura';

const DEFAULT_MAX_FILE_CHARS = 8_000;
const DEFAULT_MAX_TOTAL_CHARS = 60_000;

export interface ContextBuildInput {
  userMessage: string;
  openFile: OpenFile | null;
  memory?: any | null;
  projectContext?: ProjectContextBundle | null;
  assets?: GeneratedAsset[];
  audioAssets?: GeneratedAudio[];
  visualAnnotations?: Array<{ id: string; x: number; y: number; text: string }>;
  maxFileChars?: number;
  maxTotalChars?: number;
}

export interface ContextBuildResult {
  injectedMessage: string;
  contextFiles: Array<{ relativePath: string; content: string }>;
  truncated: boolean;
  droppedFiles: string[];
}

/**
 * Format a single context file as the canonical block format:
 *
 * <context>
 * File: {relativePath}
 * ```{language}
 * {content}
 * ```
 * </context>
 */
export function formatContextBlock(file: {
  relativePath: string;
  content: string;
  language: string;
}): string {
  return `<context>\nFile: ${file.relativePath}\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n</context>`;
}

/**
 * Build the context-injected message.
 *
 * 1. If openFile is non-null, include it in contextFiles (truncated to maxFileChars).
 * 2. Format each contextFile as a <context> block prepended to userMessage.
 * 3. If total length exceeds maxTotalChars, drop the largest context files
 *    until within the limit, logging a console.warn for each dropped file.
 */
export function buildContextMessage(input: ContextBuildInput): ContextBuildResult {
  const {
    userMessage,
    openFile,
    memory,
    projectContext,
    assets = [],
    audioAssets = [],
    visualAnnotations = [],
    maxFileChars = DEFAULT_MAX_FILE_CHARS,
    maxTotalChars = DEFAULT_MAX_TOTAL_CHARS,
  } = input;

  let truncated = false;
  const droppedFiles: string[] = [];
  const contextFiles: Array<{ relativePath: string; content: string; language: string }> = [];
  const seenFiles = new Set<string>();

  // Add open file to context
  if (openFile) {
    let content = openFile.content;
    if (content.length > maxFileChars) {
      content = content.slice(0, maxFileChars) + '[truncated]';
      truncated = true;
    }
    contextFiles.push({
      relativePath: openFile.relativePath,
      content,
      language: openFile.language || 'text',
    });
    seenFiles.add(openFile.relativePath);
  }

  if (projectContext) {
    for (const file of projectContext.files) {
      if (seenFiles.has(file.relativePath)) continue;
      let content = file.content;
      if (content.length > maxFileChars) {
        content = content.slice(0, maxFileChars) + '[truncated]';
        truncated = true;
      }
      contextFiles.push({
        relativePath: file.relativePath,
        content,
        language: file.relativePath.split('.').pop() || 'text',
      });
      seenFiles.add(file.relativePath);
    }
    if (projectContext.truncated) truncated = true;
    droppedFiles.push(...projectContext.droppedFiles);
  }

  // Build memory header for system context
  let memoryHeader = '';
  if (memory) {
    const parts: string[] = [];
    if (memory.projectName) parts.push(`Project: ${memory.projectName}`);
    if (memory.workflowId) parts.push(`Workflow: ${memory.workflowId}`);
    if (Array.isArray(memory.stack) && memory.stack.length > 0) {
      parts.push(`Stack: ${memory.stack.join(', ')}`);
    }
    if (parts.length > 0) {
      memoryHeader = `<!-- ${parts.join(' | ')} -->\n`;
    }
  }

  const projectContextParts: string[] = [];
  if (projectContext?.fileTreeSummary?.length) {
    projectContextParts.push(
      '<repo_map>',
      projectContext.fileTreeSummary.slice(0, 240).join('\n'),
      '</repo_map>',
    );
  }
  if (projectContext?.searchResults?.length) {
    projectContextParts.push(
      '<search_hits>',
      projectContext.searchResults
        .slice(0, 30)
        .map((hit) => `${hit.relativePath}:${hit.lineNumber}: ${hit.lineContent}`)
        .join('\n'),
      '</search_hits>',
    );
  }
  if (projectContext?.diffSummaries?.length) {
    projectContextParts.push(
      '<recent_diffs>',
      projectContext.diffSummaries.join('\n'),
      '</recent_diffs>',
    );
  }
  if (visualAnnotations.length > 0) {
    projectContextParts.push(
      '<visual_preview_annotations>',
      visualAnnotations.map((a) => `${a.id}: ${Math.round(a.x)}%,${Math.round(a.y)}% - ${a.text}`).join('\n'),
      '</visual_preview_annotations>',
    );
  }
  if (assets.length > 0 || audioAssets.length > 0) {
    projectContextParts.push(
      '<generated_assets>',
      [
        ...assets.slice(0, 16).map((asset) => `image ${asset.relativePath} ${asset.assetType} ${asset.status}`),
        ...audioAssets.slice(0, 16).map((audio) => `audio ${audio.relativePath} ${audio.audioType} ${audio.status}`),
      ].join('\n'),
      '</generated_assets>',
    );
  }

  // Format context blocks
  let contextBlocks = contextFiles.map((f) => formatContextBlock(f)).join('\n');

  // Check total size and drop largest files if needed
  const projectMeta = projectContextParts.length > 0 ? `${projectContextParts.join('\n')}\n` : '';
  let combined = memoryHeader + projectMeta + (contextBlocks ? contextBlocks + '\n' : '') + userMessage;
  while (combined.length > maxTotalChars && contextFiles.length > 0) {
    // Find and drop the largest context file
    let largestIdx = 0;
    for (let i = 1; i < contextFiles.length; i++) {
      if (contextFiles[i].content.length > contextFiles[largestIdx].content.length) {
        largestIdx = i;
      }
    }
    const dropped = contextFiles.splice(largestIdx, 1)[0];
    droppedFiles.push(dropped.relativePath);
    truncated = true;
    console.warn(`[contextBuilder] Dropped context file "${dropped.relativePath}" to stay within ${maxTotalChars} char limit.`);

    contextBlocks = contextFiles.map((f) => formatContextBlock(f)).join('\n');
    combined = memoryHeader + projectMeta + (contextBlocks ? contextBlocks + '\n' : '') + userMessage;
  }

  return {
    injectedMessage: combined,
    contextFiles: contextFiles.map(({ relativePath, content }) => ({ relativePath, content })),
    truncated,
    droppedFiles,
  };
}
