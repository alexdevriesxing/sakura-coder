import { useState } from 'react';
import { Terminal, Package, GitBranch, X, Copy, Check } from 'lucide-react';
import { WORKFLOW_REGISTRY } from '../workflows';
import type { StarterTemplate, WorkflowId } from '../types/sakura';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="tooltip-wrapper">
      {children}
      <div className="tooltip-content">{content}</div>
    </div>
  );
}

interface TemplateCardProps {
  template: StarterTemplate;
}

function TemplateCard({ template }: TemplateCardProps) {
  const [copied, setCopied] = useState(false);

  const copyCommand = async () => {
    await navigator.clipboard.writeText(template.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`template-card ${template.recommended ? 'recommended' : ''}`}>
      <div className="template-header">
        <span className="template-name">{template.name}</span>
        {template.recommended && <span className="recommended-badge">Recommended</span>}
      </div>
      <p className="template-description">{template.description}</p>
      <div className="template-command">
        <Terminal size={12} />
        <code>{template.url}</code>
        <button onClick={copyCommand} className="copy-btn" title="Copy command to clipboard">
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

const GITIGNORE_TEMPLATES = [
  { id: 'Node', name: 'Node', description: 'node_modules, package-lock.json' },
  { id: 'React', name: 'React/Next.js', description: '.next, dist, build' },
  { id: 'Python', name: 'Python', description: '__pycache__, .venv, *.pyc' },
  { id: 'Unity', name: 'Unity', description: 'Library, Temp, Logs' },
  { id: 'Godot', name: 'Godot', description: '.import, .gdignore' },
  { id: 'macOS', name: 'macOS', description: '.DS_Store, AppleDouble' },
  { id: 'Windows', name: 'Windows', description: 'Thumbs.db, Desktop.ini' },
  { id: 'Linux', name: 'Linux', description: '*~, .fuse_hidden' },
  { id: 'VSCode', name: 'VSCode', description: '.vscode/settings.json' },
  { id: 'IntelliJ', name: 'IntelliJ', description: '.idea/, *.iml' },
  { id: 'Android', name: 'Android', description: 'build/, *.apk' },
  { id: 'iOS', name: 'iOS', description: 'build/, *.xcuserdata' },
  { id: 'Tauri', name: 'Tauri', description: 'src-tauri/target/' },
  { id: 'Rust', name: 'Rust', description: 'target/, Cargo.lock' },
  { id: 'Go', name: 'Go', description: 'vendor/, *.exe' },
  { id: 'Flutter', name: 'Flutter', description: '.dart_tool/, build/' },
  { id: 'Global/JetBrains', name: 'JetBrains (Global)', description: 'All JetBrains IDEs' },
  { id: 'Global/Editor', name: 'Editors (Global)', description: 'vim, emacs, sublime' },
  { id: 'Global/OSX', name: 'macOS (Global)', description: 'All macOS systems' },
  { id: 'Global/Windows', name: 'Windows (Global)', description: 'All Windows systems' },
];

interface GitIgnoreSelectorProps {
  onSelect: (templates: string[]) => void;
}

function GitIgnoreSelector({ onSelect }: GitIgnoreSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    const updated = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    setSelected(updated);
    onSelect(updated);
  };

  return (
    <div className="gitignore-selector" title="Select .gitignore templates from github/gitignore">
      <div className="gitignore-header">
        <Package size={14} />
        <span>.gitignore Templates</span>
        <span className="selected-count">{selected.length} selected</span>
      </div>
      <div className="gitignore-grid">
        {GITIGNORE_TEMPLATES.map((item) => (
          <button
            key={item.id}
            className={`gitignore-chip ${selected.includes(item.id) ? 'selected' : ''}`}
            onClick={() => toggle(item.id)}
            title={item.description}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

interface StarterTemplateSelectorComponentProps {
  workflowId: WorkflowId;
}

export function StarterTemplateSelector({ workflowId }: StarterTemplateSelectorComponentProps) {
  const [showGitIgnore, setShowGitIgnore] = useState(false);
  const [gitignoreSelection, setGitignoreSelection] = useState<string[]>([]);

  const profile = WORKFLOW_REGISTRY[workflowId];
  const templates = profile?.starterTemplates || [];

  return (
    <div className="starter-selector">
      <div className="starter-header">
        <div className="starter-title">
          <GitBranch size={16} />
          <span>Project Starters</span>
          <span className="template-count">{templates.length} templates</span>
        </div>
        <button
          className={`gitignore-toggle ${showGitIgnore ? 'active' : ''}`}
          onClick={() => setShowGitIgnore(!showGitIgnore)}
          title="Add .gitignore templates from github/gitignore"
        >
          <Package size={14} />
          {showGitIgnore ? 'Hide .gitignore' : 'Add .gitignore'}
        </button>
      </div>

      {showGitIgnore && (
        <GitIgnoreSelector
          onSelect={(selection) => setGitignoreSelection(selection)}
        />
      )}

      <div className="templates-grid">
        {templates.length > 0 ? (
          templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))
        ) : (
          <div className="no-templates">
            <p>No starter templates for this workflow.</p>
            <p className="muted">Use "Blank" project and add templates manually.</p>
          </div>
        )}
      </div>

      {gitignoreSelection.length > 0 && (
        <div className="gitignore-preview">
          <code>
            {`# Generated .gitignore\n${gitignoreSelection.map((id) => {
              const tmpl = GITIGNORE_TEMPLATES.find((t) => t.id === id);
              return `# ${tmpl?.name}\n${tmpl?.description}`;
            }).join('\n\n')}`}
          </code>
        </div>
      )}
    </div>
  );
}