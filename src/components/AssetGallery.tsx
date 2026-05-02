import { useState } from 'react';
import { Image as ImageIcon, Music, Download, Trash2, Search, Filter, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';

export function AssetGallery() {
  const { assets, audioAssets, project } = useSakuraStore();
  const [filter, setFilter] = useState<'all' | 'image' | 'audio'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const allAssets = [
    ...assets.map(a => ({ ...a, type: 'image' as const })),
    ...audioAssets.map(a => ({ ...a, type: 'audio' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredAssets = allAssets.filter(asset => {
    const matchesFilter = filter === 'all' || asset.type === filter;
    const matchesSearch = asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         asset.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const openLightbox = (index: number) => {
    if (filteredAssets[index].type === 'image') {
      setLightboxIndex(index);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);

  const navigateLightbox = (dir: number) => {
    if (lightboxIndex === null) return;
    let next = lightboxIndex + dir;
    while (next >= 0 && next < filteredAssets.length && filteredAssets[next].type !== 'image') {
      next += dir;
    }
    if (next >= 0 && next < filteredAssets.length) {
      setLightboxIndex(next);
    }
  };

  if (!project) return null;

  return (
    <section className="panel editor-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="editor-toolbar">
        <ImageIcon size={16} />
        <strong>Asset Gallery</strong>
        <div className="search-box" style={{ marginLeft: '20px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '6px 14px', flex: 1, maxWidth: '400px', border: '1px solid var(--border)' }}>
          <Search size={14} className="muted" style={{ marginRight: '10px' }} />
          <input 
            type="text" 
            placeholder="Search assets and prompts..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', fontSize: '13px', width: '100%', color: '#fff' }}
          />
        </div>
        <div className="mode-tabs small" style={{ marginLeft: '12px' }}>
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All Assets</button>
          <button className={filter === 'image' ? 'active' : ''} onClick={() => setFilter('image')}><ImageIcon size={12} /> Images</button>
          <button className={filter === 'audio' ? 'active' : ''} onClick={() => setFilter('audio')}><Music size={12} /> Audio</button>
        </div>
      </div>

      <div className="gallery-content" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {filteredAssets.length > 0 ? (
          <div className="asset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
            {filteredAssets.map((asset, index) => (
              <div key={asset.id} className="gallery-card" onClick={() => openLightbox(index)} style={{ 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '20px', 
                overflow: 'hidden', 
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                cursor: asset.type === 'image' ? 'zoom-in' : 'default'
              }}>
                <div className="card-preview" style={{ aspectRatio: '1', background: '#000', position: 'relative', display: 'grid', placeItems: 'center' }}>
                  {asset.type === 'image' ? (
                    <img src={asset.previewUrl} alt={asset.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <Music size={48} style={{ color: 'var(--secondary)', opacity: 0.5 }} />
                      <div style={{ marginTop: '12px' }}>{asset.previewUrl && <audio src={asset.previewUrl} controls style={{ height: '30px', width: '160px' }} onClick={e => e.stopPropagation()} />}</div>
                    </div>
                  )}
                  <div className="card-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <button className="icon-button" title="Download" onClick={e => e.stopPropagation()}><Download size={18} /></button>
                    <button className="icon-button danger" title="Delete" onClick={e => e.stopPropagation()}><Trash2 size={18} /></button>
                  </div>
                </div>
                <div className="card-info" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.filename}</strong>
                    <span className="badge primary" style={{ fontSize: '9px' }}>{asset.type.toUpperCase()}</span>
                  </div>
                  <p className="muted" style={{ fontSize: '11px', lineHeight: '1.4', margin: 0, height: '32px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {asset.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="editor-empty">
            <p>No assets match your search.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="lightbox-overlay" onClick={closeLightbox} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'grid', placeItems: 'center', backdropFilter: 'blur(10px)' }}>
          <button className="lightbox-close" onClick={closeLightbox} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%' }}><X size={24} /></button>
          
          <button className="lightbox-nav left" onClick={e => { e.stopPropagation(); navigateLightbox(-1); }} style={{ position: 'absolute', left: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '16px', borderRadius: '50%' }}><ChevronLeft size={32} /></button>
          
          <div className="lightbox-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh', textAlign: 'center' }}>
            <img src={filteredAssets[lightboxIndex].previewUrl} alt="Fullscreen preview" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} />
            <div style={{ marginTop: '24px', color: '#fff' }}>
              <h2 style={{ margin: 0 }}>{filteredAssets[lightboxIndex].filename}</h2>
              <p className="muted" style={{ marginTop: '10px', maxWidth: '600px', marginInline: 'auto' }}>{filteredAssets[lightboxIndex].prompt}</p>
            </div>
          </div>

          <button className="lightbox-nav right" onClick={e => { e.stopPropagation(); navigateLightbox(1); }} style={{ position: 'absolute', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '16px', borderRadius: '50%' }}><ChevronRight size={32} /></button>
        </div>
      )}

      <style>{`
        .gallery-card:hover { transform: translateY(-4px); border-color: var(--primary); }
        .gallery-card:hover .card-overlay { opacity: 1; }
        .card-overlay .icon-button { background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); border-radius: 12px; }
        .lightbox-nav:hover, .lightbox-close:hover { background: var(--primary) !important; color: #000 !important; }
      `}</style>
    </section>
  );
}

