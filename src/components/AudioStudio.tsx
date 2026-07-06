import { useRef, useState } from 'react';
import { Music, Save, Play, Pause, Clock, Link, Mic, Radio } from 'lucide-react';
import { callMinimaxMusicWorker } from '../lib/aiClient';
import { createWorkflowAudioPrompt } from '../lib/promptFactory';
import { saveGeneratedAudio } from '../lib/tauriApi';
import { useSakuraStore } from '../store/useSakuraStore';
import { getWorkflowAudioTypes } from '../workflows';

export function AudioStudio() {
  const { project, activeWorkflowId, audioAssets, addAudioAsset, setStatus } = useSakuraStore();
  const [audioType, setAudioType] = useState('ui_click');
  const [subject, setSubject] = useState('subtle UI feedback');
  const [mood, setMood] = useState('professional');
  const [duration, setDuration] = useState(2);
  const [loopable, setLoopable] = useState(false);
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(true);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [sessionMinimaxKey, setSessionMinimaxKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioTypes = activeWorkflowId ? getWorkflowAudioTypes(activeWorkflowId) : [];

  const generate = async () => {
    if (!project || !activeWorkflowId) return;
    setBusy(true);
    setStatus('Composing your masterpiece...');
    try {
      const promptResult = createWorkflowAudioPrompt({
        projectName: project.name,
        workflowId: activeWorkflowId,
        audioType,
        subject,
        mood,
        duration,
        loop: loopable,
        bpm: bpm ? parseInt(bpm) : undefined,
        key: key || undefined,
      });

      const audio = await callMinimaxMusicWorker({
        prompt: promptResult.prompt,
        negativePrompt: promptResult.negativePrompt,
        filename: promptResult.filename,
        audioType,
        duration,
        loop: loopable,
        bpm: bpm ? parseInt(bpm) : undefined,
        key: key || undefined,
        lyrics: isInstrumental ? undefined : lyrics,
        isInstrumental,
        referenceUrl: referenceUrl || undefined,
      }, sessionMinimaxKey.trim() || undefined);

      addAudioAsset(audio);
      setStatus(`Audio generated: ${audio.filename}`);
    } catch (error) {
      setStatus(`Audio generation failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!project || audioAssets.length === 0) return;
    try {
      const audio = audioAssets[0];
      const saved = await saveGeneratedAudio({ rootPath: project.rootPath, audio, uri: audio.previewUrl });
      setStatus(`Saved audio to assets: ${saved.filename}`);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const togglePlay = (audio: typeof audioAssets[0]) => {
    if (playingId === audio.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audio.previewUrl || '';
        audioRef.current.play();
        setPlayingId(audio.id);
      }
    }
  };

  return (
    <section className="panel compact-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="panel-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Music size={16} className="text-primary" />
          <span>Audio Studio</span>
        </div>
        {busy && <div className="animate-pulse" style={{ fontSize: '10px', color: 'var(--primary)' }}>GENERATING...</div>}
      </div>

      {!activeWorkflowId ? (
        <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
          <Radio size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p className="muted" style={{ fontSize: '12px' }}>Select a project workflow to unlock the Audio Studio.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label title="Select the type of audio asset to generate">
              <span>Category</span>
              <select value={audioType} onChange={(e) => setAudioType(e.target.value)} style={{ fontSize: '12px' }}>
                {audioTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.description}</option>
                ))}
              </select>
            </label>
            <label title="Estimated length of the generated audio">
              <span>Duration (s)</span>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 2)}
                  min={1}
                  max={300}
                  style={{ paddingLeft: '32px' }}
                />
                <Clock size={14} style={{ position: 'absolute', left: '10px', top: '10px', opacity: 0.5 }} />
              </div>
            </label>
          </div>

          <label title="Describe the vibe, instruments, or sound effects">
            <span>Sound Description</span>
            <textarea 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              placeholder="E.g. Lo-fi hip hop beat with rain sounds..."
              style={{ minHeight: '60px', fontSize: '12px' }}
            />
          </label>

          <label title="Reference a Spotify, YouTube or YT Music link for style matching">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Link size={12} /> Style Reference URL</span>
            <input 
              value={referenceUrl} 
              onChange={(e) => setReferenceUrl(e.target.value)} 
              placeholder="Spotify / YouTube link..."
              style={{ fontSize: '12px' }}
            />
          </label>

          <label title="Optional session-only Minimax API key. It is sent to your configured worker and is not saved in browser storage.">
            <span>Minimax BYOK Key</span>
            <input
              type="password"
              value={sessionMinimaxKey}
              onChange={(e) => setSessionMinimaxKey(e.target.value)}
              placeholder="Session only; not persisted"
              autoComplete="off"
              style={{ fontSize: '12px' }}
            />
          </label>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Vocal Mode</span>
              <button 
                className={`badge ${!isInstrumental ? 'primary' : ''}`}
                onClick={() => setIsInstrumental(!isInstrumental)}
                style={{ cursor: 'pointer' }}
              >
                {isInstrumental ? 'Instrumental' : 'With Lyrics'}
              </button>
            </div>
            
            {!isInstrumental && (
              <textarea 
                value={lyrics} 
                onChange={(e) => setLyrics(e.target.value)} 
                placeholder="Enter lyrics here..."
                style={{ minHeight: '60px', fontSize: '12px', background: 'rgba(0,0,0,0.2)' }}
                className="fade-enter-active"
              />
            )}
          </div>

          <div className="button-row" style={{ marginTop: '4px' }}>
            <button 
              onClick={generate} 
              disabled={busy || !subject} 
              title="Generate professional audio using Minimax AI"
              style={{ flex: 1, borderRadius: '12px' }}
            >
              <Music size={14} /> Generate Audio
            </button>
          </div>

          <audio ref={audioRef} onEnded={() => setPlayingId(null)} style={{ display: 'none' }} />

          {audioAssets.length > 0 && (
            <div className="audio-list" style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Recent Sessions</span>
              {audioAssets.slice(0, 3).map((audio) => (
                <article key={audio.id} className="audio-item" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(247, 161, 196, 0.1)', display: 'grid', placeItems: 'center' }}>
                      <Music size={12} className="text-primary" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{audio.filename}</div>
                      <div style={{ fontSize: '9px', opacity: 0.5 }}>{audio.durationSeconds}s · {audio.audioType}</div>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => togglePlay(audio)}
                      disabled={!audio.previewUrl}
                      title={playingId === audio.id ? "Pause" : "Play Preview"}
                    >
                      {playingId === audio.id ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
