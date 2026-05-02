import { useState } from 'react';
import { Palette, Sparkles, Image as ImageIcon, Wand2, Box, Layers, Brush } from 'lucide-react';
import { callFluxImageWorker } from '../lib/aiClient';
import { saveGeneratedAsset } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { WORKFLOW_REGISTRY } from '../workflows';

export function AssetStudio() {
  const { project, activeWorkflowId, addAsset, setStatus } = useSakuraStore();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('Modern Web');

  const styles = ['Modern Web', 'Retro Pixel Art', 'Vibrant Game', 'Minimalist UI', '3D Render'];

  const workflow = activeWorkflowId ? WORKFLOW_REGISTRY[activeWorkflowId] : null;

  const generate = async (assetTypeId: string) => {
    if (!project || !workflow) return;
    const assetType = workflow.imageAssetTypes.find(t => t.id === assetTypeId);
    if (!assetType) return;

    setBusy(true);
    try {
      const generated = await callFluxImageWorker({
        prompt: `${prompt}, in ${selectedStyle} style`,
        negativePrompt: workflow.imageNegativePromptTemplate,
        filename: `${assetTypeId}_${Date.now()}.png`,
        assetType: assetTypeId,
      });

      const saved = await saveGeneratedAsset({
        rootPath: project.rootPath,
        asset: generated,
        uri: generated.previewUrl,
      });

      addAsset(saved);
      setStatus(`Generated ${assetTypeId}: ${saved.filename}`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel studio-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <Palette size={16} className="text-primary" />
        <span>Asset Studio</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="style-presets">
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Visual Style</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {styles.map(s => (
              <button 
                key={s} 
                className={`secondary small ${selectedStyle === s ? 'active' : ''}`}
                onClick={() => setSelectedStyle(s)}
                style={selectedStyle === s ? { background: 'var(--primary)', color: '#000' } : {}}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Subject Description</span>
          <textarea
            placeholder="Describe the asset subject (e.g. 'a futuristic space helmet')..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ minHeight: '80px', fontSize: '13px' }}
          />
        </label>

        <div className="asset-type-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {workflow?.imageAssetTypes.map((type) => (
            <button 
              key={type.id} 
              onClick={() => generate(type.id)} 
              disabled={busy || !prompt}
              style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <Wand2 size={14} />
              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{type.description}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
