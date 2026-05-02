import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Circle, Clock, Database, Target, BrainCircuit, RefreshCw, Network, FileText, ImageIcon } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';
import { listCheckpoints, loadProjectMemory } from '../lib/tauriApi';

export function ProjectDashboard() {
  const { project, workflowProfile, checkpoints, memory, assets, setCheckpoints, setMemory, setStatus } = useSakuraStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      refreshData();
    }
  }, [project]);

  const refreshData = async () => {
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
  };

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

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Project Relationship Map (New Visual) */}
        <div className="dashboard-card" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#00d2ff' }}>
            <Network size={18} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Knowledge Graph & Project Map</h3>
          </div>
          <div className="graph-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', padding: '20px', overflowX: 'auto' }}>
            {/* Docs Node */}
            <div className="graph-node" style={{ textAlign: 'center', minWidth: '100px' }}>
              <div style={{ width: '50px', height: '50px', background: 'rgba(247,161,196,0.1)', border: '2px solid #f7a1c4', borderRadius: '12px', display: 'grid', placeItems: 'center', margin: '0 auto 8px' }}>
                <FileText size={24} color="#f7a1c4" />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Docs</div>
              <div style={{ fontSize: '10px', color: '#bcaec0' }}>{workflowProfile?.defaultDocs.length} specs</div>
            </div>

            <div style={{ height: '2px', width: '40px', background: 'linear-gradient(90deg, #f7a1c4, #7b4dff)' }} />

            {/* Core Memory Node */}
            <div className="graph-node" style={{ textAlign: 'center', minWidth: '120px' }}>
              <div style={{ width: '70px', height: '70px', background: 'rgba(123,77,255,0.1)', border: '2px solid #7b4dff', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 8px', boxShadow: '0 0 20px rgba(123,77,255,0.3)' }}>
                <BrainCircuit size={32} color="#7b4dff" />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Sakura Memory</div>
              <div style={{ fontSize: '10px', color: '#bcaec0' }}>{memory?.decisions?.length || 0} decisions</div>
            </div>

            <div style={{ height: '2px', width: '40px', background: 'linear-gradient(90deg, #7b4dff, #44d590)' }} />

            {/* Assets Node */}
            <div className="graph-node" style={{ textAlign: 'center', minWidth: '100px' }}>
              <div style={{ width: '50px', height: '50px', background: 'rgba(68,213,144,0.1)', border: '2px solid #44d590', borderRadius: '12px', display: 'grid', placeItems: 'center', margin: '0 auto 8px' }}>
                <ImageIcon size={24} color="#44d590" />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Assets</div>
              <div style={{ fontSize: '10px', color: '#bcaec0' }}>{assets.length} generated</div>
            </div>
          </div>
        </div>

        {/* Workflow Checklist */}
        <div className="dashboard-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--primary)' }}>
            <CheckCircle2 size={18} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Workflow Progress</h3>
          </div>
          <div className="checklist">
            <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Validation Checklist</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {workflowProfile?.validationChecklist.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <Circle size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Memory */}
        <div className="dashboard-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--secondary)' }}>
            <BrainCircuit size={18} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Project Intelligence</h3>
          </div>
          {memory ? (
            <div className="memory-info" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  <Target size={12} /> Core Goals
                </div>
                {memory.goals?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {memory.goals.map((g: string, i: number) => (
                      <div key={i} style={{ fontSize: '13px', padding: '8px 12px', background: 'rgba(123,77,255,0.05)', borderRadius: '8px', borderLeft: '3px solid var(--secondary)' }}>{g}</div>
                    ))}
                  </div>
                ) : <p className="muted">No specific goals defined yet.</p>}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  <Database size={12} /> Tech Stack
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {memory.stack?.map((s: string, i: number) => (
                    <span key={i} className="badge primary">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="editor-empty" style={{ padding: '20px' }}><p>Memory not yet initialized.</p></div>
          )}
        </div>

        {/* Checkpoint Timeline */}
        <div className="dashboard-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent)' }}>
            <Clock size={18} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Checkpoint History</h3>
          </div>
          <div className="timeline">
            {checkpoints.slice(0, 10).map((cp, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-line" />
                <div className="timeline-dot" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{cp.split('_').slice(2).join(' ')}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{cp.split('_').slice(0, 2).join(' ')}</div>
                </div>
              </div>
            ))}
            {checkpoints.length === 0 && (
              <div className="editor-empty" style={{ padding: '20px' }}><p>No checkpoints created yet.</p></div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
