import { useState } from 'react';
import { FolderPlus, Rocket, RefreshCw } from 'lucide-react';
import { createProject, loadProject, listProjectTree } from '../lib/tauriApi';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useSakuraStore } from '../store/useSakuraStore';
import { WORKFLOW_REGISTRY } from '../workflows';
import type { SakuraProjectTemplate, WorkflowId } from '../types/sakura';

const templates: Array<{ id: SakuraProjectTemplate; label: string; description: string }> = [
  { id: 'blank', label: 'Blank Sakura Project', description: 'Docs, AGENTS.md, .sakura memory and safe workflows only.' },
  { id: 'cloudflare-worker', label: 'Cloudflare Worker', description: 'Worker API scaffold for Qwen/Flux service wrappers.' },
  { id: 'cloudflare-pages-react', label: 'Cloudflare Pages React', description: 'React/Vite starter with Pages deployment docs.' },
  { id: 'phaser-game', label: 'Phaser Game', description: 'Browser game planning, GDD and asset pipeline scaffold.' },
  { id: 'phaser-asset-heavy-game', label: 'Asset-heavy Phaser Game', description: 'GDD, asset bible, prompt packs and generated assets folders.' },
  { id: 'content-website', label: 'Content Website', description: 'SEO/GAIO docs, article structure and publishing workflow.' },
  { id: 'investor-crm', label: 'Investor CRM', description: 'CRM PRD, database model and compliance guardrails.' },
  { id: 'crm-application', label: 'CRM Application', description: 'General CRM SaaS application setup and database model.' },
  { id: 'nextjs-saas', label: 'Next.js SaaS', description: 'SaaS PRD, auth, roles and deployment notes.' },
  { id: 'python-scripting', label: 'Python Scripting', description: 'Data science, automation scripts, and visualization docs.' },
  { id: 'chrome-extension', label: 'Chrome Extension', description: 'Manifest v3 scaffold, background scripts and popup UI.' },
  { id: 'mobile-app-expo', label: 'Mobile App (Expo)', description: 'Cross-platform React Native starter with Expo workflow.' },
  { id: 'tauri-desktop-app', label: 'Tauri Desktop App', description: 'Rust-powered desktop IDE scaffold with React frontend.' },
  { id: 'portfolio-site', label: 'Premium Portfolio', description: 'High-end visual portfolio with asset studio integration.' },
  { id: 'shadcn-ui-library', label: 'UI Component Library', description: 'Design system docs, Tailwind config, and Shadcn components.' },
  { id: 'retro-c64', label: 'Retro C64 (cc65)', description: 'Commodore 64 project with C compiler and SID audio assets.' },
  { id: 'retro-amiga', label: 'Retro Amiga (VBCC)', description: 'Amiga OCS/ECS project with C, Copper, and Paula audio.' },
];

export function ProjectLauncher() {
  const [busy, setBusy] = useState(false);
  const { setProject, setFileTree, setStatus, setWorkflow } = useSakuraStore();

  const openProject = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false, title: 'Open Existing Project Folder' });
      if (!selected || typeof selected !== 'string') return;
      
      setBusy(true);
      const project = await loadProject(selected);
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

  const createFromTemplate = async (templateId: SakuraProjectTemplate) => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Select Destination Folder'
      });
      if (!selected || typeof selected !== 'string') return;
      
      const folderName = selected.split(/[/\\]/).pop() || 'New Project';
      
      // Map template to workflow
      let workflowId: WorkflowId = 'general-coding';
      if (templateId.includes('game')) workflowId = 'game-development';
      else if (templateId.includes('worker') || templateId === 'nextjs-saas') workflowId = 'ai-cloudflare';
      else if (templateId.includes('crm') || templateId.includes('site') || templateId.includes('library')) workflowId = 'website-webapp';
      else if (templateId.includes('app') || templateId.includes('extension')) workflowId = 'app-development';
      else if (templateId === 'python-scripting') workflowId = 'python-scripting' as any;
      else if (templateId.includes('retro')) workflowId = 'retro-game-dev';

      setBusy(true);
      const project = await createProject({ 
        rootPath: selected, 
        name: folderName, 
        template: templateId, 
        workflowId: workflowId
      });
      const tree = await listProjectTree(project.rootPath);
      setProject(project);
      setFileTree(tree);
      setWorkflow(workflowId, WORKFLOW_REGISTRY[workflowId]);
      setStatus(`Created ${project.name} (${workflowId})`);
    } catch (error) {
      setStatus(`Failed to create project: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="launcher" style={{ gridTemplateColumns: '1fr', maxWidth: '960px', margin: '0 auto', paddingTop: '60px', animation: 'fade-in 0.6s ease-out' }}>
      <section className="launcher-card hero-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <h1 className="fade-in" style={{ fontSize: '56px', marginBottom: '16px', letterSpacing: '-0.04em', fontWeight: 900, background: 'linear-gradient(to bottom, #fff, #f7a1c4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>What would you like to build?</h1>
        <p className="muted fade-in" style={{ fontSize: '19px', maxWidth: '640px', lineHeight: '1.6', animationDelay: '0.1s' }}>Select an existing workspace or pick a high-performance blueprint to get your project ready in seconds.</p>
      </section>

      <section style={{ margin: '48px 0 32px 0' }}>
        <button 
          className="primary fade-in" 
          onClick={openProject} 
          disabled={busy}
          title="Open any existing folder on your computer to start working"
          style={{ width: '100%', padding: '32px', fontSize: '22px', display: 'flex', justifyContent: 'center', background: 'linear-gradient(135deg, #f7a1c4, #7b4dff)', color: '#fff', fontWeight: '900', borderRadius: '24px', boxShadow: '0 16px 48px rgba(123, 77, 255, 0.3)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(255,255,255,0.1)', animationDelay: '0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 24px 60px rgba(123,77,255,0.45)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(123,77,255,0.3)'; }}
        >
          {busy ? <RefreshCw size={28} className="animate-spin" /> : <Rocket size={28} style={{ marginRight: '16px' }} />}
          {busy ? "INITIALIZING WORKSPACE..." : "OPEN LOCAL WORKSPACE"}
        </button>
      </section>

      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '24px', margin: '60px 0 40px 0', animationDelay: '0.3s' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border))' }}></div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8 }}>Project Blueprints</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, var(--border))' }}></div>
      </div>

      <div className="template-grid fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', animationDelay: '0.4s' }}>
        {templates.map((item) => (
          <button 
            key={item.id}
            className="secondary template-card"
            onClick={() => createFromTemplate(item.id)}
            disabled={busy}
            title={`Start a new project with the ${item.label} template`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '28px', textAlign: 'left', height: '100%', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(247,161,196,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(247, 161, 196, 0.1)', borderRadius: '10px' }}>
                <FolderPlus size={18} className="text-primary" />
              </div>
              <strong style={{ fontSize: '16px', color: '#fff', fontWeight: 800 }}>{item.label}</strong>
            </div>
            <p className="muted" style={{ fontSize: '13px', margin: 0, lineHeight: '1.6', opacity: 0.7 }}>{item.description}</p>
          </button>
        ))}
      </div>
      
      <p className="small-warning fade-in" style={{ textAlign: 'center', marginTop: '64px', opacity: 0.4, fontSize: '11px', letterSpacing: '0.02em', animationDelay: '0.5s' }}>
        Browser preview cannot call Tauri commands. Run <code>npm run tauri:dev</code> for full desktop functionality.
      </p>
    </main>
  );
}
