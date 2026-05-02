import { useMemo, useState } from 'react';
import { FolderPlus, Rocket } from 'lucide-react';
import { createProject, loadProject, listProjectTree } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { WORKFLOW_REGISTRY, getWorkflowIds } from '../workflows';
import type { SakuraProjectTemplate, WorkflowId, WorkflowProfile } from '../types/sakura';

const templates: Array<{ id: SakuraProjectTemplate; label: string; description: string }> = [
  { id: 'blank', label: 'Blank Sakura Project', description: 'Docs, AGENTS.md, .sakura memory and safe workflows only.' },
  { id: 'cloudflare-worker', label: 'Cloudflare Worker', description: 'Worker API scaffold for Qwen/Flux service wrappers.' },
  { id: 'cloudflare-pages-react', label: 'Cloudflare Pages React', description: 'React/Vite starter with Pages deployment docs.' },
  { id: 'phaser-game', label: 'Phaser Game', description: 'Browser game planning, GDD and asset pipeline scaffold.' },
  { id: 'phaser-asset-heavy-game', label: 'Asset-heavy Phaser Game', description: 'GDD, asset bible, prompt packs and generated assets folders.' },
  { id: 'content-website', label: 'Content Website', description: 'SEO/GAIO docs, article structure and publishing workflow.' },
  { id: 'investor-crm', label: 'Investor CRM', description: 'CRM PRD, database model and compliance guardrails.' },
  { id: 'fmcg-database', label: 'FMCG Database', description: 'Industry database SaaS scaffold.' },
  { id: 'nextjs-saas', label: 'Next.js SaaS', description: 'SaaS PRD, auth, roles and deployment notes.' },
  { id: 'retro-c64', label: 'Retro C64 (cc65)', description: 'Commodore 64 project with C compiler and SID audio assets.' },
  { id: 'retro-amiga', label: 'Retro Amiga (VBCC)', description: 'Amiga OCS/ECS project with C, Copper, and Paula audio.' },
];

export function ProjectLauncher() {
  const [rootPath, setRootPath] = useState('C:/Projects/sakura-demo');
  const [projectName, setProjectName] = useState('Sakura Demo Project');
  const [template, setTemplate] = useState<SakuraProjectTemplate>('blank');
  const [workflowId, setWorkflowId] = useState<WorkflowId>('general-coding');
  const [busy, setBusy] = useState(false);
  const { setProject, setFileTree, setStatus, setWorkflow } = useSakuraStore();

  const selected = useMemo(() => templates.find((item) => item.id === template), [template]);
  const selectedWorkflow = useMemo(() => WORKFLOW_REGISTRY[workflowId], [workflowId]);
  const workflowIds = useMemo(() => getWorkflowIds(), []);

  const create = async () => {
    setBusy(true);
    try {
      const project = await createProject({ rootPath, name: projectName, template, workflowId });
      const tree = await listProjectTree(project.rootPath);
      setProject(project);
      setFileTree(tree);
      setWorkflow(workflowId, WORKFLOW_REGISTRY[workflowId]);
      setStatus(`Created ${project.name} with ${workflowId} workflow`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    setBusy(true);
    try {
      const project = await loadProject(rootPath);
      const tree = await listProjectTree(project.rootPath);
      setProject(project);
      setFileTree(tree);
      setStatus(`Loaded ${project.name}`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="launcher">
      <section className="launcher-card hero-card">
        <div className="hero-badge">Local-first · Guardrailed · Asset-aware</div>
        <h1>Sakura Coder</h1>
        <p>
          Create a safe AI-assisted project workspace with Markdown plans, Qwen Coder integration,
          Flux asset generation, checkpoints, diff approval and strict mode permissions.
        </p>
      </section>

      <section className="launcher-card setup-card">
        <label>
          Project root path
          <input value={rootPath} onChange={(event) => setRootPath(event.target.value)} />
        </label>
        <label>
          Project name
          <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
        </label>
        <label>
          Template
          <select value={template} onChange={(event) => setTemplate(event.target.value as SakuraProjectTemplate)}>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          Workflow Profile
          <select value={workflowId} onChange={(event) => setWorkflowId(event.target.value as WorkflowId)}>
            {workflowIds.map((id) => (
              <option key={id} value={id}>{WORKFLOW_REGISTRY[id].displayName}</option>
            ))}
          </select>
        </label>
        <p className="muted">{selected?.description}</p>
        <p className="muted">{selectedWorkflow?.description}</p>
        <div className="button-row">
          <button onClick={create} disabled={busy}><FolderPlus size={16} /> Create Project</button>
          <button className="secondary" onClick={open} disabled={busy}><Rocket size={16} /> Open Existing</button>
        </div>
        <p className="small-warning">
          Browser preview cannot call Tauri commands. Run <code>npm run tauri:dev</code> for full functionality.
        </p>
      </section>
    </main>
  );
}
