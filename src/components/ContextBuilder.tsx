import { useMemo, useState } from 'react';
import { ClipboardList, FileText } from 'lucide-react';
import { createContextMarkdown, defaultContextQuestions } from '../lib/documentFactory';
import { listProjectTree, writeProjectFile } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import type { ContextQuestion } from '../types/sakura';

export function ContextBuilder() {
  const { project, setFileTree, setStatus, openFileContent } = useSakuraStore();
  const initialQuestions = useMemo(() => defaultContextQuestions(project?.template || 'blank'), [project?.template]);
  const [questions, setQuestions] = useState<ContextQuestion[]>(initialQuestions);
  const [roughContext, setRoughContext] = useState('');

  const updateAnswer = (id: string, answer: string) => {
    setQuestions((items) => items.map((q) => (q.id === id ? { ...q, answer } : q)));
  };

  const saveContext = async () => {
    if (!project) return;
    const merged = roughContext.trim()
      ? [{ id: 'rough', question: 'Original rough user context', category: 'product' as const, required: false, answer: roughContext }, ...questions]
      : questions;
    const markdown = createContextMarkdown({ projectName: project.name, template: project.template, answers: merged });
    try {
      await writeProjectFile({ rootPath: project.rootPath, relativePath: 'docs/00_CONTEXT.md', content: markdown, createCheckpoint: true });
      openFileContent({ absolutePath: `${project.rootPath}/docs/00_CONTEXT.md`, relativePath: 'docs/00_CONTEXT.md', content: markdown });
      setFileTree(await listProjectTree(project.rootPath));
      setStatus('Context document saved.');
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <section className="panel compact-panel">
      <div className="panel-title"><ClipboardList size={15} /> Context Builder</div>
      <textarea
        className="small-textarea"
        placeholder="Paste rough project idea here. Sakura will preserve it in docs/00_CONTEXT.md."
        value={roughContext}
        onChange={(event) => setRoughContext(event.target.value)}
      />
      <div className="question-list">
        {questions.slice(0, 4).map((q) => (
          <label key={q.id}>
            {q.question}
            <input value={q.answer || ''} onChange={(event) => updateAnswer(q.id, event.target.value)} />
          </label>
        ))}
      </div>
      <button onClick={saveContext}><FileText size={14} /> Generate / Update Context MD</button>
    </section>
  );
}
