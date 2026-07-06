import { Target, Flag, Activity, Layers, Zap, Settings, ShieldAlert } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';
import { WORKFLOW_REGISTRY, getWorkflowIds } from '../workflows';
import { checkProviderHealth } from '../lib/aiClient';
import type { WorkflowId } from '../types/sakura';

export function MissionControl() {
  const { goal, activeMode, status, activeWorkflowId, setWorkflow, setStatus } = useSakuraStore();
  const workflowIds = getWorkflowIds();

  const handleWorkflowChange = (id: WorkflowId) => {
    setWorkflow(id, WORKFLOW_REGISTRY[id]);
    setStatus(`Switched to ${WORKFLOW_REGISTRY[id].displayName} workflow.`);
  };

  const runAudit = async () => {
    setStatus('Auditing worker connections...');
    try {
      const health = await checkProviderHealth();
      if (health.qwen === 'ok' && health.flux === 'ok' && health.minimax === 'ok') {
        setStatus('All workers connected and responding perfectly.');
      } else {
        const failed = [];
        if (health.qwen !== 'ok') failed.push('Qwen');
        if (health.flux !== 'ok') failed.push('Flux');
        if (health.minimax !== 'ok') failed.push('Minimax');
        setStatus(`Connection issues with: ${failed.join(', ')}. Check CORS settings.`);
      }
    } catch (error) {
      setStatus(`Audit failed: ${(error as Error).message}`);
    }
  };

  return (
    <section className="panel mission-panel" style={{ padding: '20px' }}>
      <div className="panel-title" style={{ marginBottom: '20px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={18} className="text-primary" />
          <span>Mission Control</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="icon-button" title="Audit Worker Connections" onClick={runAudit}>
            <ShieldAlert size={14} className={status.includes('failed') ? 'text-danger' : ''} />
          </button>
          <button className="icon-button" title="Workflow Settings" onClick={() => setStatus("Settings coming soon...")}>
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div className="mission-item" title="The current high-level goal of the project">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Target size={14} className="text-primary" />
          <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Objective</span>
        </div>
        <p style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.5', color: '#fff' }}>{goal}</p>
      </div>

      <div className="mission-divider" style={{ margin: '20px 0', opacity: 0.5 }} />

      <label style={{ marginBottom: '12px' }} title="Choose the workflow profile for this project">
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Active Workflow</span>
        <select 
          value={activeWorkflowId || ''} 
          onChange={(e) => handleWorkflowChange(e.target.value as WorkflowId)}
          style={{ fontSize: '12px', padding: '8px' }}
        >
          {workflowIds.map(id => (
            <option key={id} value={id}>{WORKFLOW_REGISTRY[id].displayName}</option>
          ))}
        </select>
      </label>

      <div className="mission-flags" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="flag ok" style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(68, 213, 144, 0.2)' }} title="The current AI agent behavior mode">
          <Layers size={14} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.7 }}>Active Mode</span>
            <strong style={{ fontSize: '12px' }}>{activeMode.toUpperCase()}</strong>
          </div>
        </div>
        
        <div className="flag ok" style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(123, 77, 255, 0.2)' }} title="System status and feedback">
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
