import Editor from '@monaco-editor/react';
import { Save } from 'lucide-react';
import { writeProjectFile } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';

export function EditorPane() {
  const { project, openFile, updateOpenFileContent, markOpenFileSaved, setStatus } = useSakuraStore();

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
      setStatus((error as Error).message);
    }
  };

  if (!openFile) {
    return (
      <section className="editor-empty">
        <h2>Open a file or generate project docs</h2>
        <p>Select a file from the tree, use Context Builder, or ask the agent to create a plan.</p>
      </section>
    );
  }

  return (
    <section className="editor-panel">
      <div className="editor-toolbar">
        <strong>{openFile.relativePath}</strong>
        <span>{openFile.dirty ? 'Unsaved changes' : 'Saved'}</span>
        <button onClick={save}><Save size={15} /> Save with checkpoint</button>
      </div>
      <Editor
        height="100%"
        language={openFile.language}
        value={openFile.content}
        theme="vs-dark"
        options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', scrollBeyondLastLine: false }}
        onChange={(value) => updateOpenFileContent(value ?? '')}
      />
    </section>
  );
}
