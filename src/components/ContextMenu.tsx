/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  action: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
  target?: string;
}

interface ContextMenuContext {
  show: (items: ContextMenuItem[], x: number, y: number, target?: string) => void;
}

const Ctx = createContext<ContextMenuContext | null>(null);

export function useContextMenu() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useContextMenu must be used within ContextMenuProvider');
  return ctx;
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const show = useCallback((items: ContextMenuItem[], x: number, y: number, target?: string) => {
    setMenu({ x, y, items, target });
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menu]);

  useEffect(() => {
    if (!menu || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, [menu]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {menu && (
        <div
          ref={ref}
          role="menu"
          className="context-menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', left: menu.x, top: menu.y, zIndex: 5000,
            minWidth: '180px', maxWidth: '280px',
            background: '#1a1522', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px', padding: '4px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            animation: 'fade-in 0.1s ease-out',
          }}
        >
          {menu.items.map((item) => (
            item.separator ? (
              <div key={item.id} style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 8px' }} />
            ) : (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { item.action(); setMenu(null); }}
                onMouseEnter={(e) => { e.currentTarget.style.background = item.danger ? 'rgba(255,80,110,0.15)' : 'rgba(247,161,196,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px', fontSize: '12px', borderRadius: '6px',
                  border: 'none', background: 'transparent', cursor: item.disabled ? 'not-allowed' : 'pointer',
                  color: item.danger ? '#ff506e' : item.disabled ? 'var(--text-muted)' : '#e8dce8',
                  textAlign: 'left', opacity: item.disabled ? 0.4 : 1,
                }}
              >
                {item.icon && <span style={{ width: '16px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{item.icon}</span>}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.shortcut && (
                  <kbd style={{ fontSize: '9px', padding: '2px 4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            )
          ))}
        </div>
      )}
    </Ctx.Provider>
  );
}
