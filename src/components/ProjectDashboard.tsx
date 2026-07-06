import { useEffect, useState, useCallback } from 'react';
import { Activity, CheckCircle2, Circle, Clock, Database, Target, BrainCircuit, RefreshCw, Network, FileText, ImageIcon, Layers, Box } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';
import { listCheckpoints, loadProjectMemory } from '../lib/tauriApi';

export function ProjectDashboard() {
  const { project, workflowProfile, checkpoints, memory, assets, audioAssets, setCheckpoints, setMemory, setStatus } = useSakuraStore();
  const [loading, setLoading] = useState(false);

  const refreshData = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const [cp, mem] = await Promise.all([
        listCheckpoints(project.rootPath),
        loadProjectMemory(project.rootPath)
      ]);
      setCheckpoints(cp);
      setMemory(mem);
    } catch (error) {
      setStatus(`Failed to load dashboard data: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [project, setCheckpoints, setMemory, setStatus]);

  useEffect(() => {
    if (project) {
      refreshData();
    }
  }, [project, refreshData]);

  if (!project) return null;

  return (
    <section className="panel dashboard-panel" style={{ height: '100%', overflow: 'auto', padding: '20px' }}>
      <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} className="text-primary" />
          <h2 style={{ margin: 0 }}>Project Intelligence Dashboard</h2>
        </div>
        <button className="icon-button" onClick={refreshData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <section className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', background: 'rgba(247, 161, 196, 0.1)', borderRadius: '10px' }}>
              <Layers size={20} className="text-primary" />
            </div>
            <h3 style={{ margin: 0 }}>Project Metadata</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span className="muted">Template</span>
              <span className="badge primary">{project.template}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span className="muted">Workflow</span>
              <span className="badge success">{project.workflowId || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span className="muted">Root Path</span>
              <code style={{ fontSize: '11px', opacity: 0.8, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.rootPath}</code>
            </div>
          </div>
        </section>

        <section className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '8px', background: 'rgba(123, 77, 255, 0.1)', borderRadius: '10px' }}>
              <Clock size={20} style={{ color: 'var(--secondary)' }} />
            </div>
            <h3 style={{ margin: 0 }}>Recent Checkpoints</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {checkpoints.slice(0, 5).map((cp, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '12px' }}>
                <div style={{ fontWeight: 700 }}>{cp.split('_').slice(2).join(' ')}</div>
                <div className="muted" style={{ fontSize: '10px' }}>{cp.split('_').slice(0, 2).join(' ')}</div>
              </div>
            ))}
            {checkpoints.length === 0 && <p className="muted" style={{ fontSize: '12px', textAlign: 'center' }}>No checkpoints yet.</p>}
          </div>
        </section>
      </div>
    </section>
  );
}
