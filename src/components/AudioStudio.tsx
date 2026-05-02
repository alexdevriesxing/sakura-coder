import { useRef, useState } from 'react';
import { Music, Save, Play, Pause } from 'lucide-react';
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
  const [busy, setBusy] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioTypes = activeWorkflowId ? getWorkflowAudioTypes(activeWorkflowId) : [];

  const generate = async () => {
    if (!project || !activeWorkflowId) return;
    setBusy(true);
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
        duration: promptResult.duration,
        loop: promptResult.loop,
        bpm: promptResult.bpm,
        key: promptResult.key,
      });
      addAudioAsset(audio);
      setStatus(`Audio generated: ${audio.filename}`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!project || audioAssets.length === 0) return;
    try {
      const audio = audioAssets[0];
      const saved = await saveGeneratedAudio({ rootPath: project.rootPath, audio, uri: audio.previewUrl });
      setStatus(`Saved audio: ${saved.filename}`);
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
    <section className="panel compact-panel">
      <div className="panel-title"><Music size={15} /> Audio Studio</div>
      {activeWorkflowId ? (
        <>
          <label>
            Audio type
            <select value={audioType} onChange={(e) => setAudioType(e.target.value)}>
              {audioTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.description}</option>
              ))}
            </select>
          </label>
          <label>
            Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
          <label>
            Mood<input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="professional" /></label>
          <label>
            Duration (s)
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              min={0.5}
              max={300}
            />
          </label>
          <label>
            Loop
            <input type="checkbox" checked={loopable} onChange={(e) => setLoopable(e.target.checked)} />
          </label>
          <label>
            BPM<input value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="120" />
          </label>
          <label>
            Key<input value={key} onChange={(e) => setKey(e.target.value)} placeholder="C major" />
          </label>
          <div className="button-row">
            <button onClick={generate} disabled={busy}><Music size={14} /> Generate via Minimax</button>
            <button className="secondary" onClick={save} disabled={audioAssets.length === 0}><Save size={14} /> Save metadata</button>
          </div>

          <audio ref={audioRef} onEnded={() => setPlayingId(null)} style={{ display: 'none' }} />

          {audioAssets.length > 0 && audioAssets[0].previewUrl && (
            <div className="audio-preview">
              <audio controls src={audioAssets[0].previewUrl} style={{ width: '100%', height: '36px' }} />
            </div>
          )}
        </>
      ) : (
        <p className="muted">Select a workflow in Project Launcher to enable workflow-specific audio generation.</p>
      )}
      <div className="audio-list">
        {audioAssets.slice(0, 5).map((audio) => (
          <article key={audio.id}>
            <div className="audio-item">
              <strong>{audio.filename}</strong>
              <button
                className="icon-btn"
                onClick={() => togglePlay(audio)}
                disabled={!audio.previewUrl}
              >
                {playingId === audio.id ? <Pause size={12} /> : <Play size={12} />}
              </button>
            </div>
            <p className="muted">{audio.audioType} • {audio.durationSeconds}s • {audio.loop ? 'loop' : 'one-shot'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}