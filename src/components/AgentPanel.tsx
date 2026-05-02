import { useState } from 'react';
import { Bot, Send, Sparkles, Layout, Code, Palette, Zap } from 'lucide-react';
import { callQwenAgent } from '../lib/aiClient';
import { createSystemPrompt } from '../lib/promptFactory';
import { appendSessionLog } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import type { AgentMessage } from '../types/sakura';

const now = () => new Date().toISOString();

export function AgentPanel() {
  const { project, activeMode, goal, messages, addMessage, setStatus, setStageTab, setGoal } = useSakuraStore();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const quickActions = [
    { label: 'Fix UI Layout', icon: <Layout size={12} />, prompt: 'I want to fix the UI layout of this project to be more modern and responsive.' },
    { label: 'Add Feature', icon: <Sparkles size={12} />, prompt: 'I want to add a new feature: ' },
    { label: 'Optimize Code', icon: <Zap size={12} />, prompt: 'Please review and optimize the current codebase for better performance.' },
    { label: 'Refine Design', icon: <Palette size={12} />, prompt: 'Refine the visual design of the components to look more premium.' },
  ];

  const submit = async (customInput?: string) => {
    const text = customInput || input;
    if (!text.trim()) return;
    const userMessage: AgentMessage = { id: crypto.randomUUID(), role: 'user', content: text, createdAt: now(), mode: activeMode };
    addMessage(userMessage);
    if (!customInput) setInput('');
    setBusy(true);

    try {
      const response = await callQwenAgent({
        mode: activeMode,
        project,
        goal,
        input: text,
        systemPrompt: createSystemPrompt(activeMode, project),
      });
      const assistantMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.content,
        createdAt: now(),
        mode: activeMode,
        metadata: response.metadata,
      };
      addMessage(assistantMessage);
      if (project) await appendSessionLog(project.rootPath, { userMessage, response, assistantMessage });
      setStatus(response.summary || 'Agent response received.');
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel agent-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title"><Bot size={16} /> Sakura Agent</div>
      
      <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {quickActions.map((action, i) => (
          <button 
            key={i} 
            className="secondary" 
            onClick={() => {
              if (action.label === 'Add Feature') {
                setInput(action.prompt);
              } else {
                void submit(action.prompt);
              }
            }}
            style={{ padding: '8px', fontSize: '11px', justifyContent: 'flex-start', textAlign: 'left' }}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      <div className="message-list" style={{ flex: 1 }}>
        {messages.length === 0 && <p className="muted">Ask for a plan, PRD, GDD, asset prompt or code review.</p>}
        {messages.slice(-8).map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <strong>{message.role === 'user' ? 'You' : 'Sakura'} · {message.mode}</strong>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
      
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <textarea
          placeholder="Tell Sakura what to do... (Ctrl+Enter to send)"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) void submit();
          }}
          style={{ minHeight: '80px' }}
        />
        <button onClick={() => submit()} disabled={busy} style={{ width: '100%' }}>
          <Send size={14} /> <span>Send Command</span>
        </button>
      </div>
    </section>
  );
}
