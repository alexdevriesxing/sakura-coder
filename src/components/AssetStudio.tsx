import { useState } from 'react';
import { Image as ImageIcon, Save, Download, Sparkles, Layout, Link, Palette } from 'lucide-react';
import { callFluxImageWorker } from '../lib/aiClient';
import { createWorkflowAssetPrompt } from '../lib/promptFactory';
import { saveGeneratedAsset } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { getWorkflowImageTypes } from '../workflows';

export function AssetStudio() {
  const { project, activeWorkflowId, assets, addAsset, setStatus } = useSakuraStore();
  const [assetType, setAssetType] = useState('ui_icon');
  const [subject, setSubject] = useState('minimalist logo');
  const [mood, setMood] = useState('professional');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const assetTypes = activeWorkflowId ? getWorkflowImageTypes(activeWorkflowId) : [];

  const generate = async () => {
    if (!project || !activeWorkflowId) return;
    setBusy(true);
    setStatus('Articulating your vision...');
    try {
      const promptResult = createWorkflowAssetPrompt({
        projectName: project.name,
        workflowId: activeWorkflowId,
        assetType,
        subject,
        style: mood,
      });

      const finalPrompt = referenceUrl ? `${promptResult.prompt}. Style Reference: ${referenceUrl}` : promptResult.prompt;

      const asset = await callFluxImageWorker({
        prompt: finalPrompt,
        negativePrompt: promptResult.negativePrompt,
        filename: promptResult.filename,
        assetType,
      });
      addAsset(asset);
      setStatus(`Asset generated: ${asset.filename}`);
    } catch (error) {
      setStatus(`Asset generation failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!project || assets.length === 0) return;
    try {
      const asset = assets[0];
      const saved = await saveGeneratedAsset({ rootPath: project.rootPath, asset, uri: asset.previewUrl || '' });
      setStatus(`Saved asset to project: ${saved.filename}`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <section className="panel compact-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageIcon size={16} className="text-primary" />
          <span>Asset Studio</span>
        </div>
        {busy && <div className="animate-pulse" style={{ fontSize: '10px', color: 'var(--primary)' }}>PAINTING...</div>}
      </div>

      {!activeWorkflowId ? (
        <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <Palette size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p className="muted" style={{ fontSize: '12px' }}>Select a project workflow to unlock the Asset Studio.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label title="Select the type of visual asset to generate">
              <span>Category</span>
              <select value={assetType} onChange={(e) => setAssetType(e.target.value)} style={{ fontSize: '12px' }}>
                {assetTypes.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.description}</option>
                ))}
              </select>
            </label>
            <label title="The overall aesthetic or emotional tone">
              <span>Mood</span>
              <select value={mood} onChange={(e) => setMood(e.target.value)} style={{ fontSize: '12px' }}>
                <option value="professional">Professional</option>
                <option value="playful">Playful</option>
                <option value="minimalist">Minimalist</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="fantasy">Fantasy</option>
                <option value="retro">Retro</option>
              </select>
            </label>
          </div>

          <label title="Describe the subject or content of the image">
            <span>Visual Subject</span>
            <textarea 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              placeholder="E.g. A futuristic city skyline at sunset..."
              style={{ minHeight: '60px', fontSize: '12px' }}
            />
          </label>

          <label title="Reference a URL for style or color palette inspiration">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Link size={12} /> Style Reference URL</span>
            <input 
              value={referenceUrl} 
              onChange={(e) => setReferenceUrl(e.target.value)} 
              placeholder="Link to image or moodboard..."
              style={{ fontSize: '12px' }}
            />
          </label>

          <div className="button-row" style={{ marginTop: '4px' }}>
            <button 
              onClick={generate} 
              disabled={busy || !subject} 
              title="Generate professional visual assets using Flux AI"
              style={{ flex: 1, borderRadius: '12px' }}
            >
              <Sparkles size={14} /> Generate Asset
            </button>
          </div>

          {assets.length > 0 && (
            <div className="asset-history" style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Recent Creations</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {assets.slice(0, 3).map((asset) => (
                  <div 
                    key={asset.id} 
                    className="asset-thumb" 
                    title={asset.prompt}
                    style={{ 
                      aspectRatio: '1', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      border: '1px solid var(--border)',
                      background: 'rgba(0,0,0,0.2)',
                      cursor: 'pointer'
                    }}
                  >
                    <img src={asset.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
