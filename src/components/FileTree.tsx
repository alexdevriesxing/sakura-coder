import { File, Folder, RefreshCw } from 'lucide-react';
import { listProjectTree, readProjectFile } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import type { FileNode } from '../types/sakura';

function TreeNode({ node, onOpen }: { node: FileNode; onOpen: (node: FileNode) => void }) {
  if (node.kind === 'directory') {
    return (
      <details open className="tree-dir">
        <summary><Folder size={14} /> {node.name}</summary>
        <div className="tree-children">
          {node.children?.map((child) => <TreeNode key={child.path} node={child} onOpen={onOpen} />)}
        </div>
      </details>
    );
  }

  return (
    <button className="tree-file" onClick={() => onOpen(node)}>
      <File size={14} /> {node.name}
    </button>
  );
}

export function FileTree() {
  const { project, fileTree, setFileTree, openFileContent, setStatus } = useSakuraStore();

  const refresh = async () => {
    if (!project) return;
    try {
      setFileTree(await listProjectTree(project.rootPath));
      setStatus('File tree refreshed.');
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const open = async (node: FileNode) => {
    if (!project || node.kind !== 'file') return;
    try {
      const content = await readProjectFile(project.rootPath, node.relativePath);
      openFileContent({ absolutePath: node.path, relativePath: node.relativePath, content });
      setStatus(`Opened ${node.relativePath}`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <section className="panel file-tree-panel">
      <div className="panel-title">
        <span>Files</span>
        <button className="icon-button" onClick={refresh}><RefreshCw size={14} /></button>
      </div>
      <div className="tree-root">
        {fileTree.map((node) => <TreeNode key={node.path} node={node} onOpen={open} />)}
      </div>
    </section>
  );
}
