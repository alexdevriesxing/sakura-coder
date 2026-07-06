import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, Sparkles, Layout, Palette, Zap, User, Trash2, StopCircle } from 'lucide-react';
import { getLastLlmMetadata } from '../lib/aiClient';
import { runAgentLoop } from '../lib/agentRuntime';
import { createSystemPrompt } from '../lib/promptFactory';
import { buildContextMessage } from '../lib/contextBuilder';
import { parseAnnotatedCodeBlocks, toProposedFileChanges, highestRisk } from '../lib/codeBlockParser';
import { appendSessionLog, readProjectFile, applyProjectChanges, listProjectTree, buildProjectContext } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { Modal } from './Modal';
import type { AgentMessage, AgentStep, DiffPreview, ProposedFileChange } from '../types/sakura';

const now = () => new Date().toISOString();

export function AgentPanel() {
  const {
    project,
    activeMode,
    goal,
    messages,
    addMessage,
    updateMessage,
    setStatus,
    clearMessages,
    messageQueue,
    addToMessageQueue,
    popMessageQueue,
    openFile,
    memory,
    approvalMode,
    setPendingDiff,
    setFileTree,
    activeWorkflowId,
    assets,
    audioAssets,
    visualAnnotations,
  } = useSakuraStore();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [lastRunInput, setLastRunInput] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ changes: DiffPreview['changes']; resolve: (v: boolean) => void } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, steps, busy]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!busy && messageQueue.length > 0) {
      const next = popMessageQueue();
      if (next) void processMessage(next);
    }
  }, [busy, messageQueue, popMessageQueue]);

  const quickActions = [
    { label: 'Fix UI Layout', icon: <Layout size={12} />, prompt: 'I want to fix the UI layout of this project to be more modern and responsive.' },
    { label: 'Add Feature', icon: <Sparkles size={12} />, prompt: 'I want to add a new feature: ' },
    { label: 'Optimize Code', icon: <Zap size={12} />, prompt: 'Please review and optimize the current codebase for better performance.' },
    { label: 'Refine Design', icon: <Palette size={12} />, prompt: 'Refine the visual design of the components to look more premium.' },
  ];

  const submit = async (customInput?: string) => {
    const text = customInput || input;
    if (!text.trim()) return;

    if (busy) {
      addToMessageQueue(text);
      if (!customInput) setInput('');
      setStatus(`Message added to queue (${messageQueue.length + 1} pending)`);
      return;
    }

    if (!customInput) setInput('');
    await processMessage(text);
  };

  const applyDiff = async (diff: DiffPreview) => {
    if (!project) return;
    const hasDeletes = diff.changes.some((change) => change.action === 'delete');
    if (hasDeletes) {
      const confirmed = await new Promise<boolean>((resolve) => {
        setDeleteConfirm({ changes: diff.changes, resolve });
      });
      if (!confirmed) return;
    }
    try {
      await applyProjectChanges({
        rootPath: project.rootPath,
        changes: diff.changes,
        createCheckpoint: true,
      });
      const tree = await listProjectTree(project.rootPath);
      setFileTree(tree);
      setPendingDiff(null);
      setStatus(`Auto-applied ${diff.changes.length} change(s) (yolo mode).`);
    } catch (error) {
      setStatus(`Auto-apply failed: ${(error as Error).message}`);
    }
  };

  const handleDeleteConfirm = useCallback((confirmed: boolean) => {
    setDeleteConfirm((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const publishDiff = (changes: ProposedFileChange[], title = `Agent proposed ${changes.length} file change(s)`) => {
    if (!project || changes.length === 0) return;
    const diff: DiffPreview = {
      id: crypto.randomUUID(),
      title,
      riskLevel: highestRisk(changes.map((change) => change.riskLevel)),
      changes,
      createdAt: now(),
      approved: false,
    };
    setPendingDiff(diff);
    if (approvalMode === 'yolo') {
      void applyDiff(diff);
    }
  };

  const processMessage = async (text: string) => {
    if (!project) {
      setStatus('Load or create a project before starting an agent run.');
      return;
    }

    const projectContext = project
      ? await buildProjectContext({
        rootPath: project.rootPath,
        userMessage: text,
        openFileRelativePath: openFile?.relativePath ?? null,
      }).catch((error) => {
        setStatus(`Context build warning: ${(error as Error).message}`);
        return null;
      })
      : null;

    const { injectedMessage } = buildContextMessage({
      userMessage: text,
      openFile,
      memory,
      projectContext,
      assets,
      audioAssets,
      visualAnnotations,
    });

    setLastRunInput(text);
    cancelRef.current = false;
    setSteps([]);

    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: now(),
      mode: activeMode,
    };
    addMessage(userMessage);
    setBusy(true);
    setStreaming(false);
    setStatus('Sakura is running the agent loop...');

    const assistantId = crypto.randomUUID();
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: now(),
      mode: activeMode,
    });

    let accumulated = '';

    try {
      const result = await runAgentLoop({
        rootPath: project.rootPath,
        mode: activeMode,
        approvalMode,
        userMessage: injectedMessage,
        systemPrompt: createSystemPrompt(activeMode, project, activeWorkflowId),
        maxTurns: 8,
        isCancelled: () => cancelRef.current,
        onStep: (step) => {
          setSteps((current) => [...current.slice(-29), step]);
          if (step.kind === 'tool_call') {
            setStatus(`Running tool: ${step.title}`);
          } else if (step.kind === 'tool_result' || step.kind === 'command') {
            setStatus(step.toolResult?.ok ? `Tool completed: ${step.title}` : `Tool failed: ${step.title}`);
          }
        },
        onProposedChanges: (changes) => publishDiff(changes),
      });

      accumulated = result.finalContent;
      updateMessage(assistantId, accumulated, { llm: result.metadata ?? getLastLlmMetadata(), runId: result.runId });

      const blocks = parseAnnotatedCodeBlocks(accumulated);
      if (blocks.length > 0 && project) {
        const existingContents: Record<string, string> = {};
        for (const block of blocks) {
          try {
            const content = await readProjectFile(project.rootPath, block.relativePath);
            existingContents[block.relativePath] = content;
          } catch {
            // Missing files are proposed as creates.
          }
        }

        const changes = toProposedFileChanges(blocks, existingContents);
        publishDiff(changes, `Annotated response proposed ${changes.length} file change(s)`);
      }

      const finalMessage: AgentMessage = {
        id: assistantId,
        role: 'assistant',
        content: accumulated,
        createdAt: now(),
        mode: activeMode,
        metadata: { llm: result.metadata ?? getLastLlmMetadata(), runId: result.runId },
      };
      updateMessage(assistantId, accumulated, finalMessage.metadata);
      await appendSessionLog(project.rootPath, { userMessage, assistantMessage: finalMessage, steps: result.steps });
      setStatus(result.stopped ? 'Agent stopped.' : accumulated ? 'Agent run completed.' : 'Agent returned an empty response.');
    } catch (error) {
      const errorMsg = (error as Error).message;
      setStreaming(false);

      if (accumulated) {
        setStatus(`Stream interrupted: ${errorMsg}`);
      } else {
        updateMessage(assistantId, `Sorry, I encountered an error: ${errorMsg}. Please check your Cloudflare Worker connection.`);
        setStatus(`Error: ${errorMsg}`);
      }
    } finally {
      setBusy(false);
      setStreaming(false);
    }
  };

  return (
    <section className="panel agent-panel">
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={16} /> Sakura Agent
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {messageQueue.length > 0 && (
            <span className="badge" title={`${messageQueue.length} messages waiting to be processed`} style={{ fontSize: '10px', background: 'var(--secondary)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
              {messageQueue.length} queued
            </span>
          )}
          {openFile && (
            <span title={`Context: ${openFile.relativePath}`} style={{ fontSize: '10px', background: 'rgba(247,161,196,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              File: {openFile.name}
            </span>
          )}
          <button className="icon-button" title="Clear Chat History" onClick={() => setShowClearModal(true)} aria-label="Clear chat history">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px', flexShrink: 0, padding: '0 4px' }}>
        {quickActions.map((action, i) => (
          <button
            key={i}
            className="secondary"
            title={`Quick Action: ${action.label}`}
            onClick={() => {
              if (action.label === 'Add Feature') {
                setInput(action.prompt);
                textareaRef.current?.focus();
              } else {
                void submit(action.prompt);
              }
            }}
            style={{ padding: '8px', fontSize: '11px', justifyContent: 'flex-start', textAlign: 'left', borderRadius: '10px' }}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {steps.length > 0 && (
        <div className="agent-step-timeline" style={{ flexShrink: 0, display: 'grid', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '0 4px 8px' }}>
          {steps.slice(-6).map((step) => (
            <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '86px 1fr', gap: '8px', alignItems: 'start', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
              <span className="muted" style={{ fontSize: '9px', textTransform: 'uppercase' }}>{step.kind}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.title}</div>
                {step.detail && (
                  <div className="muted" style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.detail}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="message-list" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5, textAlign: 'center', padding: '20px' }}>
            <Sparkles size={32} style={{ marginBottom: '12px' }} />
            <p className="muted" style={{ fontSize: '12px' }}>How can I help you build today?</p>
          </div>
        )}
        {messages.slice(-20).map((message) => {
          const llm = message.metadata?.llm as { providerUsed?: string | null; modelUsed?: string | null } | undefined;
          return (
            <article key={message.id} className={`message ${message.role}`} style={{ marginBottom: '12px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: message.role === 'user' ? 'rgba(255,255,255,0.1)' : 'var(--primary)', display: 'grid', placeItems: 'center' }}>
                  {message.role === 'user' ? <User size={12} /> : <Bot size={12} color="#000" />}
                </div>
                <strong style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {message.role === 'user' ? 'You' : 'Sakura'}
                </strong>
                <span className="muted" style={{ fontSize: '9px', marginLeft: 'auto' }}>{message.mode}</span>
                {message.role === 'assistant' && llm?.modelUsed && (
                  <span className="muted" title={`Provider: ${llm.providerUsed ?? 'unknown'}`} style={{ fontSize: '9px' }}>
                    {llm.modelUsed}
                  </span>
                )}
              </div>
              <div className="markdown-body" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
                {streaming && message.role === 'assistant' && message === messages[messages.length - 1] && (
                  <span className="streaming-cursor" style={{ display: 'inline-block', width: '2px', height: '14px', background: 'var(--primary)', marginLeft: '2px', verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />
                )}
              </div>
            </article>
          );
        })}
        {busy && !streaming && (
          <article className="message assistant busy" style={{ background: 'transparent', border: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(247, 161, 196, 0.05)', borderRadius: '12px', border: '1px solid rgba(247, 161, 196, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="dot-flashing" />
                <span className="muted" style={{ fontSize: '12px', fontWeight: 500 }}>Sakura is working...</span>
                <span className="muted" style={{ fontSize: '10px', marginLeft: 'auto' }}>{steps.length} steps</span>
              </div>
              {steps.length > 2 && (
                <div className="task-progress" style={{ width: '100%' }}>
                  <div className="progress-bar" style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div className="progress-fill" style={{ width: `${Math.min((steps.filter(s => s.kind === 'tool_result' || s.kind === 'command' || s.kind === 'final').length / Math.max(steps.length, 1)) * 100, 95)}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}
            </div>
          </article>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            placeholder="Describe your vision... (Enter to send)"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            style={{
              minHeight: '80px',
              maxHeight: '200px',
              resize: 'none',
              overflowY: 'auto',
              padding: '12px',
              paddingRight: '40px',
              borderRadius: '14px',
              fontSize: '14px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
              transition: 'all 0.2s ease',
            }}
          />
          <button
            onClick={() => {
              if (busy) {
                cancelRef.current = true;
                setStatus('Stopping after the current tool/model turn...');
              } else {
                void submit();
              }
            }}
            disabled={!busy && !input.trim()}
            title={busy ? 'Stop Agent Run' : 'Send Message'}
            style={{
              position: 'absolute',
              right: '10px',
              bottom: '10px',
              width: '28px',
              height: '28px',
              padding: 0,
              borderRadius: '8px',
              background: busy || input.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: busy || input.trim() ? '#000' : 'var(--text-muted)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {busy ? <StopCircle size={14} /> : <Send size={14} />}
          </button>
        </div>
        {!busy && lastRunInput && (
          <button className="secondary" onClick={() => void submit(`Continue from the previous Sakura run. Last request: ${lastRunInput}`)} title="Continue the previous agent task">
            Continue
          </button>
        )}
        <p className="muted" style={{ fontSize: '10px', textAlign: 'center', opacity: 0.6 }}>
          Shift + Enter for new line. Tools run through Sakura safety gates.
        </p>
      </div>

      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={() => { clearMessages(); setStatus('Chat history cleared.'); setShowClearModal(false); }}
        title="Clear Chat History"
        variant="danger"
        confirmLabel="Clear All"
      >
        <p>This will permanently delete all messages in the current conversation.</p>
      </Modal>

      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => handleDeleteConfirm(false)}
        onConfirm={() => handleDeleteConfirm(true)}
        title="Delete Files"
        variant="danger"
        confirmLabel="Confirm Deletion"
      >
        <p>This batch includes delete operations:</p>
        <ul style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {deleteConfirm?.changes.filter(c => c.action === 'delete').map((c, i) => (
            <li key={i}>{c.relativePath}</li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}
