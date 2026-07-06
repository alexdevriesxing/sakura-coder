import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'grid', placeItems: 'center', zIndex: 2000,
        backdropFilter: 'blur(4px)', animation: 'fade-in 0.15s ease-out',
      }}
    >
      <div
        className="modal-panel"
        style={{
          background: '#1a1522', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px', width: '480px', maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden', animation: 'fade-in 0.2s ease-out',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{title}</h3>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ padding: '6px', borderRadius: '8px' }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px', color: '#e8dce8', fontSize: '14px', lineHeight: '1.6' }}>
          {children}
        </div>
        {onConfirm && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: '8px',
            padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <button
              className="secondary"
              onClick={onClose}
              disabled={loading}
              aria-label={cancelLabel}
              style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '13px' }}
            >
              {cancelLabel}
            </button>
            <button
              className={variant === 'danger' ? 'danger' : 'primary'}
              onClick={onConfirm}
              disabled={loading}
              aria-label={confirmLabel}
              style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
