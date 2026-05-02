import { useState, useEffect } from 'react';
import { Search, File, X, ChevronRight } from 'lucide-react';
import { useSakuraStore } from '../store/useSakuraStore';
import { searchProject, readProjectFile } from '../lib/tauriApi';

export function GlobalSearch() {
  const { project, setStatus, openFileContent } = useSakuraStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 3 && project) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async () => {
    if (!project) return;
    setIsSearching(true);
    try {
      const data = await searchProject(project.rootPath, query);
      setResults(data);
    } catch (error) {
      setStatus(`Search failed: ${(error as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const openResult = async (res: any) => {
    if (!project) return;
    try {
      const content = await readProjectFile(project.rootPath, res.relativePath);
      openFileContent({
        absolutePath: res.path,
        relativePath: res.relativePath,
        content
      });
    } catch (error) {
      setStatus(`Failed to open file: ${(error as Error).message}`);
    }
  };

  return (
    <section className="panel compact-panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={15} /> 
          <span>Project Search</span>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <input 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="Search in files..." 
          style={{ paddingLeft: '36px' }}
        />
        <Search size={14} className="muted" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', padding: '4px' }}><X size={12} /></button>}
      </div>

      <div className="search-results" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {isSearching ? (
          <div className="editor-empty" style={{ padding: '20px' }}><p>Searching...</p></div>
        ) : results.length > 0 ? (
          results.map((res, i) => (
            <button key={i} onClick={() => openResult(res)} className="search-result-item" style={{ 
              textAlign: 'left', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border)', 
              borderRadius: '10px', 
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>
                <File size={12} />
                <span>{res.relativePath}</span>
                <span className="muted" style={{ fontSize: '10px', marginLeft: 'auto' }}>Line {res.lineNumber}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#fff', opacity: 0.8, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px' }}>
                {res.lineContent}
              </div>
            </button>
          ))
        ) : query.length >= 3 ? (
          <div className="editor-empty" style={{ padding: '20px' }}><p>No results found.</p></div>
        ) : (
          <div className="editor-empty" style={{ padding: '20px' }}><p className="muted">Enter at least 3 characters to search.</p></div>
        )}
      </div>

      <style>{`
        .search-result-item:hover { border-color: var(--primary); background: rgba(255,255,255,0.05); }
      `}</style>
    </section>
  );
}
