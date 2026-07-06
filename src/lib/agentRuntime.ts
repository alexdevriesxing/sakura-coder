import { callQwenToolTurn, type QwenToolMessage, type QwenToolCall } from './aiClient';
import { executeAgentTool, readProjectFiles } from './tauriApi';
import type {
  AgentStep,
  ApprovalMode,
  LlmMetadata,
  ProposedFileChange,
  SakuraMode,
  ToolResult,
} from '../types/sakura';

export interface AgentLoopOptions {
  rootPath: string;
  mode: SakuraMode;
  approvalMode: ApprovalMode;
  systemPrompt: string;
  userMessage: string;
  maxTurns?: number;
  onStep?: (step: AgentStep) => void;
  onProposedChanges?: (changes: ProposedFileChange[]) => void;
  isCancelled?: () => boolean;
}

export interface AgentLoopResult {
  runId: string;
  finalContent: string;
  stopped: boolean;
  metadata: LlmMetadata | null;
  steps: AgentStep[];
}

function stepId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makeStep(runId: string, patch: Omit<AgentStep, 'id' | 'runId' | 'createdAt'>): AgentStep {
  return {
    id: stepId(patch.kind),
    runId,
    createdAt: new Date().toISOString(),
    ...patch,
  };
}

function summarize(value: unknown, max = 4_000): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}\n[truncated]` : text;
}

function normalizeArgs(args: Record<string, unknown> | undefined): Record<string, unknown> {
  return args && typeof args === 'object' ? args : {};
}

async function hydrateProposedChanges(rootPath: string, toolCall: QwenToolCall): Promise<ToolResult> {
  const args = normalizeArgs(toolCall.args);
  const rawChanges = Array.isArray(args.changes) ? args.changes : [];
  const oldPaths = rawChanges
    .filter((change: any) => ['modify', 'delete', 'rename'].includes(change?.action))
    .map((change: any) => String(change.relativePath ?? ''))
    .filter(Boolean);
  const oldFiles = oldPaths.length > 0 ? await readProjectFiles(rootPath, oldPaths) : [];
  const oldByPath = new Map(oldFiles.map((file) => [file.relativePath, file.content]));

  const changes = rawChanges.map((change: any, index) => {
    const relativePath = String(change.relativePath ?? '');
    return {
      id: String(change.id ?? `agent-change-${Date.now()}-${index}`),
      relativePath,
      action: change.action,
      reason: String(change.reason ?? 'Agent proposed change.'),
      oldContent: typeof change.oldContent === 'string' ? change.oldContent : oldByPath.get(relativePath),
      newContent: typeof change.newContent === 'string' ? change.newContent : undefined,
      newRelativePath: typeof change.newRelativePath === 'string' ? change.newRelativePath : undefined,
      riskLevel: change.riskLevel ?? 'medium',
    } satisfies ProposedFileChange;
  });

  return {
    toolName: toolCall.name,
    ok: true,
    output: { changes, count: changes.length },
    error: null,
  };
}

function toAssistantToolCalls(toolCalls: QwenToolCall[]) {
  return toolCalls.map((toolCall) => ({
    id: toolCall.id,
    type: 'function',
    function: {
      name: toolCall.name,
      arguments: JSON.stringify(toolCall.args ?? {}),
    },
  }));
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const runId = crypto.randomUUID();
  const steps: AgentStep[] = [];
  let latestMetadata: LlmMetadata | null = null;
  let finalContent = '';
  let stopped = false;
  const maxTurns = options.maxTurns ?? 8;

  const emit = (step: AgentStep) => {
    steps.push(step);
    options.onStep?.(step);
  };

  const messages: QwenToolMessage[] = [
    { role: 'system', content: options.systemPrompt },
    { role: 'user', content: options.userMessage },
  ];

  emit(makeStep(runId, {
    kind: 'model',
    title: 'Agent run started',
    detail: `Mode: ${options.mode}. Tool budget: ${maxTurns} turns.`,
  }));

  for (let turn = 0; turn < maxTurns; turn += 1) {
    if (options.isCancelled?.()) {
      stopped = true;
      break;
    }

    const modelStep = makeStep(runId, {
      kind: 'model',
      title: `Model turn ${turn + 1}`,
      detail: 'Requesting the next action from the free-model waterfall.',
    });
    emit(modelStep);

    const response = await callQwenToolTurn(messages);
    latestMetadata = response.metadata;
    if (response.metadata) {
      emit(makeStep(runId, {
        kind: 'model',
        title: 'Model route selected',
        detail: `${response.metadata.providerUsed ?? 'unknown'} / ${response.metadata.modelUsed ?? 'unknown'}`,
        metadata: { llm: response.metadata },
      }));
    }

    messages.push({
      role: 'assistant',
      content: response.content || null,
      tool_calls: toAssistantToolCalls(response.toolCalls),
    });

    if (response.content) {
      finalContent = response.content;
    }

    if (response.toolCalls.length === 0) {
      emit(makeStep(runId, {
        kind: 'final',
        title: 'Final answer',
        detail: finalContent || 'The model returned no additional text.',
      }));
      return { runId, finalContent, stopped, metadata: latestMetadata, steps };
    }

    for (const toolCall of response.toolCalls) {
      if (options.isCancelled?.()) {
        stopped = true;
        break;
      }

      emit(makeStep(runId, {
        kind: 'tool_call',
        title: toolCall.name,
        detail: summarize(toolCall.args, 2_000),
        toolCall: {
          id: toolCall.id,
          name: toolCall.name,
          args: normalizeArgs(toolCall.args),
          status: 'running',
        },
      }));

      let toolResult: ToolResult;
      try {
        if (toolCall.name === 'propose_file_changes') {
          toolResult = await hydrateProposedChanges(options.rootPath, toolCall);
          const changes = (toolResult.output as { changes?: ProposedFileChange[] }).changes ?? [];
          options.onProposedChanges?.(changes);
        } else {
          toolResult = await executeAgentTool({
            rootPath: options.rootPath,
            toolName: toolCall.name,
            args: normalizeArgs(toolCall.args),
            mode: options.mode,
            userApproved: options.approvalMode === 'yolo',
          });
        }
      } catch (error) {
        toolResult = {
          toolName: toolCall.name,
          ok: false,
          output: {},
          error: error instanceof Error ? error.message : String(error),
        };
      }

      const resultStep = makeStep(runId, {
        kind: toolCall.name === 'run_safe_command' ? 'command' : 'tool_result',
        title: `${toolCall.name} ${toolResult.ok ? 'completed' : 'failed'}`,
        detail: summarize(toolResult.error ?? toolResult.output),
        toolResult,
      });
      emit(resultStep);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: summarize(toolResult, 12_000),
      });
    }

    if (stopped) break;
  }

  if (!stopped) {
    finalContent ||= 'Tool budget reached. Use Continue to let Sakura keep working from the current state.';
  }
  emit(makeStep(runId, {
    kind: stopped ? 'error' : 'final',
    title: stopped ? 'Agent stopped' : 'Tool budget reached',
    detail: finalContent,
  }));

  return { runId, finalContent, stopped, metadata: latestMetadata, steps };
}
