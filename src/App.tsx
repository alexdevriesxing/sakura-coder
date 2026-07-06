import { useCallback, useEffect, useState } from 'react';
import { AgentPanel } from './components/AgentPanel';
import { AssetStudio } from './components/AssetStudio';
import { AudioStudio } from './components/AudioStudio';
import { ContextBuilder } from './components/ContextBuilder';
import { DiffApprovalPanel } from './components/DiffApprovalPanel';
import { EditorPane } from './components/EditorPane';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FileTree } from './components/FileTree';
import { MissionControl } from './components/MissionControl';
import { GlobalSearch } from './components/GlobalSearch';
import { IntelligencePanel } from './components/IntelligencePanel';
import { ProjectLauncher } from './components/ProjectLauncher';
import { Scratchpad } from './components/Scratchpad';
import { SettingsPanel } from './components/SettingsPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { TopBar } from './components/TopBar';
import { WorkflowPreview } from './components/WorkflowPreview';
import { ProjectDashboard } from './components/ProjectDashboard';
import { AssetGallery } from './components/AssetGallery';
import { CommandPalette } from './components/CommandPalette';
import { Modal } from './components/Modal';
import { StatusBar } from './components/StatusBar';
import { ContextMenuProvider } from './components/ContextMenu';
import { checkProviderHealth, type ProviderHealth } from './lib/aiClient';
import { useSettings } from './lib/useSettings';
import { useSakuraStore } from './store/useSakuraStore';
import { Code, Eye, BarChart3, ImageIcon, Activity } from 'lucide-react';

