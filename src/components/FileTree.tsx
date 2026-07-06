import { useState } from 'react';
import {
  Folder, FolderOpen, File, ChevronRight, ChevronDown,
  RefreshCw, Plus, Trash2, FilePlus, FolderPlus, Scissors, Copy, ClipboardPaste
} from 'lucide-react';
import {
  listProjectTree, readProjectFile, deleteProjectFile,
  createProjectDirectory, writeProjectFile
} from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { Modal } from './Modal';
import { useContextMenu } from './ContextMenu';
import { Skeleton } from './Skeleton';
import type { FileNode } from '../types/sakura';

function TreeNode({ node, onOpen, depth = 0 }: { node: FileNode; onOpen: (node: FileNode) => void; depth?: number }) {
  const { project, openFile, setFileTree, setStatus } = useSakuraStore();
  const { show: showCtxMenu } = useContextMenu();
  const [isOpen, setIsOpen] = useState(depth < 1);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [newNameValue, setNewNameValue] = useState('');

  const handleDeleteConfirm = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProjectFile({ rootPath: project.rootPath, relativePath: node.relativePath });
      const tree = await listProjectTree(project.rootPath);
      setFileTree(tree);
      setStatus(`Deleted ${node.name}`);
      setShowDeleteModal(false);
    } catch (error) {
      setStatus(`Delete failed: ${(error as Error).message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFile = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!project) return;
    if (!newNameValue) {
      setShowNewFileModal(true);
      return;
    }
    try {
      const relPath = node.kind === 'directory' ? `${node.relativePath}/${newNameValue}` : `${node.relativePath.split('/').slice(0, -1).join('/')}/${newNameValue}`;
      await writeProjectFile({ rootPath: project.rootPath, relativePath: relPath, content: '', createCheckpoint: false });
      const tree = await listProjectTree(project.rootPath);
      setFileTree(tree);
      setStatus(`Created file ${newNameValue}`);
      setShowNewFileModal(false);
      setNewNameValue('');
    } catch (error) {
      setStatus(`Creation failed: ${(error as Error).message}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!project || !newNameValue) return;
    try {
      const relPath = node.kind === 'directory' ? `${node.relativePath}/${newNameValue}` : `${node.relativePath.split('/').slice(0, -1).join('/')}/${newNameValue}`;
      await createProjectDirectory({ rootPath: project.rootPath, relativePath: relPath });
      const tree = await listProjectTree(project.rootPath);
      setFileTree(tree);
      setStatus(`Created folder ${newNameValue}`);
      setShowNewFolderModal(false);
      setNewNameValue('');
    } catch (error) {
      setStatus(`Creation failed: ${(error as Error).message}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const isDir = node.kind === 'directory';
    showCtxMenu([
      {
        id: 'new-file',
        label: 'New File',
        icon: <FilePlus size={14} />,
        shortcut: 'Alt+N',
        action: () => setShowNewFileModal(true),
      },
      ...(isDir ? [{
        id: 'new-folder',
        label: 'New Folder',
        icon: <FolderPlus size={14} />,
        shortcut: 'Alt+F',
        action: () => setShowNewFolderModal(true),
      }] : []),
      { id: 'sep1', label: '', icon: undefined, separator: true, action: () => {} },
      {
        id: 'rename',
        label: 'Rename',
        icon: <Scissors size={14} />,
        action: () => {
          setRenameValue(node.name);
          setShowRenameModal(true);
        },
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: <Trash2 size={14} />,
        danger: true,
        action: () => setShowDeleteModal(true),
      },
    ], e.clientX, e.clientY, node.relativePath);
  };

  const handleRenameConfirm = async () => {
    if (!project || !renameValue) return;
    try {
      const parent = node.relativePath.split('/').slice(0, -1).join('/');
      const newRelPath = parent ? `${parent}/${renameValue}` : renameValue;
      const content = await readProjectFile(project.rootPath, node.relativePath);
      await writeProjectFile({ rootPath: project.rootPath, relativePath: newRelPath, content, createCheckpoint: false });
      await deleteProjectFile({ rootPath: project.rootPath, relativePath: node.relativePath });
      const tree = await listProjectTree(project.rootPath);
      setFileTree(tree);
      setStatus(`Renamed to ${renameValue}`);
      setShowRenameModal(false);
    } catch (error) {
      setStatus(`Rename failed: ${(error as Error).message}`);
    }
  };

  return (
    <>
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteConfirm} title="Delete" variant="danger" confirmLabel="Delete" loading={deleting}>
        <p>Are you sure you want to delete <strong>{node.name}</strong>?</p>
      </Modal>

      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} onConfirm={handleRenameConfirm} title="Rename" confirmLabel="Rename">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>New name</label>
          <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
        </div>
      </Modal>

      <Modal isOpen={showNewFileModal} onClose={() => { setShowNewFileModal(false); setNewNameValue(''); }} onConfirm={handleCreateFile} title="New File" confirmLabel="Create">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>File name in {node.kind === 'directory' ? node.name : node.relativePath.split('/').slice(0, -1).join('/') || 'root'}</label>
          <input value={newNameValue} onChange={(e) => setNewNameValue(e.target.value)} autoFocus placeholder="file.ts" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); }} />
        </div>
      </Modal>

      <Modal isOpen={showNewFolderModal} onClose={() => { setShowNewFolderModal(false); setNewNameValue(''); }} onConfirm={handleCreateFolder} title="New Folder" confirmLabel="Create">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Folder name</label>
          <input value={newNameValue} onChange={(e) => setNewNameValue(e.target.value)} autoFocus placeholder="my-folder" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }} />
        </div>
      </Modal>

      {node.kind === 'directory' ? (
        <DirectoryNode
          node={node}
          depth={depth}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          showActions={showActions}
          setShowActions={setShowActions}
          onOpen={onOpen}
          handleCreateFile={() => setShowNewFileModal(true)}
          handleDelete={() => setShowDeleteModal(true)}
          onContextMenu={handleContextMenu}
        />
      ) : (
        <FileNodeItem
          node={node}
          depth={depth}
          isActive={openFile?.relativePath === node.relativePath}
          showActions={showActions}
          setShowActions={setShowActions}
          onOpen={onOpen}
          handleDelete={() => setShowDeleteModal(true)}
          onContextMenu={handleContextMenu}
        />
      )}
    </>
  );
}

function DirectoryNode({ node, depth, isOpen, setIsOpen, showActions, setShowActions, onOpen, handleCreateFile, handleDelete, onContextMenu }: {
  node: FileNode; depth: number; isOpen: boolean; setIsOpen: (v: boolean) => void;
  showActions: boolean; setShowActions: (v: boolean) => void;
  onOpen: (n: FileNode) => void; handleCreateFile: () => void; handleDelete: () => void; onContextMenu: (e: React.MouseEvent) => void;
}) {
  const sortedChildren = [...(node.children || [])].sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });

  return (
    <div className="tree-dir" onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)} onContextMenu={onContextMenu}>
      <div
        className="tree-row"
        onClick={() => setIsOpen(!isOpen)}
        style={{ paddingLeft: `${depth * 12 + 4}px`, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', transition: 'background 0.2s' }}
      >
        {isOpen ? <ChevronDown size={14} className="tree-chevron" /> : <ChevronRight size={14} className="tree-chevron" />}
        {isOpen ? <FolderOpen size={14} className="tree-icon" /> : <Folder size={14} className="tree-icon" />}
        <span className="tree-name" style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{node.name}</span>

        {showActions && (
          <div className="tree-actions" style={{ display: 'flex', gap: '4px' }}>
            <button className="icon-button small" title="New File" onClick={(e) => { e.stopPropagation(); handleCreateFile(); }} aria-label="New file" style={{ padding: '2px' }}><FilePlus size={12} /></button>
            <button className="icon-button small danger" title="Delete Folder" onClick={(e) => { e.stopPropagation(); handleDelete(); }} aria-label="Delete folder" style={{ padding: '2px' }}><Trash2 size={12} /></button>
          </div>
        )}
      </div>
      {isOpen && (
        <div className="tree-children">
          {sortedChildren.length === 0 && <span className="muted" style={{ paddingLeft: `${depth * 12 + 24}px`, fontSize: '11px' }}>Empty folder</span>}
          {sortedChildren.map((child) => (
            <TreeNode key={child.path} node={child} onOpen={onOpen} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileNodeItem({ node, depth, isActive, showActions, setShowActions, onOpen, handleDelete, onContextMenu }: {
  node: FileNode; depth: number; isActive: boolean;
  showActions: boolean; setShowActions: (v: boolean) => void;
  onOpen: (n: FileNode) => void; handleDelete: () => void; onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={`tree-file ${isActive ? 'active' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onOpen(node)}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(node); }}
      aria-label={`Open ${node.name}`}
      style={{
        paddingLeft: `${depth * 12 + 24}px`,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '6px 8px',
        borderRadius: '8px',
        background: isActive ? 'rgba(247, 161, 196, 0.1)' : 'transparent',
        color: isActive ? 'var(--primary)' : 'inherit',
        transition: 'all 0.2s'
      }}
    >
      <File size={14} className="tree-icon" />
      <span className="tree-name" style={{ flex: 1, fontSize: '13px' }}>{node.name}</span>
      {showActions && (
        <button className="icon-button small danger" title="Delete File" onClick={(e) => { e.stopPropagation(); handleDelete(); }} aria-label="Delete file" style={{ padding: '2px' }}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

export function FileTree() {
  const { project, fileTree, setFileTree, openFileContent, setStatus } = useSakuraStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = async () => {
    if (!project) return;
    setRefreshing(true);
    try {
      setFileTree(await listProjectTree(project.rootPath));
    } catch (error) {
      setStatus(`Refresh failed: ${(error as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const open = async (node: FileNode) => {
    if (!project || node.kind !== 'file') return;
    try {
      const content = await readProjectFile(project.rootPath, node.relativePath);
      openFileContent({ absolutePath: node.path, relativePath: node.relativePath, content });
      setStatus(`Opened ${node.relativePath}`);
    } catch (error) {
      setStatus(`Failed to open ${node.name}: ${(error as Error).message}`);
    }
  };

  const handleCreateRootFile = async () => {
    if (!project || !newName) return;
    try {
      await writeProjectFile({ rootPath: project.rootPath, relativePath: newName, content: '', createCheckpoint: false });
      await refresh();
      setStatus(`Created file ${newName}`);
      setShowNewFile(false);
      setNewName('');
    } catch (error) {
      setStatus(`Creation failed: ${(error as Error).message}`);
    }
  };

  const handleCreateRootDir = async () => {
    if (!project || !newName) return;
    try {
      await createProjectDirectory({ rootPath: project.rootPath, relativePath: newName });
      await refresh();
      setStatus(`Created folder ${newName}`);
      setShowNewFolder(false);
      setNewName('');
    } catch (error) {
      setStatus(`Creation failed: ${(error as Error).message}`);
    }
  };

  const sortedTree = [...fileTree].sort((a, b) => {
    if (a.kind === b.kind) return a.name.localeCompare(b.name);
    return a.kind === 'directory' ? -1 : 1;
  });

  return (
    <section className="panel file-tree-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <Modal isOpen={showNewFile} onClose={() => { setShowNewFile(false); setNewName(''); }} onConfirm={handleCreateRootFile} title="New File" confirmLabel="Create">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>File name at root</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus placeholder="file.ts" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRootFile(); }} />
        </div>
      </Modal>
      <Modal isOpen={showNewFolder} onClose={() => { setShowNewFolder(false); setNewName(''); }} onConfirm={handleCreateRootDir} title="New Folder" confirmLabel="Create">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Folder name at root</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus placeholder="my-folder" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRootDir(); }} />
        </div>
      </Modal>
      <div className="panel-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Folder size={16} /> Files
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="icon-button" onClick={() => setShowNewFile(true)} title="New Root File" aria-label="New root file"><FilePlus size={14} /></button>
          <button className="icon-button" onClick={() => setShowNewFolder(true)} title="New Root Folder" aria-label="New root folder"><FolderPlus size={14} /></button>
          <button
            className={`icon-button ${refreshing ? 'animate-spin' : ''}`}
            onClick={refresh}
            disabled={refreshing}
            title="Refresh File Tree"
            aria-label="Refresh file tree"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      <div className="tree-root" style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
        {!project && <Skeleton count={6} />}
        {project && sortedTree.length === 0 && <p className="muted" style={{ padding: '10px' }}>No files found.</p>}
        {project && sortedTree.map((node) => <TreeNode key={node.path} node={node} onOpen={open} />)}
      </div>
    </section>
  );
}


