import { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, Layout, Image as ImageIcon, Music, Boxes, Play, RefreshCw, Smartphone, Tablet, Monitor, MessageSquarePlus } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';
import { readProjectFile } from '../lib/tauriApi';

type PreviewTab = 'layout' | 'assets' | 'scene' | 'audio' | 'emulator';
type ViewportSize = 'mobile' | 'tablet' | 'desktop';

interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

export function WorkflowPreview() {
  const { project, activeWorkflowId, assets, audioAssets, setStatus, addVisualAnnotation } = useSakuraStore();
  const [activeTab, setActiveTab] = useState<PreviewTab>('layout');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const loadLayoutPreview = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const content = await readProjectFile(project.rootPath, 'index.html').catch(() => null);
      if (content) {
        setHtmlContent(content);
      } else {
        setHtmlContent('<div style="padding: 20px; color: #bcaec0; text-align: center;">No index.html found for layout preview.</div>');
      }
    } catch (error) {
      setStatus(`Failed to load layout preview: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [project, setStatus]);

  useEffect(() => {
    if (activeTab === 'layout' && project) {
      loadLayoutPreview();
    }
  }, [activeTab, project, loadLayoutPreview]);

  const handlePreviewClick = (e: React.MouseEvent) => {
    if (!isAnnotating || !iframeRef.current) return;
    const rect = iframeRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const text = window.prompt('Describe the change or feedback for this area:');
    if (text) {
      const newAnnotation = { id: Date.now().toString(), x, y, text };
      setAnnotations([...annotations, newAnnotation]);
      addVisualAnnotation(newAnnotation);
      setStatus(`Annotation added: "${text}". Agent will prioritize this area in next pass.`);
    }
  };

  const viewportWidth = {
    mobile: '375px',
    tablet: '768px',
    desktop: '100%'
  }[viewport];

  if (!project) return null;

  return (
    <section className="panel editor-panel">
      <div className="editor-toolbar">
        <Eye size={16} />
        <strong>Visual Studio</strong>
        
        <div className="mode-tabs small">
          <button className={activeTab === 'layout' ? 'active' : ''} onClick={() => setActiveTab('layout')}><Layout size={14} /> UI Layout</button>
          <button className={activeTab === 'scene' ? 'active' : ''} onClick={() => setActiveTab('scene')}><Boxes size={14} /> Scene</button>
           <button className={activeTab === 'assets' ? 'active' : ''} onClick={() => setActiveTab('assets')}><ImageIcon size={14} /> Assets</button>
           <button className={activeTab === 'audio' ? 'active' : ''} onClick={() => setActiveTab('audio')}><Music size={14} /> Audio</button>
           {activeWorkflowId === 'retro-game-dev' && (
             <button className={activeTab === 'emulator' ? 'active' : ''} onClick={() => setActiveTab('emulator')} title="Emulator Preview"><Monitor size={14} /> Emulator</button>
           )}
         </div>

        {activeTab === 'layout' && (
          <div className="viewport-controls" style={{ display: 'flex', gap: '4px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
            <button className={`icon-button ${viewport === 'mobile' ? 'active' : ''}`} onClick={() => setViewport('mobile')} title="Mobile View"><Smartphone size={14} /></button>
            <button className={`icon-button ${viewport === 'tablet' ? 'active' : ''}`} onClick={() => setViewport('tablet')} title="Tablet View"><Tablet size={14} /></button>
            <button className={`icon-button ${viewport === 'desktop' ? 'active' : ''}`} onClick={() => setViewport('desktop')} title="Desktop View"><Monitor size={14} /></button>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {activeTab === 'layout' && (
            <button 
              className={`icon-button ${isAnnotating ? 'active danger' : ''}`} 
              onClick={() => setIsAnnotating(!isAnnotating)}
              title={isAnnotating ? "Stop Annotating" : "Add Visual Feedback (Hotspot)"}
              style={isAnnotating ? { background: '#ff506e', borderColor: '#ff506e', color: '#fff' } : {}}
            >
              <MessageSquarePlus size={14} />
            </button>
          )}
          <button className="icon-button" onClick={loadLayoutPreview} title="Refresh Preview">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="preview-content" style={{ height: '100%', overflow: 'auto', background: '#09080e', position: 'relative' }}>
        {activeTab === 'layout' && (
          <div 
            className="layout-preview-container" 
            style={{ 
              height: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              background: '#050408',
              padding: viewport === 'desktop' ? '0' : '20px' 
            }}
          >
            <div 
              className="layout-preview-wrapper" 
              style={{ 
                width: viewportWidth, 
                height: '100%', 
                position: 'relative',
                transition: 'width 0.3s ease',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                cursor: isAnnotating ? 'crosshair' : 'default'
              }}
              onClick={handlePreviewClick}
            >
              {htmlContent ? (
                <>
                  <iframe
                    ref={iframeRef}
                    title="Layout Preview"
                    srcDoc={htmlContent}
                    sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups"
                    style={{ width: '100%', height: '100%', border: 'none', background: '#fff', pointerEvents: isAnnotating ? 'none' : 'auto' }}
                  />
                  {/* Annotations Layer */}
                  <div className="annotations-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {annotations.map((a) => (
                      <div 
                        key={a.id} 
                        className="hotspot" 
                        style={{ 
                          position: 'absolute', 
                          left: `${a.x}%`, 
                          top: `${a.y}%`, 
                          width: '24px', 
                          height: '24px', 
                          background: '#ff506e', 
                          borderRadius: '50%', 
                          border: '2px solid #fff',
                          boxShadow: '0 0 10px rgba(255,80,110,0.5)',
                          transform: 'translate(-50%, -50%)',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                        title={a.text}
                      >
                        !
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="editor-empty"><p>Generating layout preview...</p></div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'scene' && (
          <div className="scene-preview-wrapper" style={{ padding: '20px', textAlign: 'center' }}>
            <Boxes size={48} className="muted" style={{ marginBottom: '16px' }} />
            <h3>Scene Visualizer</h3>
            <p className="muted">Layout visualization for {activeWorkflowId}</p>
            
            {activeWorkflowId === 'retro-game-dev' && (
              <div className="retro-system-badge" style={{ display: 'inline-block', padding: '4px 12px', background: '#000', border: '1px solid #44d590', color: '#44d590', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginBottom: '12px', fontFamily: 'monospace' }}>
                HARDWARE MODE: CRT-EMU / 320x200
              </div>
            )}

            <div className="scene-container" style={{ 
              width: '100%', 
              aspectRatio: activeWorkflowId === 'retro-game-dev' ? '4/3' : '16/9', 
              maxWidth: activeWorkflowId === 'retro-game-dev' ? '640px' : 'none',
              margin: '20px auto',
              background: '#000', 
              border: activeWorkflowId === 'retro-game-dev' ? '8px solid #1a1522' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: activeWorkflowId === 'retro-game-dev' ? '4px' : '12px',
              position: 'relative',
              overflow: 'hidden',
              imageRendering: activeWorkflowId === 'retro-game-dev' ? 'pixelated' : 'auto'
            }}>
              {/* CRT Scanline Overlay for Retro */}
              {activeWorkflowId === 'retro-game-dev' && (
                <div className="crt-overlay" style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                  backgroundSize: '100% 4px, 3px 100%',
                  pointerEvents: 'none',
                  zIndex: 10
                }} />
              )}

              {assets.filter(a => a.assetType.includes('sprite') || a.assetType.includes('background') || a.assetType.includes('retro')).length > 0 ? (
                <div className="scene-mockup" style={{ height: '100%', position: 'relative' }}>
                  {assets.filter(a => a.assetType.includes('background') || a.assetType.includes('screen')).map((bg, i) => (
                    <img key={bg.id} src={bg.previewUrl} alt="Background" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: activeWorkflowId === 'retro-game-dev' ? 1 : 0.5 }} />
                  ))}
                  <div className="sprites-layer" style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                    {assets.filter(a => a.assetType.includes('sprite')).map((sprite) => (
                      <div key={sprite.id} style={{ textAlign: 'center' }}>
                        <img src={sprite.previewUrl} alt="Sprite" style={{ height: activeWorkflowId === 'retro-game-dev' ? '64px' : '120px', objectFit: 'contain' }} />
                        <span className="muted" style={{ fontSize: '10px', display: 'block' }}>{sprite.assetType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px' }}>
                  <p className="muted">No scene-specific assets found.</p>
                  <p className="muted" style={{ fontSize: '11px' }}>Generate retro sprites or screen mockups in Asset Studio.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="assets-preview-wrapper" style={{ padding: '20px' }}>
            <h3>Visual Assets</h3>
            {assets.length > 0 ? (
              <div className="image-gallery" style={{ marginTop: '16px' }}>
                {assets.map((asset) => (
                  <div key={asset.id} className="gallery-item">
                    <img src={asset.previewUrl} alt={asset.filename} />
                    <span className="muted" style={{ fontSize: '10px', display: 'block', marginTop: '4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {asset.filename}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="editor-empty">
                <p>No visual assets generated yet. Use Asset Studio to create some.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="audio-preview-wrapper" style={{ padding: '20px' }}>
            <h3>Audio Assets</h3>
            {audioAssets.length > 0 ? (
              <div className="audio-list" style={{ marginTop: '16px' }}>
                {audioAssets.map((audio) => (
                  <div key={audio.id} className="audio-item" style={{ marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{audio.filename}</strong>
                      <p className="muted" style={{ margin: 0, fontSize: '10px' }}>{audio.audioType} • {audio.durationSeconds}s</p>
                    </div>
                    {audio.previewUrl && <audio controls src={audio.previewUrl} style={{ height: '32px' }} />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="editor-empty">
                <p>No audio assets generated yet. Use Audio Studio to create some.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'emulator' && (
          <div className="emulator-preview-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
            <div className="emulator-header" style={{ padding: '12px', background: '#1a1522', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Monitor size={16} className="text-primary" />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Integrated Emulator Preview</span>
              </div>
              <div className="emulator-controls" style={{ display: 'flex', gap: '8px' }}>
                <button className="icon-button small"><Play size={12} /> Boot</button>
                <button className="icon-button small"><RefreshCw size={12} /> Reset</button>
              </div>
            </div>
            <div className="emulator-screen-container" style={{ flex: 1, display: 'grid', placeItems: 'center', position: 'relative' }}>
              <div className="emulator-screen" style={{ width: '80%', aspectRatio: '4/3', background: '#121010', border: '20px solid #2a2533', borderRadius: '12px', boxShadow: 'inset 0 0 100px rgba(0,255,0,0.05), 0 0 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
                <div className="crt-effect" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%', pointerEvents: 'none', zIndex: 5 }} />
                <div className="emulator-message" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                  <Monitor size={48} className="muted" style={{ marginBottom: '20px' }} />
                  <p style={{ color: '#44d590', fontFamily: 'monospace', fontSize: '14px', textTransform: 'uppercase' }}>Ready to boot target system...</p>
                  <p className="muted" style={{ fontSize: '12px', marginTop: '12px' }}>This emulator shell is configured for {activeWorkflowId}. Run a build in the terminal to generate a .prg, .adf, or .tap file to test here.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
