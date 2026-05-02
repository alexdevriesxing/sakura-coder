import { Cherry, ShieldCheck } from 'lucide-react';
import { providerConfig } from '../lib/aiClient';
import { useSakuraStore } from '../store/useSakuraStore';
import { MODE_DEFINITIONS } from '../data/modes';

export function TopBar() {
  const { activeMode, setMode, project } = useSakuraStore();

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-icon"><Cherry size={20} /></div>
        <div>
          <strong>Sakura Coder</strong>
          <span>{project ? project.name : 'Local-first AI IDE'}</span>
        </div>
      </div>

      <nav className="mode-tabs" aria-label="Sakura mode selector">
        {MODE_DEFINITIONS.map((mode) => (
          <button
            key={mode.id}
            className={mode.id === activeMode ? 'active' : ''}
            onClick={() => setMode(mode.id)}
            title={mode.summary}
          >
            {mode.label}
          </button>
        ))}
      </nav>

      <div className="provider-pill" title={`${providerConfig.qwenUrl} | ${providerConfig.fluxUrl}`}>
        <ShieldCheck size={16} />
        {providerConfig.mode.toUpperCase()}
      </div>
    </header>
  );
}
