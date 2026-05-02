import { useEffect } from 'react';
import { AgentPanel } from './components/AgentPanel';
import { AssetStudio } from './components/AssetStudio';
import { AudioStudio } from './components/AudioStudio';
import { ContextBuilder } from './components/ContextBuilder';
import { DiffApprovalPanel } from './components/DiffApprovalPanel';
import { EditorPane } from './components/EditorPane';
import { FileTree } from './components/FileTree';
import { MissionControl } from './components/MissionControl';
import { GlobalSearch } from './components/GlobalSearch';
import { ProjectLauncher } from './components/ProjectLauncher';
import { TerminalPanel } from './components/TerminalPanel';
import { TopBar } from './components/TopBar';
import { WorkflowPreview } from './components/WorkflowPreview';
import { ProjectDashboard } from './components/ProjectDashboard';
import { AssetGallery } from './components/AssetGallery';
import { CommandPalette } from './components/CommandPalette';
import { checkProviderHealth } from './lib/aiClient';
import { useSakuraStore } from './store/useSakuraStore';
import { Code, Eye, BarChart3, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const { project, status, setStatus, stageTab, setStageTab } = useSakuraStore();

  useEffect(() => {
    checkProviderHealth()
      .then((health) => setStatus(`Provider mode: Qwen ${health.qwen}, Flux ${health.flux}, Minimax ${health.minimax}`))
      .catch((error) => setStatus(`Provider health check failed: ${(error as Error).message}`));
  }, [setStatus]);

  return (
    <div className="app-shell">
      <CommandPalette />
      <TopBar />
      {!project ? (
        <ProjectLauncher />
      ) : (
        <main className="workspace-grid">
          <aside className="sidebar left-sidebar">
            <MissionControl />
            <GlobalSearch />
            <FileTree />
          </aside>

          <section className="main-stage">
            <div className="stage-header" style={{ height: '64px', border: 'none', background: 'transparent' }}>
              <div className="mode-tabs" style={{ padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <button 
                  className={stageTab === 'editor' ? 'active' : ''} 
                  onClick={() => setStageTab('editor')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <Code size={16} /> <span>Code Editor</span>
                </button>
                <button 
                  className={stageTab === 'preview' ? 'active' : ''} 
                  onClick={() => setStageTab('preview')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <Eye size={16} /> <span>Visual Studio</span>
                </button>
                <button 
                  className={stageTab === 'dashboard' ? 'active' : ''} 
                  onClick={() => setStageTab('dashboard')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <BarChart3 size={16} /> <span>Dashboard</span>
                </button>
                <button 
                  className={stageTab === 'gallery' ? 'active' : ''} 
                  onClick={() => setStageTab('gallery')}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <ImageIcon size={16} /> <span>Gallery</span>
                </button>
              </div>
            </div>
            {stageTab === 'editor' && <EditorPane />}
            {stageTab === 'preview' && <WorkflowPreview />}
            {stageTab === 'dashboard' && <ProjectDashboard />}
            {stageTab === 'gallery' && <AssetGallery />}
            <div className="lower-grid">
              <ContextBuilder />
              <AssetStudio />
              <AudioStudio />
              <TerminalPanel />
            </div>
          </section>

          <aside className="sidebar right-sidebar">
            <AgentPanel />
            <DiffApprovalPanel />
          </aside>
        </main>
      )}
      <footer className="status-bar">{status}</footer>
    </div>
  );
}
