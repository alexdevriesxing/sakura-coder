import { useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  Brain,
  Bug,
  CheckCircle2,
  GitBranch,
  History,
  Network,
  PlaySquare,
  RefreshCw,
  Search,
  ServerCog,
  Trash2,
} from 'lucide-react';
import {
  buildSemanticIndex,
  createBackgroundJob,
  deleteMemory,
  getDiagnostics,
  gitCommit,
  gitDiff,
  gitStatus,
  listBackgroundJobs,
  listCheckpoints,
  listMcpServers,
  listMemories,
  listRules,
  querySemanticIndex,
  restoreCheckpoint,
  runPreviewCheck,
  saveMcpServers,
  saveMemory,
  updateBackgroundJob,
} from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { Modal } from './Modal';
import type {
  BackgroundJob,
  Diagnostic,
  GitStatus,
  McpServer,
  Memory,
  PreviewSession,
  Rule,
  SemanticSearchResult,
} from '../types/sakura';

type Tab = 'problems' | 'index' | 'git' | 'rules' | 'mcp' | 'preview' | 'jobs' | 'checkpoints';

const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: 'problems', label: 'Problems', icon: <Bug size={12} /> },
  { id: 'index', label: 'Index', icon: <Search size={12} /> },
  { id: 'git', label: 'Git', icon: <GitBranch size={12} /> },
  { id: 'rules', label: 'Rules', icon: <Brain size={12} /> },
  { id: 'mcp', label: 'MCP', icon: <ServerCog size={12} /> },
  { id: 'preview', label: 'Preview', icon: <PlaySquare size={12} /> },
  { id: 'jobs', label: 'Jobs', icon: <Activity size={12} /> },
  { id: 'checkpoints', label: 'Revert', icon: <History size={12} /> },
];

function trim(text: string, max = 1_200) {
  return text.length > max ? `${text.slice(0, max)}\n[truncated]` : text;
}

