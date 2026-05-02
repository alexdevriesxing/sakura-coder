import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Copy, Trash2, Download, ChevronDown, ChevronUp, ChevronRight, Check, X, Loader2, AlertCircle } from 'lucide-react';

interface TerminalOutput {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'command' | 'loading';
  content: string;
  timestamp: string;
}

interface TerminalOutputPanelProps {
  outputs: TerminalOutput[];
  onClear?: () => void;
  onCopy?: () => void;
}

function TerminalLine({ output }: { output: TerminalOutput }) {
  const icons = {
    info: <TerminalIcon size={12} />,
    success: <Check size={12} className="text-green" />,
    error: <X size={12} className="text-red" />,
    warning: <AlertCircle size={12} className="text-yellow" />,
    command: <ChevronRight size={12} />,
    loading: <Loader2 size={12} className="animate-spin" />,
  };

  return (
    <div className={`terminal-line terminal-line-${output.type}`}>
      <span className="terminal-icon">{icons[output.type]}</span>
      <span className="terminal-content">{output.content}</span>
      <span className="terminal-time">{output.timestamp}</span>
    </div>
  );
}

export function TerminalOutputPanel({ outputs = [], onClear, onCopy }: TerminalOutputPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [outputs, autoScroll]);

  const copyAll = async () => {
    const text = outputs.map(o => `[${o.type}] ${o.content}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy?.();
  };

  const hasErrors = outputs.some(o => o.type === 'error');
  const hasWarnings = outputs.some(o => o.type === 'warning');

  return (
    <div className={`terminal-output-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="terminal-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="terminal-title">
          <TerminalIcon size={14} />
          <span>Terminal</span>
          {hasErrors && <span className="terminal-badge error">{outputs.filter(o => o.type === 'error').length} errors</span>}
          {hasWarnings && <span className="terminal-badge warning">{outputs.filter(o => o.type === 'warning').length} warnings</span>}
          <span className="terminal-count">{outputs.length} lines</span>
        </div>
        <div className="terminal-actions" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setAutoScroll(!autoScroll)} title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}>
            {autoScroll ? '📜 Auto' : '📜 Manual'}
          </button>
          <button onClick={copyAll} title="Copy all">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button onClick={onClear} title="Clear terminal">
            <Trash2 size={12} />
          </button>
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </div>
      {!isCollapsed && (
        <div className="terminal-body" ref={containerRef}>
          {outputs.length > 0 ? (
            outputs.map((output) => <TerminalLine key={output.id} output={output} />)
          ) : (
            <div className="terminal-empty">
              <TerminalIcon size={24} />
              <p>No output yet</p>
              <p className="muted">Run a command to see output here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}