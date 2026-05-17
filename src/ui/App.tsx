import { useCallback, useRef, useState } from 'react';
import { loadModel, getDetectedDevice, type LoadProgress } from '../model/gemma';
import { play, stop, getLastError, clearLastError } from '../strudel/engine';
import { remixSeed } from '../remix/orchestrate';
import type { GenerationResult } from '../remix/generate';
import { SEED_GALLERY, type GallerySeed } from '../seeds/gallery';
import { VariationCard } from './VariationCard';

type ModelState = 'idle' | 'loading' | 'ready' | 'error';

export function App() {
  const [modelState, setModelState] = useState<ModelState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);

  const [seedCode, setSeedCode] = useState(SEED_GALLERY[0].code);
  const [activeSeedId, setActiveSeedId] = useState<string>(SEED_GALLERY[0].id);
  const [remixing, setRemixing] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [likedIdx, setLikedIdx] = useState<Set<number>>(new Set());
  const [engineError, setEngineError] = useState<string | null>(null);
  const playLock = useRef(false);

  const onLoadProgress = useCallback((p: LoadProgress) => {
    if (p.status === 'progress' && typeof p.progress === 'number') {
      setProgressPct(p.progress);
      setProgressMsg(`${p.status} ${p.file ?? ''} ${p.progress.toFixed(1)}%`);
    } else {
      setProgressMsg(`${p.status} ${p.name ?? p.file ?? ''}`.trim());
    }
  }, []);

  const handleLoad = useCallback(async () => {
    setModelState('loading');
    setModelError(null);
    setProgressPct(0);
    try {
      await loadModel({ onProgress: onLoadProgress });
      setProgressPct(100);
      setModelState('ready');
    } catch (err) {
      setModelError(err instanceof Error ? err.message : String(err));
      setModelState('error');
    }
  }, [onLoadProgress]);

  const handleSelectSeed = useCallback((s: GallerySeed) => {
    setActiveSeedId(s.id);
    setSeedCode(s.code);
    setResults([]);
    setLikedIdx(new Set());
    setPlayingIdx(null);
    stop();
  }, []);

  const handleRemix = useCallback(async () => {
    if (modelState !== 'ready' || remixing) return;
    const trimmed = seedCode.trim();
    if (!trimmed) return;
    setRemixing(true);
    setResults([]);
    setLikedIdx(new Set());
    setPlayingIdx(null);
    stop();
    try {
      await remixSeed(trimmed, 3, (latest) => {
        setResults((prev) => [...prev, latest]);
      });
    } finally {
      setRemixing(false);
    }
  }, [modelState, remixing, seedCode]);

  const handlePlay = useCallback(async (idx: number, code: string) => {
    if (playLock.current) return;
    playLock.current = true;
    setEngineError(null);
    clearLastError();
    try {
      stop();
      await play(code);
      setPlayingIdx(idx);
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : String(err));
    } finally {
      playLock.current = false;
    }
  }, []);

  const handleStop = useCallback(() => {
    stop();
    setPlayingIdx(null);
    const e = getLastError();
    if (e) setEngineError(e);
  }, []);

  const handlePlaySeed = useCallback(async () => {
    if (playLock.current) return;
    playLock.current = true;
    setEngineError(null);
    clearLastError();
    try {
      stop();
      await play(seedCode.trim());
      setPlayingIdx(-1);
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : String(err));
    } finally {
      playLock.current = false;
    }
  }, [seedCode]);

  const handleLike = useCallback((idx: number) => {
    setLikedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const device = getDetectedDevice();
  const seedDirty = activeSeedId
    ? seedCode.trim() !== SEED_GALLERY.find((s) => s.id === activeSeedId)?.code
    : true;

  return (
    <div className="app">
      <header className="app-head">
        <h1>Strudel Tutor</h1>
        <div className="sub">
          AI that learns your taste while you live-code. Gemma 4 E2B, in-browser.
        </div>
      </header>

      <div className="panel">
        <h2>Model</h2>
        <div className="row">
          <button
            className="primary"
            onClick={handleLoad}
            disabled={modelState === 'loading' || modelState === 'ready'}
          >
            {modelState === 'ready'
              ? `Loaded (${device ?? 'cpu'})`
              : modelState === 'loading'
                ? 'Loading…'
                : 'Load Gemma 4 E2B'}
          </button>
          <div className="progressbar">
            <div style={{ width: `${progressPct}%` }} />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#9aa0a8' }}>
            {progressMsg || (modelState === 'idle' ? 'click to download (~1.5 GB, cached after)' : '')}
          </span>
        </div>
        {modelError && <div className="errors">load error: {modelError}</div>}
      </div>

      <div className="panel">
        <h2>Seed gallery</h2>
        <div className="gallery">
          {SEED_GALLERY.map((s) => (
            <button
              key={s.id}
              className={`seed-card${s.id === activeSeedId && !seedDirty ? ' active' : ''}`}
              onClick={() => handleSelectSeed(s)}
            >
              <div className="seed-label">{s.label}</div>
              <div className="seed-meta">
                <span className="seed-genre">{s.genre}</span>
                <span className="seed-diff">{'★'.repeat(s.difficulty)}</span>
              </div>
              <div className="seed-code">{s.code}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Seed</h2>
        <textarea
          className="seed-input"
          value={seedCode}
          onChange={(e) => setSeedCode(e.target.value)}
          rows={2}
          spellCheck={false}
          placeholder='e.g. s("bd hh sd hh")'
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="primary"
            onClick={handleRemix}
            disabled={modelState !== 'ready' || remixing || !seedCode.trim()}
          >
            {remixing ? `Remixing ${results.length}/3…` : '✨ Remix'}
          </button>
          <button onClick={handlePlaySeed} disabled={!seedCode.trim()}>
            ▶ Play seed
          </button>
          <button onClick={handleStop} disabled={playingIdx === null}>
            ⏹ Stop
          </button>
        </div>
        {engineError && <div className="errors" style={{ marginTop: 10 }}>engine error: {engineError}</div>}
      </div>

      <div className="panel">
        <h2>Variations</h2>
        {results.length === 0 && !remixing ? (
          <div style={{ color: '#9aa0a8' }}>
            {modelState === 'ready'
              ? 'Pick a seed, click Remix, listen to 3 variations.'
              : 'Load the model to start.'}
          </div>
        ) : (
          <div className="cards">
            {results.map((r, i) => (
              <VariationCard
                key={i}
                result={r}
                index={i}
                playing={playingIdx === i}
                liked={likedIdx.has(i)}
                focused={false}
                onPlay={() => handlePlay(i, r.variation?.variation_code ?? '')}
                onStop={handleStop}
                onLike={() => handleLike(i)}
              />
            ))}
            {remixing &&
              Array.from({ length: 3 - results.length }).map((_, i) => (
                <div key={`pending-${i}`} className="card card-pending">
                  <div className="card-head">
                    <span className="card-num">{results.length + i + 1}</span>
                    <span className="card-label">generating…</span>
                  </div>
                  <div className="shimmer" />
                </div>
              ))}
          </div>
        )}
      </div>

      <footer className="app-foot">
        <a href="?spike">Day-1 spike harness →</a>
      </footer>
    </div>
  );
}
