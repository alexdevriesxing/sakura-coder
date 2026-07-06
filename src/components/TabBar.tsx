import { useRef, useEffect, useCallback } from 'react';
import { X, File, FileCode, FileJson, FileType, Save } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';
import { useContextMenu } from './ContextMenu';

const fileIconMap: Record<string, typeof FileCode> = {
  ts: FileCode, tsx: FileCode, js: FileCode, jsx: FileCode,
  json: FileJson, css: FileType, html: FileType,
};

export function TabBar() {
  const { openFiles, activeFilePath, setActiveFile, closeFile, setStatus } = useSakuraStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { show: showCtxMenu } = useContextMenu();

  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector('.tab.active');
      active?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeFilePath]);

  const handleContextMenu = useCallback((e: React.MouseEvent, relativePath: string) => {
    e.preventDefault();
    const isActive = relativePath === activeFilePath;
    showCtxMenu([
      {
        id: 'close',
        label: 'Close',
        icon: <X size={14} />,
        shortcut: 'Ctrl+W',
        action: () => closeFile(relativePath),
      },
      {
        id: 'close-others',
        label: 'Close Others',
        icon: <X size={14} />,
        disabled: openFiles.length <= 1,
        action: () => {
          openFiles.forEach((f) => { if (f.relativePath !== relativePath) closeFile(f.relativePath); });
        },
      },
      {
        id: 'close-all',
        label: 'Close All',
        icon: <X size={14} />,
        action: () => {
          openFiles.forEach((f) => closeFile(f.relativePath));
        },
      },
      {
        id: 'sep1', label: '', icon: undefined, separator: true, action: () => {},
      },
      {
        id: 'save',
        label: 'Save',
        icon: <Save size={14} />,
        shortcut: 'Ctrl+S',
        disabled: !isActive,
        action: () => {
          const store = useSakuraStore.getState();
          if (store.project && store.openFile?.dirty) {
            import('../lib/tauriApi').then(({ writeProjectFile }) => {
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
        },
      },
    ], e.clientX, e.clientY, relativePath);
  }, [activeFilePath, openFiles, closeFile, showCtxMenu]);

  if (openFiles.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label="Open files"
      style={{
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border)',
        minHeight: '36px', flexShrink: 0, scrollbarWidth: 'thin',
        gap: '1px',
      }}
    >
      {openFiles.map((file) => {
        const isActive = file.relativePath === activeFilePath;
        const Icon = fileIconMap[file.language] || File;
        return (
          <div
            key={file.relativePath}
            role="tab"
            aria-selected={isActive}
            className={`tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveFile(file.relativePath)}
            onMouseDown={(e) => { if (e.button === 1) closeFile(file.relativePath); }}
            onContextMenu={(e) => handleContextMenu(e, file.relativePath)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px', fontSize: '12px', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              background: isActive ? 'rgba(247,161,196,0.08)' : 'transparent',
              borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
              color: isActive ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
          >
            <Icon size={12} style={{ opacity: 0.7, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
              {file.name}
            </span>
            {file.dirty && (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
            )}
            <button
              className="tab-close"
              onClick={(e) => { e.stopPropagation(); closeFile(file.relativePath); }}
              aria-label={`Close ${file.name}`}
              style={{
                padding: '2px', borderRadius: '4px', border: 'none',
                background: 'transparent', color: 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', opacity: 0.5,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
