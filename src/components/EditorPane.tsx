import { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Save, Sparkles, FolderTree, UploadCloud, FileCode2, CheckCircle2, AlertCircle, Wand2, TestTube2, MessageSquareText } from 'lucide-react';
import { callQwenAgent } from '../lib/aiClient';
import { createSystemPrompt } from '../lib/promptFactory';
import { writeProjectFile, writeBinaryFile, listProjectTree, convertFileSrc } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { TabBar } from './TabBar';

export function EditorPane() {
  const { project, openFile, updateOpenFileContent, markOpenFileSaved, setStatus, setFileTree, activeWorkflowId } = useSakuraStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineSuggestion, setInlineSuggestion] = useState('');
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const completionRef = useRef('');
  const autocompleteEnabledRef = useRef(false);
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null);

  const save = async () => {
    if (!project || !openFile) return;
    try {
      const checkpoint = await writeProjectFile({
        rootPath: project.rootPath,
        relativePath: openFile.relativePath,
        content: openFile.content,
        createCheckpoint: true,
      });
      markOpenFileSaved();
      setStatus(`Saved ${openFile.relativePath}. Checkpoint: ${checkpoint}`);
    } catch (error) {
      setStatus(`Save failed: ${(error as Error).message}`);
    }
  };

  const selectedText = () => {
    const editor = editorRef.current;
    const model = editor?.getModel?.();
    const selection = editor?.getSelection?.();
    if (!model || !selection || selection.isEmpty()) return '';
    return model.getValueInRange(selection);
  };

  const runInlineAction = async (action: 'explain' | 'fix' | 'rewrite' | 'tests') => {
    if (!project || !openFile) return;
    setInlineBusy(true);
    setInlineSuggestion('');
    try {
      const selection = selectedText();
      const target = selection || openFile.content;
      const response = await callQwenAgent({
        mode: action === 'explain' ? 'ask' : 'refactor',
        project,
        goal: `Inline ${action} for ${openFile.relativePath}`,
        input: [
          `Inline editor action: ${action}`,
          `File: ${openFile.relativePath}`,
          selection ? 'Only operate on the selected code.' : 'No selection is active; operate on the full file.',
          action === 'explain' ? 'Return a concise explanation.' : 'Return only the replacement code or test code. Do not wrap in markdown fences.',
          '',
          target,
        ].join('\n'),
        systemPrompt: createSystemPrompt(action === 'explain' ? 'ask' : 'refactor', project, activeWorkflowId),
      });
      setInlineSuggestion(response.content.trim());
      setStatus(`Inline ${action} ready.`);
    } catch (error) {
      setStatus(`Inline ${action} failed: ${(error as Error).message}`);
    } finally {
      setInlineBusy(false);
    }
  };

  const acceptInlineSuggestion = () => {
    if (!inlineSuggestion || !openFile) return;
    const editor = editorRef.current;
    const selection = editor?.getSelection?.();
    if (editor && selection && !selection.isEmpty()) {
      editor.executeEdits('sakura-inline', [{ range: selection, text: inlineSuggestion, forceMoveMarkers: true }]);
      updateOpenFileContent(editor.getValue());
    } else {
      updateOpenFileContent(inlineSuggestion);
    }
    setInlineSuggestion('');
    setStatus('Inline suggestion applied.');
  };

  const registerInlineCompletionProvider = (monaco: any, language: string) => {
    completionProviderRef.current?.dispose();
    completionProviderRef.current = monaco.languages.registerInlineCompletionsProvider(language || 'typescript', {
      provideInlineCompletions: (_model: any, position: any) => {
        const insertText = completionRef.current;
        if (!insertText || !autocompleteEnabledRef.current) return { items: [], dispose: () => {} };
        return {
          items: [{
            insertText,
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          }],
          dispose: () => {},
        };
      },
      freeInlineCompletions: () => {},
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!project) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploadStatus('uploading');
    setStatus(`Uploading ${files.length} files...`);

    try {
      for (const file of files) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });

        const base64Content = await base64Promise;

        let folder = 'assets';
        if (file.type.startsWith('image/')) folder = 'assets/generated';
        else if (file.type.startsWith('audio/')) folder = 'assets/generated/audio';

        const relativePath = `${folder}/${file.name}`;

        await writeBinaryFile({
          rootPath: project.rootPath,
          relativePath,
          base64Content
        });
      }

      const newTree = await listProjectTree(project.rootPath);
      setFileTree(newTree);
      setUploadStatus('success');
      setStatus(`Successfully uploaded ${files.length} files to project.`);
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (error) {
      setUploadStatus('error');
      setStatus(`Upload failed: ${(error as Error).message}`);
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  }, [project, setFileTree, setStatus]);

  useEffect(() => {
    if (!openFile?.dirty || !project) return;

    const timer = setTimeout(() => {
      void save();
    }, 2000);

    return () => clearTimeout(timer);
  }, [openFile?.content, openFile?.dirty, project]);

  useEffect(() => {
    autocompleteEnabledRef.current = autocompleteEnabled;
    if (!autocompleteEnabled) {
      completionRef.current = '';
    }
  }, [autocompleteEnabled]);

  useEffect(() => {
    if (!autocompleteEnabled || !project || !openFile || !openFile.content.trim()) return;
    const timer = setTimeout(async () => {
      try {
        const response = await callQwenAgent({
          mode: 'refactor',
          project,
          goal: `Autocomplete ${openFile.relativePath}`,
          input: [
            'Return only the next short code completion at the cursor. No markdown.',
            `File: ${openFile.relativePath}`,
            openFile.content.slice(-5_000),
          ].join('\n'),
          systemPrompt: createSystemPrompt('refactor', project, activeWorkflowId),
        });
        completionRef.current = response.content.trim().slice(0, 600);
      } catch {
        completionRef.current = '';
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [autocompleteEnabled, openFile?.content, openFile?.relativePath, project, activeWorkflowId]);

  useEffect(() => () => completionProviderRef.current?.dispose(), []);

  useEffect(() => {
    if (monacoRef.current && openFile?.language) {
      registerInlineCompletionProvider(monacoRef.current, openFile.language);
    }
  }, [openFile?.language]);

  if (!openFile) {
    return (
      <section
        className={`editor-empty ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#0b0912',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}
      >
        {isDragging && (
          <div style={{ position: 'absolute', inset: '24px', border: '2px dashed var(--primary)', borderRadius: '32px', background: 'rgba(247, 161, 196, 0.08)', display: 'grid', placeItems: 'center', zIndex: 10, backdropFilter: 'blur(8px)', animation: 'pulse 2s infinite' }}>
            <div style={{ textAlign: 'center' }}>
              <UploadCloud size={64} color="var(--primary)" />
              <p style={{ marginTop: '16px', fontSize: '18px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Release to import files</p>
              <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>Images, Audio, and Code files supported</p>
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '60px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', maxWidth: '480px', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', opacity: 0.5 }} />

          <div style={{ width: '100px', height: '100px', margin: '0 auto 32px auto', background: 'radial-gradient(circle at top left, rgba(247,161,196,0.2), transparent)', borderRadius: '28px', display: 'grid', placeItems: 'center', border: '1px solid rgba(247,161,196,0.15)', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
            <FileCode2 size={48} color="var(--primary)" style={{ opacity: 0.9 }} />
          </div>

          <h2 style={{ fontSize: '28px', margin: '0 0 16px 0', color: '#fff', letterSpacing: '-0.03em', fontWeight: 800 }}>Canvas Ready</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.7', margin: '0 0 40px 0' }}>
            Open a file from the sidebar to begin, or <strong style={{ color: 'var(--primary)' }}>drag and drop</strong> assets here to instantly import them into your project.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              className="secondary"
              title="Browse your project files in the left sidebar"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px', borderRadius: '12px' }}
              onClick={() => setStatus('Open a file from the file tree to begin editing.')}
            >
              <FolderTree size={16} /> Explore
            </button>
            <button
              className="primary"
              title="Switch to Ask mode to chat with the AI agent"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', border: 'none' }}
              onClick={() => {
                useSakuraStore.getState().setMode('ask');
                setStatus('Switched to Ask mode. Type your request in the agent panel.');
              }}
            >
              <Sparkles size={16} /> Ask Sakura
            </button>
          </div>

          {uploadStatus !== 'idle' && (
            <div style={{ marginTop: '32px', padding: '12px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', animation: 'fade-enter 0.3s ease' }}>
              {uploadStatus === 'uploading' && <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />}
              {uploadStatus === 'success' && <CheckCircle2 size={16} color="var(--accent)" />}
              {uploadStatus === 'error' && <AlertCircle size={16} color="#ff506e" />}
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {uploadStatus === 'uploading' && 'Importing assets...'}
                {uploadStatus === 'success' && 'Import complete'}
                {uploadStatus === 'error' && 'Import failed'}
              </span>
            </div>
          )}
        </div>
      </section>
    );
  }

  const isImage = openFile.relativePath.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i);
  const isAudio = openFile.relativePath.match(/\.(mp3|wav|ogg|m4a)$/i);

  if (isImage || isAudio) {
    const src = convertFileSrc(openFile.absolutePath);
    return (
      <section className="editor-panel" style={{ background: '#0b0912', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <TabBar />
        <div className="editor-toolbar" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="badge success" style={{ marginLeft: 'auto', background: 'rgba(68, 213, 144, 0.1)', color: 'var(--accent)', border: '1px solid rgba(68, 213, 144, 0.2)' }}>
            Media Asset
          </span>
        </div>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '60px', overflow: 'auto', background: 'radial-gradient(circle at center, #15111e 0%, #0b0912 100%)' }}>
          {isImage ? (
            <div className="asset-preview-container" style={{ position: 'relative', animation: 'fade-enter 0.5s ease' }}>
              <img
                src={src}
                alt={openFile.relativePath.split('/').pop()}
                style={{ borderRadius: '20px', maxWidth: '100%', maxHeight: '70vh', height: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}
              />
              <div style={{ position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                <span className="muted" style={{ fontSize: '11px', background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                  Visual Asset · {openFile.relativePath.split('.').pop()?.toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '80px 60px', borderRadius: '40px', border: '1px solid var(--border)', width: '100%', maxWidth: '560px', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', animation: 'fade-enter 0.5s ease' }}>
              <div style={{ width: '120px', height: '120px', background: 'rgba(247, 161, 196, 0.05)', borderRadius: '60px', display: 'grid', placeItems: 'center', margin: '0 auto 32px auto', border: '1px solid rgba(247, 161, 196, 0.1)' }}>
                <FileCode2 size={56} color="var(--primary)" style={{ opacity: 0.8 }} />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>{openFile.relativePath.split('/').pop()}</h3>
              <p className="muted" style={{ marginBottom: '40px' }}>Audio Asset</p>
              <audio
                controls
                src={src}
                style={{ width: '100%', height: '44px', borderRadius: '22px' }}
              />
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`editor-panel ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {isDragging && (
        <div style={{ position: 'absolute', inset: '0', zIndex: 100, background: 'rgba(9, 7, 16, 0.85)', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', border: '2px dashed var(--primary)', animation: 'fade-enter 0.2s ease' }}>
          <div style={{ textAlign: 'center' }}>
            <UploadCloud size={64} color="var(--primary)" className="animate-bounce" />
            <p style={{ marginTop: '20px', fontSize: '20px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Drop to Import Assets</p>
            <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Files will be added to your project directory</p>
          </div>
        </div>
      )}
      <TabBar />
      <div className="editor-toolbar" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 20px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: openFile.dirty ? 'rgba(247, 161, 196, 0.1)' : 'rgba(68, 213, 144, 0.1)', color: openFile.dirty ? 'var(--primary)' : 'var(--accent)', border: '1px solid currentColor', opacity: 0.8 }}>
          {openFile.dirty ? '• Unsaved' : '✓ Saved'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <button className="icon-button" disabled={inlineBusy} title="Explain selection" onClick={() => void runInlineAction('explain')}><MessageSquareText size={13} /></button>
          <button className="icon-button" disabled={inlineBusy} title="Fix selection" onClick={() => void runInlineAction('fix')}><Wand2 size={13} /></button>
          <button className="icon-button" disabled={inlineBusy} title="Rewrite selection" onClick={() => void runInlineAction('rewrite')}><Sparkles size={13} /></button>
          <button className="icon-button" disabled={inlineBusy} title="Generate tests" onClick={() => void runInlineAction('tests')}><TestTube2 size={13} /></button>
          <button className={autocompleteEnabled ? 'primary' : 'secondary'} title="Toggle ghost-text autocomplete" onClick={() => setAutocompleteEnabled((enabled) => !enabled)}>
            Ghost
          </button>
        </div>
        <button
          onClick={save}
          disabled={!openFile.dirty}
          title="Save (Ctrl+S)"
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: openFile.dirty ? 1 : 0.5,
            background: openFile.dirty ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.05)',
            color: openFile.dirty ? '#fff' : 'var(--text-muted)',
            boxShadow: openFile.dirty ? '0 8px 20px rgba(247, 161, 196, 0.2)' : 'none'
          }}
        >
          <Save size={14} style={{ marginRight: '6px' }} /> Save
        </button>
      </div>
      {(inlineBusy || inlineSuggestion) && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={13} color="var(--primary)" />
            <strong style={{ fontSize: '11px' }}>{inlineBusy ? 'Sakura is preparing an inline edit' : 'Inline suggestion'}</strong>
            {inlineSuggestion && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                <button className="secondary" onClick={() => setInlineSuggestion('')}>Reject</button>
                <button className="primary" onClick={acceptInlineSuggestion}>Accept</button>
              </div>
            )}
          </div>
          {inlineSuggestion && <pre style={{ maxHeight: '120px', overflow: 'auto', margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap' }}>{inlineSuggestion}</pre>}
        </div>
      )}
      <Editor
        key={openFile.relativePath}
        height="100%"
        language={openFile.language}
        value={openFile.content}
        theme="vs-dark"
        options={{
          minimap: { enabled: true, scale: 0.8, side: 'right' },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 22,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 20, bottom: 20 },
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          renderLineHighlight: 'all',
          roundedSelection: true,
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          tabSize: 2,
          formatOnPaste: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          folding: true,
          foldingHighlight: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'always',
          codeLens: true,
          stickyScroll: { enabled: true },
          breadcrumbs: { enabled: true },
        } as any}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;
          registerInlineCompletionProvider(monaco, openFile.language);
          editor.focus();
        }}
        onChange={(value) => updateOpenFileContent(value ?? '')}
      />
    </section>
  );
}
