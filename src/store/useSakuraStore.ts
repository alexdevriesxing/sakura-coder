import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentMessage, AgentTask, ApprovalMode, DiffApproval, DiffPreview, FileNode, GeneratedAsset, GeneratedAudio, OpenFile, SakuraMode, SakuraProject, VisualAnnotation, WorkflowId, WorkflowProfile } from '../types/sakura';
import { inferLanguage } from '../lib/language';

interface SakuraStore {
  project: SakuraProject | null;
  fileTree: FileNode[];
  openFiles: OpenFile[];
  activeFilePath: string | null;
  openFile: OpenFile | null;
  activeMode: SakuraMode;
  approvalMode: ApprovalMode;
  runUntilComplete: boolean;
  activeWorkflowId: WorkflowId | null;
  workflowProfile: WorkflowProfile | null;
  goal: string;
  messages: AgentMessage[];
  messageQueue: string[];
  assets: GeneratedAsset[];
  audioAssets: GeneratedAudio[];
  visualAnnotations: VisualAnnotation[];
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
  closeFile: (relativePath: string) => void;
  setActiveFile: (relativePath: string) => void;
  updateOpenFileContent: (content: string) => void;
  markOpenFileSaved: () => void;
  setMode: (mode: SakuraMode) => void;
  setApprovalMode: (mode: ApprovalMode) => void;
  setRunUntilComplete: (run: boolean) => void;
  setWorkflow: (workflowId: WorkflowId, profile: WorkflowProfile) => void;
  setGoal: (goal: string) => void;
  addMessage: (message: AgentMessage) => void;
  clearMessages: () => void;
  addToMessageQueue: (input: string) => void;
  popMessageQueue: () => string | undefined;
  addAsset: (asset: GeneratedAsset) => void;
  addAudioAsset: (asset: GeneratedAudio) => void;
  addVisualAnnotation: (annotation: VisualAnnotation) => void;
  clearVisualAnnotations: () => void;
  setPendingDiff: (diff: DiffPreview | null) => void;
  addPendingApproval: (approval: DiffApproval) => void;
  updateApproval: (id: string, status: DiffApproval['status']) => void;
  setActiveTask: (task: AgentTask | null) => void;
  advanceTaskStep: () => void;
  setStageTab: (tab: 'editor' | 'preview' | 'dashboard' | 'gallery') => void;
  setCheckpoints: (checkpoints: string[]) => void;
  setMemory: (memory: any) => void;
  updateMessage: (id: string, content: string, metadata?: Record<string, unknown>) => void;
  setStatus: (status: string) => void;
}

export const useSakuraStore = create<SakuraStore>()(
  persist(
    (set, get) => ({
      project: null,
      fileTree: [],
      openFiles: [],
      activeFilePath: null,
      openFile: null,
      activeMode: 'context',
      approvalMode: 'step',
      runUntilComplete: false,
      activeWorkflowId: null,
      workflowProfile: null,
      goal: 'Create a robust local-first AI coding and asset generation IDE.',
      messages: [],
      messageQueue: [],
      assets: [],
      audioAssets: [],
      visualAnnotations: [],
      pendingDiff: null,
      pendingApprovals: [],
      activeTask: null,
      stageTab: 'editor',
      checkpoints: [],
      memory: null,
      status: 'Ready',

      setProject: (project) => set({ project, openFiles: [], activeFilePath: null, openFile: null }),
      setFileTree: (tree) => set({ fileTree: tree }),

      openFileContent: ({ absolutePath, relativePath, content }) => set((state) => {
        const existing = state.openFiles.find((f) => f.relativePath === relativePath);
        if (existing) {
          return { activeFilePath: relativePath, openFile: existing };
        }
        const newFile: OpenFile = {
          name: relativePath.split('/').pop() || '',
          absolutePath,
          relativePath,
          content,
          language: inferLanguage(relativePath),
          dirty: false,
        };
        return {
          openFiles: [...state.openFiles, newFile],
          activeFilePath: relativePath,
          openFile: newFile,
        };
      }),

      closeFile: (relativePath) => set((state) => {
        const remaining = state.openFiles.filter((f) => f.relativePath !== relativePath);
        let nextActive = state.activeFilePath;
        let nextOpenFile: OpenFile | null = state.openFile;
        if (state.activeFilePath === relativePath) {
          const idx = state.openFiles.findIndex((f) => f.relativePath === relativePath);
          nextActive = remaining[Math.min(idx, remaining.length - 1)]?.relativePath ?? null;
          nextOpenFile = remaining[Math.min(idx, remaining.length - 1)] ?? null;
        }
        return { openFiles: remaining, activeFilePath: nextActive, openFile: nextOpenFile };
      }),

      setActiveFile: (relativePath) => set((state) => {
        const target = state.openFiles.find((f) => f.relativePath === relativePath) ?? null;
        return { activeFilePath: relativePath, openFile: target };
      }),

      updateOpenFileContent: (content) => set((state) => {
        const updated = state.openFiles.map((f) =>
          f.relativePath === state.activeFilePath ? { ...f, content, dirty: true } : f
        );
        const current = updated.find((f) => f.relativePath === state.activeFilePath) ?? null;
        return { openFiles: updated, openFile: current };
      }),

      markOpenFileSaved: () => set((state) => {
        const updated = state.openFiles.map((f) =>
          f.relativePath === state.activeFilePath ? { ...f, dirty: false } : f
        );
        const current = updated.find((f) => f.relativePath === state.activeFilePath) ?? null;
        return { openFiles: updated, openFile: current };
      }),

      setMode: (mode) => set({ activeMode: mode }),
      setApprovalMode: (mode) => set({ approvalMode: mode }),
      setRunUntilComplete: (run) => set({ runUntilComplete: run }),
      setWorkflow: (workflowId, workflowProfile) => set({ activeWorkflowId: workflowId, workflowProfile }),
      setGoal: (goal) => set({ goal }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () => set({ messages: [], messageQueue: [] }),
      addToMessageQueue: (input) => set((state) => ({ messageQueue: [...state.messageQueue, input] })),
      popMessageQueue: () => {
        const { messageQueue } = get();
        if (messageQueue.length === 0) return undefined;
        const [first, ...rest] = messageQueue;
        set({ messageQueue: rest });
        return first;
      },
      addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] })),
      addAudioAsset: (asset) => set((state) => ({ audioAssets: [asset, ...state.audioAssets] })),
      addVisualAnnotation: (annotation) => set((state) => ({ visualAnnotations: [...state.visualAnnotations, annotation] })),
      clearVisualAnnotations: () => set({ visualAnnotations: [] }),
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
      updateMessage: (id, content, metadata) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, content, metadata: metadata ?? m.metadata } : m)),
        })),
    }),
    {
      name: 'sakura-store',
      partialize: (state) => ({
        stageTab: state.stageTab,
        activeMode: state.activeMode,
        approvalMode: state.approvalMode,
        activeWorkflowId: state.activeWorkflowId,
        checkpoints: state.checkpoints,
        openFiles: state.openFiles.map((f) => ({ ...f, dirty: false })),
        activeFilePath: state.activeFilePath,
      }),
    }
  )
);
