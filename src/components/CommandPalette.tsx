import { useState, useEffect, useRef } from 'react';
import { Search, Command, FileText, Image as ImageIcon, Layout, BarChart3, Terminal, Settings, HelpCircle, X } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setStageTab, setStatus, project } = useSakuraStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = [
    { id: 'editor', label: 'Open Code Editor', icon: <FileText size={16} />, category: 'Navigation', action: () => setStageTab('editor') },
    { id: 'preview', label: 'Open Visual Studio', icon: <Layout size={16} />, category: 'Navigation', action: () => setStageTab('preview') },
    { id: 'dashboard', label: 'Open Dashboard', icon: <BarChart3 size={16} />, category: 'Navigation', action: () => setStageTab('dashboard') },
    { id: 'gallery', label: 'Open Asset Gallery', icon: <ImageIcon size={16} />, category: 'Navigation', action: () => setStageTab('gallery') },
    { id: 'terminal', label: 'Focus Safe Terminal', icon: <Terminal size={16} />, category: 'Tools', action: () => setStatus('Terminal focused') },
    { id: 'help', label: 'View Documentation', icon: <HelpCircle size={16} />, category: 'System', action: () => setStatus('Documentation opened') },
    { id: 'settings', label: 'IDE Settings', icon: <Settings size={16} />, category: 'System', action: () => setStatus('Settings opened') },
  ];

  const filteredActions = actions.filter(a => 
    a.label.toLowerCase().includes(search.toLowerCase()) || 
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    setSearch('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex((i) => (i + 1) % filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex((i) => (i - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === 'Enter') {
      handleAction(filteredActions[selectedIndex].action);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-header">
          <Search size={18} className="muted" />
          <input 
            ref={inputRef}
            placeholder="Search commands (e.g. 'Open Dashboard')..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-palette-results">
          {filteredActions.length > 0 ? (
            filteredActions.reduce((acc: any[], action, i) => {
              const prevAction = filteredActions[i - 1];
              if (!prevAction || prevAction.category !== action.category) {
                acc.push(<div key={`cat-${action.category}`} className="command-category-label">{action.category}</div>);
              }
              acc.push(
                <button 
                  key={action.id} 
                  className={`command-item ${i === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleAction(action.action)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span className="command-icon">{action.icon}</span>
                  <span className="command-label">{action.label}</span>
                  {i === selectedIndex && <span style={{ fontSize: '10px', opacity: 0.5 }}>ENTER</span>}
                </button>
              );
              return acc;
            }, [])
          ) : (
            <div className="command-empty">No commands found matching "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