export default function App() {
  const { project, status, setStatus, stageTab, setStageTab } = useSakuraStore();
  const { settings, save: saveSettings } = useSettings();
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);

  useEffect(() => {
    const runCheck = () => {
      checkProviderHealth()
        .then((h) => {
          setHealth(h);
          if (h.llm === 'error' || h.flux === 'error' || h.minimax === 'error') {
            setStatus('System Alert: Some AI services are currently unreachable.');
          } else {
            setStatus('All systems operational. Sakura is ready.');
          }
        })
        .catch((error) => setStatus(`Connectivity Error: ${(error as Error).message}`));
    };

    runCheck();
    const interval = setInterval(runCheck, 60000);
    return () => clearInterval(interval);
  }, [setStatus]);

  const handleStageTabChange = useCallback((tab: typeof stageTab) => {
    setStageTab(tab);
    setTransitionKey((k) => k + 1);
  }, [setStageTab]);

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);
  const toggleScratchpad = useCallback(() => setShowScratchpad((s) => !s), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') {
        e.preventDefault();
        const store = useSakuraStore.getState();
        if (store.openFile && store.openFile.dirty && store.project) {
          import('./lib/tauriApi').then(({ writeProjectFile }) => {
            writeProjectFile({
              rootPath: store.project!.rootPath,
              relativePath: store.openFile!.relativePath,
              content: store.openFile!.content,
              createCheckpoint: true,
            }).then(() => {
              store.markOpenFileSaved();
              store.setStatus(`Saved ${store.openFile!.relativePath}`);
            });
          });
        }
      }
      if (mod && e.key === 'w') {
        e.preventDefault();
        const store = useSakuraStore.getState();
        if (store.activeFilePath) store.closeFile(store.activeFilePath);
      }
      if (mod && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const store = useSakuraStore.getState();
        const { openFiles, activeFilePath } = store;
        if (openFiles.length > 1) {
          const idx = activeFilePath ? openFiles.findIndex(f => f.relativePath === activeFilePath) : -1;
          const next = openFiles[(idx + 1) % openFiles.length];
          store.setActiveFile(next.relativePath);
        }
      }
      if (mod && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const store = useSakuraStore.getState();
        const { openFiles, activeFilePath } = store;
        if (openFiles.length > 1) {
          const idx = activeFilePath ? openFiles.findIndex(f => f.relativePath === activeFilePath) : 0;
          const prev = openFiles[(idx - 1 + openFiles.length) % openFiles.length];
          store.setActiveFile(prev.relativePath);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const map: Record<string, typeof stageTab> = { '1': 'editor', '2': 'preview', '3': 'dashboard', '4': 'gallery' };
      const tab = map[e.key];
      if (tab) {
        e.preventDefault();
        handleStageTabChange(tab);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStageTabChange]);

  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener('open-settings', handler);
    return () => window.removeEventListener('open-settings', handler);
  }, []);

  const requestCloseProject = useCallback(() => {
    setShowCloseModal(true);
  }, []);

  const confirmCloseProject = useCallback(() => {
    setShowCloseModal(false);
    useSakuraStore.getState().setProject(null);
    setStatus('Project closed. Returning to launcher.');
  }, [setStatus]);

  return (
    <ContextMenuProvider>
      <div className="app-shell">
        <CommandPalette />
        <TopBar
          onOpenSettings={openSettings}
          onToggleScratchpad={toggleScratchpad}
          showScratchpad={showScratchpad}
          onRequestCloseProject={requestCloseProject}
        />

        <SettingsPanel
          isOpen={showSettings}
          onClose={closeSettings}
          settings={settings}
          onSave={saveSettings}
        />

        <Modal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          onConfirm={confirmCloseProject}
          title="Close Project"
          variant="danger"
          confirmLabel="Close Project"
          cancelLabel="Cancel"
        >
          <p>Are you sure you want to close the current project? Any unsaved changes in the editor should be saved first.</p>
        </Modal>

        {!project ? (
          <ErrorBoundary key="launcher">
            <ProjectLauncher />
          </ErrorBoundary>
        ) : (
          <main className="workspace-grid">
            <aside className="sidebar left-sidebar">
              <ErrorBoundary>
                <MissionControl />
              </ErrorBoundary>
              <ErrorBoundary>
                <GlobalSearch />
              </ErrorBoundary>
              <ErrorBoundary>
                <FileTree />
              </ErrorBoundary>

              <div className="panel compact-panel" style={{ marginTop: 'auto', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Diagnostics</span>
                  <button
                    className="icon-button"
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    title="Toggle Network Diagnostics"
                    aria-label="Toggle network diagnostics"
                  >
                    <Activity size={14} />
                  </button>
                </div>

                {showDiagnostics && health && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>LLM</span>
                      <span style={{ color: health.llm === 'ok' ? 'var(--accent)' : '#ff506e' }} title={`${health.providerUsed ?? 'unknown'} ${health.modelUsed ?? ''}`}>
                        {health.llm === 'ok' ? `${health.latency?.llm}ms` : 'Offline'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>Qwen Worker</span>
                      <span style={{ color: health.qwen === 'ok' ? 'var(--accent)' : '#ff506e' }}>
                        {health.qwen === 'ok' ? `${health.latency?.qwen}ms` : 'Offline'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>Flux</span>
                      <span style={{ color: health.flux === 'ok' ? 'var(--accent)' : '#ff506e' }}>
                        {health.flux === 'ok' ? `${health.latency?.flux}ms` : 'Offline'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>Minimax</span>
                      <span style={{ color: health.minimax === 'ok' ? 'var(--accent)' : '#ff506e' }}>
                        {health.minimax === 'ok' ? `${health.latency?.minimax}ms` : 'Offline'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            <section className="main-stage">
              <div className="stage-header" style={{ height: '64px', border: 'none', background: 'transparent' }}>
                <div className="mode-tabs" style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <button
                    className={stageTab === 'editor' ? 'active' : ''}
                    onClick={() => handleStageTabChange('editor')}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    title="Code Editor (Alt+1)"
                    aria-label="Code Editor"
                  >
                    <Code /> <span>Code Editor</span>
                  </button>
                  <button
                    className={stageTab === 'preview' ? 'active' : ''}
                    onClick={() => handleStageTabChange('preview')}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    title="Visual Preview (Alt+2)"
                    aria-label="Visual Preview"
                  >
                    <Eye /> <span>Visual Studio</span>
                  </button>
                  <button
                    className={stageTab === 'dashboard' ? 'active' : ''}
                    onClick={() => handleStageTabChange('dashboard')}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    title="Project Dashboard (Alt+3)"
                    aria-label="Project Dashboard"
                  >
                    <BarChart3 /> <span>Dashboard</span>
                  </button>
                  <button
                    className={stageTab === 'gallery' ? 'active' : ''}
                    onClick={() => handleStageTabChange('gallery')}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    title="Asset Gallery (Alt+4)"
                    aria-label="Asset Gallery"
                  >
                    <ImageIcon /> <span>Gallery</span>
                  </button>
                </div>
              </div>
              <div className="stage-content" key={transitionKey} style={{ animation: 'fade-in 0.25s ease-out', flex: 1, minHeight: 0 }}>
                <ErrorBoundary key={`${stageTab}-${transitionKey}`}>
                  {stageTab === 'editor' && <EditorPane />}
                  {stageTab === 'preview' && <WorkflowPreview />}
                  {stageTab === 'dashboard' && <ProjectDashboard />}
                  {stageTab === 'gallery' && <AssetGallery />}
                </ErrorBoundary>
              </div>
              <div className="lower-grid">
                <ErrorBoundary><ContextBuilder /></ErrorBoundary>
                <ErrorBoundary><AssetStudio /></ErrorBoundary>
                <ErrorBoundary><AudioStudio /></ErrorBoundary>
                <ErrorBoundary><TerminalPanel /></ErrorBoundary>
                <ErrorBoundary><IntelligencePanel /></ErrorBoundary>
                {showScratchpad && (
                  <ErrorBoundary>
                    <div className="panel compact-panel" style={{ gridColumn: '1 / -1' }}>
                      <Scratchpad />
                    </div>
                  </ErrorBoundary>
                )}
              </div>
            </section>

            <aside className="sidebar right-sidebar">
              <ErrorBoundary><AgentPanel /></ErrorBoundary>
              <ErrorBoundary><DiffApprovalPanel /></ErrorBoundary>
            </aside>
          </main>
        )}
        <StatusBar />
      </div>
    </ContextMenuProvider>
  );
}
