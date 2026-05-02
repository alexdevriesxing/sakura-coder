import { Target, Flag, Activity, Layers, Zap, Settings } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';
import { WORKFLOW_REGISTRY, getWorkflowIds } from '../workflows';
import type { WorkflowId } from '../types/sakura';

export function MissionControl() {
  const { goal, activeMode, status, activeWorkflowId, setWorkflow } = useSakuraStore();
  const workflowIds = getWorkflowIds();

  return (
    <section className="panel mission-panel" style={{ padding: '20px' }}>
      <div className="panel-title" style={{ marginBottom: '20px' }}>
        <Zap size={18} className="text-primary" />
        <span>Mission Control</span>
      </div>

      <div className="mission-item">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Target size={14} className="text-primary" />
          <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Objective</span>
        </div>
        <p style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.5', color: '#fff' }}>{goal}</p>
      </div>

      <div className="mission-divider" style={{ margin: '20px 0', opacity: 0.5 }} />

      <label style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Active Workflow</span>
        <select 
          value={activeWorkflowId || ''} 
          onChange={(e) => setWorkflow(e.target.value as WorkflowId, WORKFLOW_REGISTRY[e.target.value as WorkflowId])}
          style={{ fontSize: '12px', padding: '8px' }}
        >
          {workflowIds.map(id => (
            <option key={id} value={id}>{WORKFLOW_REGISTRY[id].displayName}</option>
          ))}
        </select>
      </label>

      <div className="mission-flags" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="flag ok" style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(68, 213, 144, 0.2)' }}>
          <Layers size={14} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.7 }}>Active Mode</span>
            <strong style={{ fontSize: '12px' }}>{activeMode.toUpperCase()}</strong>
          </div>
        </div>
        
        <div className="flag ok" style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(123, 77, 255, 0.2)' }}>
          <Activity size={14} style={{ color: 'var(--secondary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.7 }}>Status</span>
            <strong style={{ fontSize: '12px', color: 'var(--secondary)' }}>{status}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