export function IntelligencePanel() {
  const { project, addToMessageQueue, setStatus, setCheckpoints } = useSakuraStore();
  const [tab, setTab] = useState<Tab>('problems');
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [indexQuery, setIndexQuery] = useState('');
  const [indexResults, setIndexResults] = useState<SemanticSearchResult[]>([]);
  const [git, setGit] = useState<GitStatus | null>(null);
  const [diff, setDiff] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [preview, setPreview] = useState<PreviewSession | null>(null);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [jobDraft, setJobDraft] = useState('');
  const [checkpointList, setCheckpointList] = useState<string[]>([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [commitModal, setCommitModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [restoreModal, setRestoreModal] = useState<{ open: boolean; checkpoint: string }>({ open: false, checkpoint: '' });

  const rootPath = project?.rootPath;

  const prDraft = useMemo(() => {
    if (!git) return '';
    return [
      '## Summary',
      git.files.slice(0, 12).map((file) => `- ${file.status || 'M'} ${file.path}`).join('\n') || '- No file changes detected.',
      '',
      '## Validation',
      diagnostics.length > 0 ? `- ${diagnostics.length} diagnostic item(s) still need review.` : '- Diagnostics panel has no parsed errors.',
      '',
      '## Review Checklist',
      '- [ ] Review generated diffs',
      '- [ ] Run typecheck/tests/lint',
      '- [ ] Inspect visual preview',
    ].join('\n');
  }, [diagnostics.length, git]);

  const refresh = async () => {
    if (!rootPath) return;
    setLoading(true);
    try {
      const [nextGit, nextCheckpoints, nextRules, nextMemories, nextMcp, nextJobs] = await Promise.all([
        gitStatus(rootPath).catch(() => null),
        listCheckpoints(rootPath).catch(() => []),
        listRules(rootPath).catch(() => []),
        listMemories(rootPath).catch(() => []),
        listMcpServers(rootPath).catch(() => []),
        listBackgroundJobs(rootPath).catch(() => []),
      ]);
      setGit(nextGit);
      setCheckpointList(nextCheckpoints);
      setCheckpoints(nextCheckpoints);
      setRules(nextRules);
      setMemories(nextMemories);
      setMcpServers(nextMcp);
      setJobs(nextJobs);
      if (nextGit) {
        setCommitMessage(`Update ${nextGit.files.slice(0, 3).map((file) => file.path.split('/').pop()).join(', ') || 'project'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [rootPath]);

  const runDiagnostics = async () => {
    if (!rootPath) return;
    setLoading(true);
    try {
      const next = await getDiagnostics(rootPath);
      setDiagnostics(next);
      setStatus(next.length ? `${next.length} diagnostic item(s) found.` : 'Diagnostics are clean.');
    } catch (error) {
      setStatus(`Diagnostics failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderProblems = () => (
    <div className="intelligence-body">
      <div className="row-actions">
        <button className="secondary" onClick={runDiagnostics}><RefreshCw size={12} /> Run</button>
        <button className="secondary" disabled={!diagnostics.length} onClick={() => addToMessageQueue(`Fix all visible diagnostics:\n${JSON.stringify(diagnostics.slice(0, 20), null, 2)}`)}>
          Fix Visible
        </button>
      </div>
      {diagnostics.length === 0 ? (
        <p className="muted">No diagnostics loaded.</p>
      ) : diagnostics.slice(0, 12).map((item, index) => (
        <div key={`${item.message}-${index}`} className="intel-row">
          <strong>{item.severity} · {item.source}</strong>
          <p>{item.message}</p>
          <button className="secondary" onClick={() => addToMessageQueue(`Help me fix this diagnostic:\n${JSON.stringify(item, null, 2)}`)}>Send to Sakura</button>
        </div>
      ))}
    </div>
  );

  const renderIndex = () => (
    <div className="intelligence-body">
      <div className="row-actions">
        <button className="secondary" disabled={!rootPath || loading} onClick={async () => {
          if (!rootPath) return;
          const entries = await buildSemanticIndex(rootPath);
          setStatus(`Indexed ${entries.length} source file(s).`);
        }}><Brain size={12} /> Build</button>
      </div>
      <div className="inline-search">
        <input value={indexQuery} onChange={(event) => setIndexQuery(event.target.value)} placeholder="Search symbols, imports, files" />
        <button onClick={async () => {
          if (!rootPath || !indexQuery.trim()) return;
          setIndexResults(await querySemanticIndex(rootPath, indexQuery));
        }}><Search size={12} /></button>
      </div>
      {indexResults.map((result) => (
        <div key={result.relativePath} className="intel-row">
          <strong>{result.relativePath} · {result.score}</strong>
          <p>{result.symbols.slice(0, 8).join(', ') || trim(result.preview, 180)}</p>
        </div>
      ))}
    </div>
  );

  const renderGit = () => (
    <div className="intelligence-body">
      <div className="row-actions">
        <button className="secondary" onClick={refresh}><RefreshCw size={12} /> Refresh</button>
        <button className="secondary" disabled={!rootPath} onClick={async () => rootPath && setDiff(trim(await gitDiff(rootPath), 5_000))}>Diff</button>
      </div>
      <p className="muted">Branch: {git?.branch || 'unknown'} · {git?.clean ? 'clean' : `${git?.files.length ?? 0} changed`}</p>
      <div className="row-actions">
        <input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} placeholder="Commit message" />
        <button className="secondary" disabled={!rootPath || !commitMessage.trim()} onClick={() => setCommitModal({ open: true, message: commitMessage })} aria-label="Commit changes"><CheckCircle2 size={12} /> Commit</button>
      </div>
      <pre>{trim(prDraft, 1_500)}</pre>
      {diff && <pre>{diff}</pre>}
    </div>
  );

  const renderRules = () => (
    <div className="intelligence-body">
      <div className="row-actions">
        <input value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} placeholder="Capture project memory" />
        <button className="secondary" disabled={!rootPath || !memoryDraft.trim()} onClick={async () => {
          if (!rootPath) return;
          await saveMemory(rootPath, memoryDraft, 'manual');
          setMemoryDraft('');
          setMemories(await listMemories(rootPath));
        }}>Save</button>
      </div>
      <strong>Rules</strong>
      {rules.slice(0, 5).map((rule) => (
        <div key={rule.id} className="intel-row">
          <strong>{rule.relativePath}</strong>
          <p>{trim(rule.content, 240)}</p>
        </div>
      ))}
      <strong>Memories</strong>
      {memories.map((memory) => (
        <div key={memory.id} className="intel-row">
          <p>{memory.content}</p>
          <button className="icon-button" title="Delete memory" onClick={async () => {
            if (!rootPath) return;
            setMemories(await deleteMemory(rootPath, memory.id));
          }}><Trash2 size={12} /></button>
        </div>
      ))}
    </div>
  );

  const renderMcp = () => (
    <div className="intelligence-body">
      <div className="row-actions">
        <button className="secondary" disabled={!rootPath} onClick={async () => {
          if (!rootPath) return;
          const next = [...mcpServers, { id: `local-${Date.now()}`, name: 'Local MCP', command: '', args: [], enabled: false, approvalMode: 'prompt' }];
          setMcpServers(await saveMcpServers(rootPath, next));
        }}>Add</button>
        <button className="secondary" disabled={!rootPath} onClick={async () => rootPath && setMcpServers(await listMcpServers(rootPath))}><RefreshCw size={12} /> Reload</button>
      </div>
      {mcpServers.length === 0 ? <p className="muted">No .sakura/mcp.json servers configured.</p> : mcpServers.map((server) => (
        <div key={server.id} className="intel-row">
          <strong>{server.name || server.id}</strong>
          <p>{server.command || 'No command set'} {server.args.join(' ')}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={server.enabled} onChange={async (event) => {
              if (!rootPath) return;
              const next = mcpServers.map((item) => item.id === server.id ? { ...item, enabled: event.target.checked } : item);
              setMcpServers(await saveMcpServers(rootPath, next));
            }} />
            Enabled
          </label>
        </div>
      ))}
    </div>
  );

  const renderPreview = () => (
    <div className="intelligence-body">
      <button className="secondary" disabled={!rootPath} onClick={async () => rootPath && setPreview(await runPreviewCheck(rootPath))}>
        <Network size={12} /> Inspect Preview
      </button>
      {preview && (
        <div className="intel-row">
          <strong>{preview.status}</strong>
          {preview.url && <p>{preview.url}</p>}
          {preview.notes.map((note) => <p key={note}>{note}</p>)}
          <button className="secondary" onClick={() => addToMessageQueue(`Use the preview session to debug the app:\n${JSON.stringify(preview, null, 2)}`)}>Send to Sakura</button>
        </div>
      )}
    </div>
  );

  const renderJobs = () => (
    <div className="intelligence-body">
      <div className="row-actions">
        <input value={jobDraft} onChange={(event) => setJobDraft(event.target.value)} placeholder="Long-running job goal" />
        <button className="secondary" disabled={!rootPath || !jobDraft.trim()} onClick={async () => {
          if (!rootPath) return;
          await createBackgroundJob(rootPath, jobDraft);
          setJobDraft('');
          setJobs(await listBackgroundJobs(rootPath));
        }}>Queue</button>
      </div>
      {jobs.map((job) => (
        <div key={job.id} className="intel-row">
          <strong>{job.status} · {job.goal}</strong>
          <p>{job.log.slice(-2).join('\n')}</p>
          <button className="secondary" disabled={!rootPath || job.status === 'cancelled'} onClick={async () => {
            if (!rootPath) return;
            await updateBackgroundJob({ rootPath, jobId: job.id, status: 'cancelled', logEntry: 'Cancelled from UI.' });
            setJobs(await listBackgroundJobs(rootPath));
          }}>Cancel</button>
        </div>
      ))}
    </div>
  );

  const renderCheckpoints = () => (
    <div className="intelligence-body">
      <button className="secondary" onClick={refresh}><RefreshCw size={12} /> Refresh</button>
      {checkpointList.map((checkpoint) => (
        <div key={checkpoint} className="intel-row">
          <strong>{checkpoint}</strong>
          <button className="secondary" disabled={!rootPath} onClick={() => setRestoreModal({ open: true, checkpoint })} aria-label="Restore checkpoint">Restore</button>
        </div>
      ))}
    </div>
  );

  const body = {
    problems: renderProblems,
    index: renderIndex,
    git: renderGit,
    rules: renderRules,
    mcp: renderMcp,
    preview: renderPreview,
    jobs: renderJobs,
    checkpoints: renderCheckpoints,
  }[tab]();

  return (
    <section className="panel intelligence-panel">
      <div className="panel-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={14} /> Agentic Core</span>
        <button className="icon-button" disabled={loading} onClick={refresh} title="Refresh agentic core state"><RefreshCw size={13} /></button>
      </div>
      <div className="intel-tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)} title={item.label}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </div>
      {body}

      <Modal
        isOpen={commitModal.open}
        onClose={() => setCommitModal({ open: false, message: '' })}
        onConfirm={async () => {
          if (!rootPath) return;
          setStatus(await gitCommit({ rootPath, message: commitModal.message, userApproved: true }));
          setCommitModal({ open: false, message: '' });
          await refresh();
        }}
        title="Commit Changes"
        variant="default"
        confirmLabel="Commit"
      >
        <p>Commit all current changes with message:</p>
        <code style={{ display: 'block', marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>{commitModal.message}</code>
      </Modal>

      <Modal
        isOpen={restoreModal.open}
        onClose={() => setRestoreModal({ open: false, checkpoint: '' })}
        onConfirm={async () => {
          if (!rootPath) return;
          const guard = await restoreCheckpoint(rootPath, restoreModal.checkpoint);
          setStatus(`Restored ${restoreModal.checkpoint}. Guard checkpoint: ${guard}`);
          setRestoreModal({ open: false, checkpoint: '' });
          await refresh();
        }}
        title="Restore Checkpoint"
        variant="danger"
        confirmLabel="Restore"
      >
        <p>Restore checkpoint <strong>{restoreModal.checkpoint}</strong>?</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>A guard checkpoint will be created first so you can undo this restore.</p>
      </Modal>
    </section>
  );
}
