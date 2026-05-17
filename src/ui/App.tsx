import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadModel,
  getDetectedDevice,
  DEFAULT_MODEL_ID,
  type LoadProgress,
} from '../model/gemma';
import {
  loadSavedProgress,
  saveProgress,
  clearSavedProgress,
  type SavedProgress,
} from '../model/progress-storage';
import { play, stop, getLastError, clearLastError } from '../strudel/engine';
import { remixSeed } from '../remix/orchestrate';
import type { GenerationResult } from '../remix/generate';
import { addLike, deleteLike } from '../memory/taste';
import { SEED_GALLERY, type GallerySeed } from '../seeds/gallery';
import { VariationCard } from './VariationCard';
import { TasteSidebar } from './TasteSidebar';
import { TalentShow } from './TalentShow';

type ModelState = 'idle' | 'loading' | 'ready' | 'error';
export type AppMode = 'remix' | 'talentshow';

export function App({ initialMode = 'remix' }: { initialMode?: AppMode } = {}) {
  const [mode, setMode] = useState<AppMode>(initialMode);

  const [modelState, setModelState] = useState<ModelState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  // Persisted hint of how far the last load attempt got — used to surface
  // "Resume — last reached N%" on the Load button. The actual model shards
  // are cached per-file by transformers.js (Cache Storage API), so resuming
  // skips every completed shard automatically.
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(
    () => loadSavedProgress(),
  );

  const [seedCode, setSeedCode] = useState(SEED_GALLERY[0].code);
  const [activeSeedId, setActiveSeedId] = useState<string>(SEED_GALLERY[0].id);
  const [remixing, setRemixing] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<Record<number, string>>({});
  const [tasteVersion, setTasteVersion] = useState(0);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [usedExemplars, setUsedExemplars] = useState(0);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const playLock = useRef(false);

  // Mirror mode to URL so the tab survives reload + deep-link.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (mode === 'talentshow') url.searchParams.set('talentshow', '1');
    else url.searchParams.delete('talentshow');
    window.history.replaceState({}, '', url.toString());
  }, [mode]);

  // transformers.js fires `progress_callback` once per streamed chunk — for a
  // 1.5 GB download that's hundreds of calls per second, each of which would
  // setState → re-render the entire app and saturate the main thread (the
  // page would freeze mid-download). Throttle 'progress' events to ~10/sec;
  // status transitions like 'ready' / 'done' always pass through.
  const lastProgressTs = useRef(0);
  const savedAtPct = useRef(0);
  const onLoadProgress = useCallback((p: LoadProgress) => {
    if (p.status === 'progress' && typeof p.progress === 'number') {
      const now = performance.now();
      // Always show the final 100% tick, otherwise throttle.
      if (p.progress < 99 && now - lastProgressTs.current < 100) return;
      lastProgressTs.current = now;
      setProgressPct(p.progress);
      setProgressMsg(`${p.status} ${p.file ?? ''} ${p.progress.toFixed(1)}%`);
      // Persist the high-water mark every 5% so a mid-download refresh
      // restores the "last reached" hint. Skip the noisy per-tick writes.
      if (p.progress - savedAtPct.current >= 5 && p.progress < 99) {
        savedAtPct.current = p.progress;
        saveProgress(p.progress, DEFAULT_MODEL_ID);
      }
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
      // Full success → drop the resume hint and reset the high-water mark.
      clearSavedProgress();
      setSavedProgress(null);
      savedAtPct.current = 0;
    } catch (err) {
      setModelError(err instanceof Error ? err.message : String(err));
      setModelState('error');
    }
  }, [onLoadProgress]);

  const handleSelectSeed = useCallback((s: GallerySeed) => {
    setActiveSeedId(s.id);
    setSeedCode(s.code);
    setResults([]);
    setLikedIds({});
    setPlayingIdx(null);
    setUsedExemplars(0);
    stop();
  }, []);

  const handleRemix = useCallback(async () => {
    if (modelState !== 'ready' || remixing) return;
    const trimmed = seedCode.trim();
    if (!trimmed) return;
    setRemixing(true);
    setResults([]);
    setLikedIds({});
    setPlayingIdx(null);
    setUsedExemplars(0);
    stop();
    try {
      const out = await remixSeed(trimmed, 3, (latest) => {
        setResults((prev) => [...prev, latest]);
      });
      setUsedExemplars(out.context.exemplars.length);
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

  const handleLike = useCallback(
    async (idx: number) => {
      const r = results[idx];
      if (!r?.variation || r.status !== 'valid') return;
      const existing = likedIds[idx];
      try {
        if (existing) {
          await deleteLike(existing);
          setLikedIds((prev) => {
            const { [idx]: _drop, ...rest } = prev;
            return rest;
          });
        } else {
          const like = await addLike({
            seed_code: seedCode.trim(),
            variation_code: r.variation.variation_code,
            transformation_label: r.variation.transformation_label,
            explanation_one_line: r.variation.explanation_one_line,
          });
          setLikedIds((prev) => ({ ...prev, [idx]: like.id }));
        }
        setTasteVersion((v) => v + 1);
      } catch (err) {
        setEngineError(
          `taste store: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [results, likedIds, seedCode],
  );

  const handleTasteCleared = useCallback(() => {
    setLikedIds({});
  }, []);

  const bumpTaste = useCallback(() => {
    setTasteVersion((v) => v + 1);
  }, []);

  // Keyboard shortcuts — only active in Remix Studio. Talent Show is mouse-driven.
  useEffect(() => {
    if (mode !== 'remix') return;
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || t.isContentEditable;
    }
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === '1' || k === '2' || k === '3') {
        const idx = Number(k) - 1;
        const r = results[idx];
        if (!r?.variation || r.status !== 'valid') return;
        e.preventDefault();
        setFocusedIdx(idx);
        if (playingIdx === idx) handleStop();
        else void handlePlay(idx, r.variation.variation_code);
      } else if (k === 'l') {
        if (results[focusedIdx]?.status === 'valid') {
          e.preventDefault();
          void handleLike(focusedIdx);
        }
      } else if (k === 'r') {
        if (modelState === 'ready' && !remixing) {
          e.preventDefault();
          void handleRemix();
        }
      } else if (k === 's' || k === 'escape') {
        e.preventDefault();
        handleStop();
      } else if (k === 'p') {
        e.preventDefault();
        void handlePlaySeed();
      } else if (k === 'arrowleft' || k === 'arrowright') {
        if (results.length === 0) return;
        e.preventDefault();
        setFocusedIdx((prev) => {
          const next = k === 'arrowright' ? prev + 1 : prev - 1;
          return Math.max(0, Math.min(results.length - 1, next));
        });
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    mode,
    results,
    focusedIdx,
    playingIdx,
    modelState,
    remixing,
    handlePlay,
    handleStop,
    handleLike,
    handleRemix,
    handlePlaySeed,
  ]);

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
        <div className="mode-tabs" role="tablist">
          <button
            className={`mode-tab${mode === 'remix' ? ' active' : ''}`}
            role="tab"
            aria-selected={mode === 'remix'}
            onClick={() => {
              if (mode === 'remix') return;
              stop();
              setPlayingIdx(null);
              setMode('remix');
            }}
          >
            🎛 Remix Studio
          </button>
          <button
            className={`mode-tab${mode === 'talentshow' ? ' active' : ''}`}
            role="tab"
            aria-selected={mode === 'talentshow'}
            onClick={() => {
              if (mode === 'talentshow') return;
              stop();
              setPlayingIdx(null);
              setMode('talentshow');
            }}
          >
            🎪 Talent Show
          </button>
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
                : savedProgress
                  ? `▶ Resume Gemma 4 E2B (${savedProgress.pct.toFixed(0)}%)`
                  : 'Load Gemma 4 E2B'}
          </button>
          <div className="progressbar">
            <div style={{ width: `${progressPct}%` }} />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#9aa0a8' }}>
            {progressMsg ||
              (modelState === 'idle'
                ? savedProgress
                  ? `previous attempt reached ${savedProgress.pct.toFixed(0)}% — completed shards are cached, resume skips them`
                  : 'click to download (~1.5 GB, cached after)'
                : '')}
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
        {mode === 'remix' && (
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
        )}
        {engineError && mode === 'remix' && (
          <div className="errors" style={{ marginTop: 10 }}>
            engine error: {engineError}
          </div>
        )}
      </div>

      {mode === 'remix' && (
        <div className="panel">
          <div className="taste-head" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Variations</h2>
            {usedExemplars > 0 && (
              <span className="exemplar-pill" title="Top-K liked variations injected into the prompt">
                ♥ {usedExemplars} taste exemplar{usedExemplars === 1 ? '' : 's'} used
              </span>
            )}
          </div>
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
                  liked={!!likedIds[i]}
                  focused={focusedIdx === i && results.length > 0}
                  onPlay={() => {
                    setFocusedIdx(i);
                    handlePlay(i, r.variation?.variation_code ?? '');
                  }}
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
      )}

      {mode === 'talentshow' && (
        <TalentShow
          modelReady={modelState === 'ready'}
          seedCode={seedCode}
          onChampionSaved={bumpTaste}
        />
      )}

      <TasteSidebar version={tasteVersion} onCleared={handleTasteCleared} />

      {mode === 'remix' && (
        <div className="shortcut-bar" aria-hidden="true">
          <kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> play · <kbd>←</kbd>/<kbd>→</kbd> focus ·{' '}
          <kbd>L</kbd> like · <kbd>R</kbd> remix · <kbd>P</kbd> seed · <kbd>S</kbd> stop
        </div>
      )}

      <footer className="app-foot">
        <a href="?spike">Day-1 spike harness →</a>
      </footer>
    </div>
  );
}
