import { Cherry, ShieldCheck, XCircle, Settings, FileText } from 'lucide-react';
import { providerConfig } from '../lib/aiClient';
import { useSakuraStore } from '../store/useSakuraStore';
import { MODE_DEFINITIONS } from '../data/modes';

interface TopBarProps {
  onOpenSettings?: () => void;
  onToggleScratchpad?: () => void;
  showScratchpad?: boolean;
  onRequestCloseProject?: () => void;
}

export function TopBar({ onOpenSettings, onToggleScratchpad, showScratchpad, onRequestCloseProject }: TopBarProps) {
  const { activeMode, setMode, project, setStatus } = useSakuraStore();

  return (
    <header className="topbar">
      <div className="brand-lockup" title="Sakura Coder - Your Local-first AI Pair Programmer">
        <div className="brand-icon"><Cherry size={20} /></div>
        <div>
          <strong>Sakura Coder</strong>
          <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
            {project ? project.name : 'Local-first AI IDE'}
          </span>
        </div>
      </div>

      <nav className="mode-tabs" aria-label="Sakura mode selector" title="Select AI agent behavior mode">
        {MODE_DEFINITIONS.map((mode) => (
          <button
            key={mode.id}
            className={mode.id === activeMode ? 'active' : ''}
            onClick={() => {
              setMode(mode.id);
              setStatus(`Switched to ${mode.label} mode.`);
            }}
            title={`${mode.label}: ${mode.summary}`}
            aria-label={`Switch to ${mode.label} mode`}
          >
            {mode.label}
          </button>
        ))}
      </nav>

      <div className="provider-pill" title={`Worker Endpoints: Qwen: ${providerConfig.qwenUrl} | Flux: ${providerConfig.fluxUrl} | Mode: ${providerConfig.mode}`}>
        <ShieldCheck size={16} />
        {providerConfig.mode.toUpperCase()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
        {project && (
          <>
            <button
              className="icon-button"
              onClick={onToggleScratchpad}
              title={showScratchpad ? 'Hide Scratchpad' : 'Show Scratchpad'}
              aria-label={showScratchpad ? 'Hide Scratchpad' : 'Show Scratchpad'}
              style={{ color: showScratchpad ? 'var(--primary)' : 'var(--text-muted)' }}
            >
              <FileText size={16} />
            </button>
            <button
              className="icon-button"
              onClick={onRequestCloseProject}
              title="Close current project and return to launcher"
              aria-label="Close project"
              style={{ background: 'rgba(255, 80, 110, 0.15)', color: '#ff506e', padding: '6px 12px', borderRadius: '14px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <XCircle size={14} /> Close
            </button>
          </>
        )}
        <button
          className="icon-button"
          onClick={onOpenSettings}
          title="IDE Settings"
          aria-label="Open settings"
          style={{ padding: '8px', borderRadius: '10px' }}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
