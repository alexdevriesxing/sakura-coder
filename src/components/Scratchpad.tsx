import { useState, useEffect, useRef } from 'react';
import { FileText, Save, Copy, Trash2, Download, Upload, Clock, Plus, Minus, Check } from 'lucide-react';

interface ScratchpadProps {
  initialContent?: string;
  onSave?: (content: string) => void;
}

export function Scratchpad({ initialContent = '', onSave }: ScratchpadProps) {
  const [content, setContent] = useState(initialContent);
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialContent !== content && history[historyIndex] !== content) {
      setHistory(prev => [...prev.slice(0, historyIndex + 1), content]);
      setHistoryIndex(prev => prev + 1);
      setIsDirty(true);
    }
  }, [content]);

  const save = () => {
    onSave?.(content);
    setIsDirty(false);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(history[historyIndex - 1]);
      setIsDirty(false);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
      setIsDirty(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scratchpad.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clear = () => {
    setContent('');
    setIsDirty(true);
  };

  return (
    <div className="scratchpad">
      <div className="scratchpad-toolbar">
        <div className="scratchpad-title">
          <FileText size={14} />
          <span>Scratchpad</span>
        </div>
        <div className="scratchpad-actions">
          <button onClick={undo} disabled={historyIndex === 0} title="Undo (⌘Z)">
            <Minus size={12} />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (⌘⇧Z)">
            <Plus size={12} />
          </button>
          <button onClick={copyToClipboard} title="Copy to clipboard">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <button onClick={download} title="Download as MD">
            <Download size={12} />
          </button>
          <button onClick={clear} title="Clear">
            <Trash2 size={12} />
          </button>
          <button onClick={save} disabled={!isDirty} className="save-btn" title="Save (⌘S)">
            <Save size={12} />
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        className="scratchpad-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Use this scratchpad for notes, code snippets, prompts, or any temporary content..."
        spellCheck={false}
      />
      <div className="scratchpad-footer">
        <span className="word-count">{content.split(/\s+/).filter(Boolean).length} words</span>
        <span className="char-count">{content.length} chars</span>
        {isDirty && <span className="unsaved-indicator">Unsaved</span>}
      </div>
    </div>
  );
}