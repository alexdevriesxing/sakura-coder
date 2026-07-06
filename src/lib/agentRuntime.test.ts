import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./aiClient', () => ({
  callQwenToolTurn: vi.fn(),
}));

vi.mock('./tauriApi', () => ({
  executeAgentTool: vi.fn(),
  readProjectFiles: vi.fn(),
}));

import { callQwenToolTurn } from './aiClient';
import { executeAgentTool, readProjectFiles } from './tauriApi';
import { runAgentLoop } from './agentRuntime';

const mockedTurn = vi.mocked(callQwenToolTurn);
const mockedExecute = vi.mocked(executeAgentTool);
const mockedReadFiles = vi.mocked(readProjectFiles);

function baseOptions() {
  return {
    rootPath: 'C:/project',
    mode: 'build' as const,
    approvalMode: 'step' as const,
    systemPrompt: 'system',
    userMessage: 'user',
  };
}

describe('runAgentLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes when the model returns a final answer without tools', async () => {
    mockedTurn.mockResolvedValueOnce({
      content: 'done',
      toolCalls: [],
      metadata: null,
    });

    const result = await runAgentLoop(baseOptions());

    expect(result.finalContent).toBe('done');
    expect(result.stopped).toBe(false);
    expect(result.steps.some((step) => step.kind === 'final')).toBe(true);
  });

  it('executes a tool call and injects the tool result into the next model turn', async () => {
    mockedTurn
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{ id: 'call-1', name: 'search_project', args: { query: 'AgentPanel' } }],
        metadata: null,
      })
      .mockResolvedValueOnce({
        content: 'searched',
        toolCalls: [],
        metadata: null,
      });
    mockedExecute.mockResolvedValueOnce({
      toolName: 'search_project',
      ok: true,
      output: [{ relativePath: 'src/components/AgentPanel.tsx' }],
      error: null,
    });

    const result = await runAgentLoop(baseOptions());

    expect(mockedExecute).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'search_project',
      args: { query: 'AgentPanel' },
      userApproved: false,
    }));
    expect(mockedTurn).toHaveBeenCalledTimes(2);
    expect(mockedTurn.mock.calls[1][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'tool', tool_call_id: 'call-1', name: 'search_project' }),
    ]));
    expect(result.finalContent).toBe('searched');
  });

  it('hydrates proposed file changes with stale-content protection data', async () => {
    const proposed: any[] = [];
    mockedTurn
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{
          id: 'call-2',
          name: 'propose_file_changes',
          args: {
            changes: [{
              relativePath: 'src/App.tsx',
              action: 'modify',
              reason: 'test',
              newContent: 'new',
              riskLevel: 'medium',
            }],
          },
        }],
        metadata: null,
      })
      .mockResolvedValueOnce({
        content: 'diff ready',
        toolCalls: [],
        metadata: null,
      });
    mockedReadFiles.mockResolvedValueOnce([{
      relativePath: 'src/App.tsx',
      content: 'old',
      exists: true,
      error: null,
    }]);

    await runAgentLoop({
      ...baseOptions(),
      onProposedChanges: (changes) => proposed.push(...changes),
    });

    expect(proposed[0]).toMatchObject({
      relativePath: 'src/App.tsx',
      oldContent: 'old',
      newContent: 'new',
    });
  });
});
