import { create } from 'zustand';
import type { AgentMessage, AgentTask, ApprovalMode, DiffApproval, DiffPreview, FileNode, GeneratedAsset, GeneratedAudio, OpenFile, SakuraMode, SakuraProject, WorkflowId, WorkflowProfile } from '../types/sakura';
import { inferLanguage } from '../lib/language';

interface SakuraStore {
  project: SakuraProject | null;
  fileTree: FileNode[];
  openFile: OpenFile | null;
  activeMode: SakuraMode;
  approvalMode: ApprovalMode;
  runUntilComplete: boolean;
  activeWorkflowId: WorkflowId | null;
  workflowProfile: WorkflowProfile | null;
  goal: string;
  messages: AgentMessage[];
  assets: GeneratedAsset[];
  audioAssets: GeneratedAudio[];
  pendingDiff: DiffPreview | null;
  pendingApprovals: DiffApproval[];
  activeTask: AgentTask | null;
  stageTab: 'editor' | 'preview' | 'dashboard' | 'gallery';
  checkpoints: string[];
  memory: any | null;
  status: string;
  setProject: (project: SakuraProject | null) => void;
  setFileTree: (tree: FileNode[]) => void;
  openFileContent: (args: { absolutePath: string; relativePath: string; content: string }) => void;
  updateOpenFileContent: (content: string) => void;
  markOpenFileSaved: () => void;
  setMode: (mode: SakuraMode) => void;
  setApprovalMode: (mode: ApprovalMode) => void;
  setRunUntilComplete: (run: boolean) => void;
  setWorkflow: (workflowId: WorkflowId, profile: WorkflowProfile) => void;
  setGoal: (goal: string) => void;
  addMessage: (message: AgentMessage) => void;
  addAsset: (asset: GeneratedAsset) => void;
  addAudioAsset: (asset: GeneratedAudio) => void;
  setPendingDiff: (diff: DiffPreview | null) => void;
  addPendingApproval: (approval: DiffApproval) => void;
  updateApproval: (id: string, status: DiffApproval['status']) => void;
  setActiveTask: (task: AgentTask | null) => void;
  advanceTaskStep: () => void;
  setStageTab: (tab: 'editor' | 'preview' | 'dashboard' | 'gallery') => void;
  setCheckpoints: (checkpoints: string[]) => void;
  setMemory: (memory: any) => void;
  setStatus: (status: string) => void;
}

export const useSakuraStore = create<SakuraStore>((set) => ({
  project: null,
  fileTree: [],
  openFile: null,
  activeMode: 'context',
  approvalMode: 'step',
  runUntilComplete: false,
  activeWorkflowId: null,
  workflowProfile: null,
  goal: 'Create a robust local-first AI coding and asset generation IDE.',
  messages: [],
  assets: [],
  audioAssets: [],
  pendingDiff: null,
  pendingApprovals: [],
  activeTask: null,
  stageTab: 'editor',
  checkpoints: [],
  memory: null,
  status: 'Ready',
  setProject: (project) => set({ project }),
  setFileTree: (tree) => set({ fileTree: tree }),
  openFileContent: ({ absolutePath, relativePath, content }) =>
    set({
      openFile: { absolutePath, relativePath, content, language: inferLanguage(relativePath), dirty: false },
    }),
  updateOpenFileContent: (content) =>
    set((state) => ({ openFile: state.openFile ? { ...state.openFile, content, dirty: true } : null })),
  markOpenFileSaved: () =>
    set((state) => ({ openFile: state.openFile ? { ...state.openFile, dirty: false } : null })),
  setMode: (mode) => set({ activeMode: mode }),
  setApprovalMode: (mode) => set({ approvalMode: mode }),
  setRunUntilComplete: (run) => set({ runUntilComplete: run }),
  setWorkflow: (workflowId, workflowProfile) => set({ activeWorkflowId: workflowId, workflowProfile }),
  setGoal: (goal) => set({ goal }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] })),
  addAudioAsset: (asset) => set((state) => ({ audioAssets: [asset, ...state.audioAssets] })),
  setPendingDiff: (diff) => set({ pendingDiff: diff }),
  addPendingApproval: (approval) => set((state) => ({ pendingApprovals: [...state.pendingApprovals, approval] })),
  updateApproval: (id, approvalStatus) => set((state) => ({
    pendingApprovals: state.pendingApprovals.map((a) => a.id === id ? { ...a, status: approvalStatus, approvedAt: new Date().toISOString() } : a),
  })),
  setActiveTask: (task) => set({ activeTask: task }),
  advanceTaskStep: () => set((state) => {
    if (!state.activeTask) return state;
    const nextStep = state.activeTask.currentStep + 1;
    if (nextStep >= state.activeTask.steps.length) return state;
    return {
      activeTask: {
        ...state.activeTask,
        currentStep: nextStep,
        steps: state.activeTask.steps.map((s, i) => i === nextStep ? { ...s, status: 'running' as const } : s),
      },
    };
  }),
  setStageTab: (tab) => set({ stageTab: tab }),
  setCheckpoints: (checkpoints) => set({ checkpoints }),
  setMemory: (memory) => set({ memory }),
  setStatus: (status) => set({ status }),
}));
