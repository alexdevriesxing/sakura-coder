import { Check, FileWarning, X, LayoutList, Code2, AlertTriangle } from 'lucide-react';
import { useState, useCallback } from 'react';
import { createSimpleDiff } from '../lib/diff';
import { applyProjectChanges, listProjectTree } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { Modal } from './Modal';

export function DiffApprovalPanel() {
  const { project, pendingDiff, setPendingDiff, setStatus, openFile, updateOpenFileContent, markOpenFileSaved, setFileTree } = useSakuraStore();
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const apply = async () => {
    if (!project || !pendingDiff) return;
    if (pendingDiff.changes.some((change) => change.action === 'delete')) {
      setShowDeleteModal(true);
      return;
    }
    await doApply();
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const doApply = useCallback(async () => {
    if (!project || !pendingDiff) return;
    try {
      await applyProjectChanges({
        rootPath: project.rootPath,
        changes: pendingDiff.changes,
        createCheckpoint: true,
      });
      const openFileChange = pendingDiff.changes.find((change) => openFile && change.relativePath === openFile.relativePath);
      if (openFileChange?.action === 'modify' || openFileChange?.action === 'create') {
        updateOpenFileContent(openFileChange.newContent || '');
        markOpenFileSaved();
      }
      const tree = await listProjectTree(project.rootPath);
      setFileTree(tree);
      setPendingDiff(null);
      setStatus(`Applied ${pendingDiff.changes.length} change(s) with checkpoints.`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }, [project, pendingDiff, openFile, updateOpenFileContent, markOpenFileSaved, setFileTree, setPendingDiff, setStatus]);

  if (!pendingDiff) {
    return (
      <section className="panel diff-panel empty">
        <div className="panel-title"><FileWarning size={15} /> Diff Gate</div>
        <p className="muted">No pending file changes. Agent edits must appear here before application.</p>
      </section>
    );
  }

  const first = pendingDiff.changes[0];
  const diffLines = createSimpleDiff(first.oldContent, first.newContent);
  const preview = diffLines.slice(0, 80);

  const additions = diffLines.filter(l => l.kind === 'added').length;
  const removals = diffLines.filter(l => l.kind === 'removed').length;

  return (
    <section className="panel diff-panel">
      <div className="panel-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileWarning size={15} /> 
          <span>Pending Diff · {pendingDiff.riskLevel}</span>
        </div>
        <div className="mode-tabs small">
          <button className={viewMode === 'visual' ? 'active' : ''} onClick={() => setViewMode('visual')} title="Visual Summary"><LayoutList size={12} /></button>
          <button className={viewMode === 'code' ? 'active' : ''} onClick={() => setViewMode('code')} title="Code Diff"><Code2 size={12} /></button>
        </div>
      </div>
      
      <div style={{ padding: '8px 0' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '14px' }}>{pendingDiff.title}</h3>
        <p className="muted" style={{ margin: 0 }}>{first.relativePath} · {first.action}</p>
      </div>

      {viewMode === 'visual' ? (
        <div className="visual-diff-summary" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '16px', margin: '8px 0', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#bcaec0', marginBottom: '4px' }}>CHANGES</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ height: '6px', flex: additions, background: '#44d590', borderRadius: '3px' }} title={`${additions} lines added`} />
                  <div style={{ height: '6px', flex: removals, background: '#ff506e', borderRadius: '3px' }} title={`${removals} lines removed`} />
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{additions + removals}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', background: 'rgba(255, 193, 90, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 193, 90, 0.2)' }}>
              <AlertTriangle size={16} style={{ color: '#ffc15a', marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#ffe7bf', lineHeight: '1.4' }}>
                <strong>Agent Reason:</strong> {first.reason}
              </div>
            </div>

            <div className="impact-indicator" style={{ fontSize: '11px' }}>
              <span className="muted">Estimated Impact:</span> 
              <span style={{ marginLeft: '6px', color: pendingDiff.riskLevel === 'high' ? '#ff506e' : '#44d590' }}>
                {pendingDiff.riskLevel.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <pre className="diff-preview">
          {preview.map((line, i) => (
            <div key={i} style={{ color: line.kind === 'added' ? '#44d590' : line.kind === 'removed' ? '#ff506e' : 'inherit' }}>
              {line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '} {line.text}
            </div>
          ))}
        </pre>
      )}

      <div className="button-row">
        <button onClick={apply} style={{ flex: 1 }} aria-label="Apply changes"><Check size={14} /> Apply Changes</button>
        <button className="danger" onClick={() => setPendingDiff(null)} aria-label="Reject changes"><X size={14} /> Reject</button>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => { setShowDeleteModal(false); doApply(); }}
        title="Apply with Deletions"
        variant="danger"
        confirmLabel="Apply with Checkpoint"
      >
        <p>This batch includes delete operations. Apply it with a checkpoint?</p>
      </Modal>
    </section>
  );
}
