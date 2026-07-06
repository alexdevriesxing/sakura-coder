import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, FileText, Image as ImageIcon, Layout, BarChart3, Terminal, Settings, HelpCircle, GitBranch, Code, X } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';
import type { ReactNode } from 'react';

interface Action {
  id: string;
  label: string;
  icon: ReactNode;
  category: string;
  shortcut?: string;
  action: () => void;
}

const DEFAULT_ACTIONS: Action[] = [
  { id: 'editor', label: 'Open Code Editor', icon: <Code size={16} />, category: 'Navigation', shortcut: 'Alt+1', action: () => useSakuraStore.getState().setStageTab('editor') },
  { id: 'preview', label: 'Open Visual Studio', icon: <Layout size={16} />, category: 'Navigation', shortcut: 'Alt+2', action: () => useSakuraStore.getState().setStageTab('preview') },
  { id: 'dashboard', label: 'Open Dashboard', icon: <BarChart3 size={16} />, category: 'Navigation', shortcut: 'Alt+3', action: () => useSakuraStore.getState().setStageTab('dashboard') },
  { id: 'gallery', label: 'Open Asset Gallery', icon: <ImageIcon size={16} />, category: 'Navigation', shortcut: 'Alt+4', action: () => useSakuraStore.getState().setStageTab('gallery') },
  { id: 'close-tab', label: 'Close Current Tab', icon: <X size={16} />, category: 'Editor', shortcut: 'Ctrl+W', action: () => {
    const { closeFile, activeFilePath } = useSakuraStore.getState();
    if (activeFilePath) closeFile(activeFilePath);
  }},
  { id: 'save', label: 'Save File', icon: <FileText size={16} />, category: 'Editor', shortcut: 'Ctrl+S', action: () => {
    const { openFile, project, markOpenFileSaved, setStatus } = useSakuraStore.getState();
    if (openFile?.dirty && project) {
      import('../lib/tauriApi').then(({ writeProjectFile }) => {
        writeProjectFile({ rootPath: project.rootPath, relativePath: openFile.relativePath, content: openFile.content, createCheckpoint: true })
          .then(() => { markOpenFileSaved(); setStatus(`Saved ${openFile.relativePath}`); });
      });
    }
  }},
  { id: 'ghost-toggle', label: 'Toggle Ghost Autocomplete', icon: <Code size={16} />, category: 'Editor', action: () => { void 0; } },
  { id: 'terminal', label: 'Focus Safe Terminal', icon: <Terminal size={16} />, category: 'Tools', action: () => useSakuraStore.getState().setStatus('Terminal focused') },
  { id: 'help', label: 'View Documentation', icon: <HelpCircle size={16} />, category: 'System', action: () => useSakuraStore.getState().setStatus('Documentation opened') },
  { id: 'settings', label: 'IDE Settings', icon: <Settings size={16} />, category: 'System', action: () => {
    window.dispatchEvent(new CustomEvent('open-settings'));
  }},
];

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

type CommandPaletteMode = 'commands' | 'files';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CommandPaletteMode>('commands');
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { project, setStatus } = useSakuraStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileActions, setFileActions] = useState<Action[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (search.startsWith('>')) {
      setMode('commands');
      setSearch(search.slice(1));
    } else if (search === '') {
      setMode('commands');
    } else {
      setMode('files');
    }
    setSelectedIndex(0);
  }, [search, isOpen]);

  useEffect(() => {
    if (!project) return;
    const loadFiles = async () => {
      try {
        const { listProjectTree, readProjectFile } = await import('../lib/tauriApi');
        const tree = await listProjectTree(project.rootPath);
        const files: { path: string; name: string }[] = [];
        const walk = (nodes: any[]) => {
          for (const n of nodes) {
            if (n.kind === 'file') files.push({ path: n.relativePath, name: n.name });
            if (n.children) walk(n.children);
          }
        };
        walk(tree);
        setFileActions(files.map((f) => ({
          id: f.path,
          label: f.path,
          icon: <FileText size={14} />,
          category: 'Files',
          action: () => {
            readProjectFile(project.rootPath, f.path).then((content) => {
              useSakuraStore.getState().openFileContent({
                absolutePath: `${project.rootPath}/${f.path}`,
                relativePath: f.path,
                content,
              });
              setStatus(`Opened ${f.path}`);
            });
          },
        })));
      } catch {
        void 0;
      }
    };
    void loadFiles();
  }, [project, isOpen]);

  const allActions = mode === 'commands' ? DEFAULT_ACTIONS : fileActions;

  const filteredActions = allActions.filter(a =>
    fuzzyMatch(a.label, search) || fuzzyMatch(a.category, search)
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearch('');
        setMode('commands');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsOpen(true);
        setSearch('');
        setMode('files');
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleAction = (action: Action) => {
    action.action();
    setIsOpen(false);
    setSearch('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex((i) => (i + 1) % filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex((i) => (i - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === 'Enter') {
      if (filteredActions[selectedIndex]) {
        handleAction(filteredActions[selectedIndex]);
      }
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
            placeholder={mode === 'commands' ? "Type command or search files..." : "Search files..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>{mode === 'commands' ? '>' : 'File'}</kbd>
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
                  onClick={() => handleAction(action)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span className="command-icon">{action.icon}</span>
                  <span className="command-label">{action.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                    {action.shortcut && <kbd className="command-shortcut">{action.shortcut}</kbd>}
                    {i === selectedIndex && <kbd className="command-shortcut">↵</kbd>}
                  </span>
                </button>
              );
              return acc;
            }, [])
          ) : (
            <div className="command-empty">No results for "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
