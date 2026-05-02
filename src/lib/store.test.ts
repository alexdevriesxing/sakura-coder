import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSakuraStore } from '../store/useSakuraStore';
import type { AgentTask, ApprovalMode, DiffApproval } from '../types/sakura';

describe('SakuraStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useSakuraStore());
    act(() => {
      result.current.setApprovalMode('step');
      result.current.setRunUntilComplete(false);
      result.current.setActiveTask(null);
    });
  });

  describe('Approval Mode', () => {
    it('sets approval mode', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      act(() => {
        result.current.setApprovalMode('yolo');
      });
      
      expect(result.current.approvalMode).toBe('yolo');
    });

    it('sets all approval modes', () => {
      const modes: ApprovalMode[] = ['yolo', 'step', 'auto'];
      
      for (const mode of modes) {
        const { result } = renderHook(() => useSakuraStore());
        act(() => {
          result.current.setApprovalMode(mode);
        });
        expect(result.current.approvalMode).toBe(mode);
      }
    });
  });

  describe('Run Until Complete', () => {
    it('toggles run until complete', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      expect(result.current.runUntilComplete).toBe(false);
      
      act(() => {
        result.current.setRunUntilComplete(true);
      });
      
      expect(result.current.runUntilComplete).toBe(true);
    });
  });

  describe('Task Management', () => {
    it('sets active task', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      const task: AgentTask = {
        id: 'task-1',
        goal: 'Build a feature',
        status: 'running',
        mode: 'build',
        approvalMode: 'step',
        runUntilComplete: true,
        steps: [],
        currentStep: 0,
        createdAt: new Date().toISOString(),
      };
      
      act(() => {
        result.current.setActiveTask(task);
      });
      
      expect(result.current.activeTask).toEqual(task);
    });

    it('advances task step', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      const task: AgentTask = {
        id: 'task-1',
        goal: 'Build a feature',
        status: 'running',
        mode: 'build',
        approvalMode: 'step',
        runUntilComplete: true,
        steps: [
          { id: 's1', description: 'Step 1', status: 'completed', changes: [] },
          { id: 's2', description: 'Step 2', status: 'running', changes: [] },
          { id: 's3', description: 'Step 3', status: 'pending', changes: [] },
        ],
        currentStep: 1,
        createdAt: new Date().toISOString(),
      };
      
      act(() => {
        result.current.setActiveTask(task);
      });
      
      act(() => {
        result.current.advanceTaskStep();
      });
      
      expect(result.current.activeTask?.currentStep).toBe(2);
    });
  });

  describe('Approval Queue', () => {
    it('adds pending approval', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      const approval: DiffApproval = {
        id: 'approval-1',
        changes: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      
      act(() => {
        result.current.addPendingApproval(approval);
      });
      
      expect(result.current.pendingApprovals).toHaveLength(1);
      expect(result.current.pendingApprovals[0].id).toBe('approval-1');
    });

    it('updates approval status', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      const approval: DiffApproval = {
        id: 'approval-1',
        changes: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      
      act(() => {
        result.current.addPendingApproval(approval);
      });
      
      act(() => {
        result.current.updateApproval('approval-1', 'approved');
      });
      
      expect(result.current.pendingApprovals[0].status).toBe('approved');
      expect(result.current.pendingApprovals[0].approvedAt).toBeDefined();
    });

    it('rejects approval', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      const approval: DiffApproval = {
        id: 'approval-1',
        changes: [],
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      
      act(() => {
        result.current.addPendingApproval(approval);
      });
      
      act(() => {
        result.current.updateApproval('approval-1', 'rejected');
      });
      
      expect(result.current.pendingApprovals[0].status).toBe('rejected');
    });
  });

  describe('Project Management', () => {
    it('sets project', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      act(() => {
        result.current.setProject({
          name: 'Test Project',
          rootPath: '/test/path',
          template: 'blank',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      
      expect(result.current.project?.name).toBe('Test Project');
    });
  });

  describe('Messages', () => {
    it('adds message', () => {
      const { result } = renderHook(() => useSakuraStore());
      
      act(() => {
        result.current.addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date().toISOString(),
          mode: 'ask',
        });
      });
      
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Hello');
    });
  });
});