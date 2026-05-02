import { useState } from 'react';
import { Terminal, HelpCircle, AlertCircle } from 'lucide-react';
import { assessCommandRisk } from '../lib/safety';
import { runSafeCommand } from '../lib/tauriApi';
import { callQwenAgent } from '../lib/aiClient';
import { useSakuraStore } from '../store/useSakuraStore';

export function TerminalPanel() {
  const { project, activeMode, setStatus } = useSakuraStore();
  const [command, setCommand] = useState('npm run typecheck');
  const [confirmation, setConfirmation] = useState('');
  const [output, setOutput] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!project) return;
    const decision = assessCommandRisk(command, activeMode);
    if (!decision.allowed && decision.requiresExactConfirmation && confirmation !== decision.requiresExactConfirmation) {
      setStatus(decision.reason);
      setOutput(`Approval required: ${decision.requiresExactConfirmation}`);
      return;
    }

    try {
      const result = await runSafeCommand({ rootPath: project.rootPath, command, mode: activeMode, userApproved: !decision.allowed });
      setOutput([`$ ${result.command}`, result.stdout, result.stderr].filter(Boolean).join('\n'));
      setStatus(result.blocked ? 'Command blocked.' : `Command finished with ${result.exitCode}`);
      setExplanation(null);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const explain = async () => {
    setBusy(true);
    try {
      const response = await callQwenAgent({
        mode: 'ask',
        goal: 'Explain terminal command',
        input: `Explain what this terminal command does in simple terms for a non-coder: "${command}". Also mention if it's safe or risky.`,
      });
      setExplanation(response.content);
    } catch (error) {
      setExplanation(`Failed to explain: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel compact-panel">
      <div className="panel-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={15} /> 
          <span>Safe Terminal</span>
        </div>
      </div>
      
      <label>Command<input value={command} onChange={(event) => setCommand(event.target.value)} /></label>
      
      <div className="button-row">
        <button onClick={run} style={{ flex: 1 }}><Terminal size={14} /> Run</button>
        <button className="secondary" onClick={explain} disabled={busy}><HelpCircle size={14} /> Explain</button>
      </div>

      <label>Exact confirmation when required<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>

      {explanation && (
        <div className="explanation-box" style={{ 
          background: 'rgba(123,77,255,0.1)', 
          border: '1px solid rgba(123,77,255,0.2)', 
          borderRadius: '12px', 
          padding: '12px', 
          fontSize: '12px',
          color: '#e0d0ff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: 'bold' }}>
            <AlertCircle size={14} /> AI Explanation
          </div>
          {explanation}
        </div>
      )}

      <pre className="terminal-output">{output || 'Output appears here.'}</pre>
    </section>
  );
}

