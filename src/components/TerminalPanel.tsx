import { useState, useRef, useEffect } from 'react';
import { Terminal, Trash2, Play, Square } from 'lucide-react';
import { assessCommandRisk } from '../lib/safety';
import { runSafeCommand } from '../lib/tauriApi';
import { trimHistory, type TerminalHistoryEntry } from '../lib/terminalHistory';
import { useSakuraStore } from '../store/useSakuraStore';
import type { RiskLevel } from '../types/sakura';

export function TerminalPanel() {
  const { project, activeMode, setStatus } = useSakuraStore();
  const [command, setCommand] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [history, setHistory] = useState<TerminalHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new history entries
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const appendEntry = (entry: TerminalHistoryEntry) => {
    setHistory((prev) => trimHistory([...prev, entry]));
  };

  const run = async (overrideCommand?: string) => {
    const cmd = overrideCommand ?? command;
    if (!cmd.trim() || !project || busy) return;

    const decision = assessCommandRisk(cmd, activeMode);

    // If confirmation is required and not yet provided
    if (decision.requiresExactConfirmation && confirmation !== decision.requiresExactConfirmation) {
      setPendingConfirmation(decision.requiresExactConfirmation);
      appendEntry({
        id: crypto.randomUUID(),
        command: cmd,
        stdout: '',
        stderr: `⚠ ${decision.reason}\n\nType exactly to confirm:\n  ${decision.requiresExactConfirmation}`,
        exitCode: null,
        blocked: true,
        riskLevel: decision.riskLevel,
        timestamp: new Date().toISOString(),
        pendingConfirmation: decision.requiresExactConfirmation,
      });
      setStatus(decision.reason);
      return;
    }

    setBusy(true);
    setPendingConfirmation(null);
    setStatus(`Running: ${cmd}`);

    try {
      const result = await runSafeCommand({
        rootPath: project.rootPath,
        command: cmd,
        mode: activeMode,
        userApproved: confirmation === decision.requiresExactConfirmation,
      });

      appendEntry({
        id: crypto.randomUUID(),
        command: cmd,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        blocked: result.blocked,
        riskLevel: result.riskLevel,
        timestamp: new Date().toISOString(),
      });

      setStatus(result.blocked ? `Blocked (${result.riskLevel})` : `Exit ${result.exitCode ?? '?'}`);
      setCommand('');
      setConfirmation('');
    } catch (error) {
      appendEntry({
        id: crypto.randomUUID(),
        command: cmd,
        stdout: '',
        stderr: `Error: ${(error as Error).message}`,
        exitCode: null,
        blocked: false,
        riskLevel: 'medium',
        timestamp: new Date().toISOString(),
      });
      setStatus(`Error: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void run();
    }
  };

  const riskColor = (level: RiskLevel) => {
    switch (level) {
      case 'critical': return '#ff2d55';
      case 'high': return '#ff9f0a';
      case 'medium': return '#ffd60a';
      default: return '#30d158';
    }
  };

  return (
    <section className="panel compact-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={15} />
          <span>Terminal</span>
        </div>
        <button
          className="icon-button"
          title="Clear history"
          onClick={() => setHistory([])}
          style={{ opacity: history.length > 0 ? 1 : 0.3 }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Output history */}
      <div
        ref={outputRef}
        style={{
          flex: 1,
          minHeight: '120px',
          maxHeight: '260px',
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '10px',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.5',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {history.length === 0 && (
          <span style={{ opacity: 0.4 }}>
            {project ? 'No commands run yet.' : 'Load a project first.'}
          </span>
        )}
        {history.map((entry) => (
          <div key={entry.id} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ color: riskColor(entry.riskLevel), fontSize: '10px' }}>●</span>
              <span style={{ color: '#f7a1c4', fontWeight: 'bold' }}>$ {entry.command}</span>
              {entry.blocked && (
                <span style={{ fontSize: '9px', background: 'rgba(255,45,85,0.2)', color: '#ff2d55', padding: '1px 6px', borderRadius: '4px' }}>
                  BLOCKED · {entry.riskLevel}
                </span>
              )}
              {entry.exitCode !== null && !entry.blocked && (
                <span style={{ fontSize: '9px', opacity: 0.5, marginLeft: 'auto' }}>
                  exit {entry.exitCode}
                </span>
              )}
            </div>
            {entry.stdout && (
              <pre style={{ margin: '0 0 2px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#e0e0e0' }}>
                {entry.stdout}
              </pre>
            )}
            {entry.stderr && (
              <pre style={{ margin: '0 0 2px 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: entry.blocked ? '#ffd60a' : '#ff6b6b' }}>
                {entry.stderr}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation input (shown when a risky command needs confirmation) */}
      {pendingConfirmation && (
        <div style={{ background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: '8px', padding: '8px', fontSize: '11px' }}>
          <p style={{ margin: '0 0 6px', color: '#ff9f0a' }}>Type exactly to confirm:</p>
          <code style={{ color: '#ffd60a', display: 'block', marginBottom: '6px' }}>{pendingConfirmation}</code>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Type confirmation here..."
            style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', width: '100%' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && confirmation === pendingConfirmation) {
                void run(history[history.length - 1]?.command);
              }
            }}
          />
        </div>
      )}

      {/* Command input */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#f7a1c4', fontFamily: 'monospace', fontSize: '12px', pointerEvents: 'none' }}>$</span>
          <input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={project ? 'npm run typecheck' : 'Load a project first'}
            disabled={!project || busy}
            style={{ paddingLeft: '22px', fontFamily: 'monospace', fontSize: '12px', width: '100%' }}
          />
        </div>
        <button
          onClick={() => run()}
          disabled={!project || !command.trim() || busy}
          title={busy ? 'Running...' : 'Run command'}
          style={{ padding: '0 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
        >
          {busy ? <Square size={12} /> : <Play size={12} />}
          {busy ? 'Running…' : 'Run'}
        </button>
      </div>
    </section>
  );
}
