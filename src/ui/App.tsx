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
import {
  getCacheInfo,
  formatBytes,
  type CacheInfo,
} from '../model/cache-info';
import { SEED_GALLERY, type GallerySeed } from '../seeds/gallery';
import { TasteSidebar } from './TasteSidebar';
import { TalentShow } from './TalentShow';
import { Studio } from './Studio';

type ModelState = 'idle' | 'loading' | 'ready' | 'error';
export type AppMode = 'remix' | 'talentshow';

export function App({ initialMode = 'remix' }: { initialMode?: AppMode } = {}) {
  const [mode, setMode] = useState<AppMode>(initialMode);

  const [modelState, setModelState] = useState<ModelState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(
    () => loadSavedProgress(),
  );
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);

  const [seedCode, setSeedCode] = useState(SEED_GALLERY[0].code);
  const [activeSeedId, setActiveSeedId] = useState(SEED_GALLERY[0].id);
  const [tasteVersion, setTasteVersion] = useState(0);

  const refreshCacheInfo = useCallback(async () => {
    try {
      setCacheInfo(await getCacheInfo());
    } catch {
      setCacheInfo(null);
    }
  }, []);
  useEffect(() => {
    void refreshCacheInfo();
  }, [refreshCacheInfo]);

  // Mirror active tab into the URL so refresh + deep-link both work.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (mode === 'talentshow') url.searchParams.set('talentshow', '1');
    else url.searchParams.delete('talentshow');
    window.history.replaceState({}, '', url.toString());
  }, [mode]);

  // Throttle progress callbacks to ~10/sec so the main thread isn't
  // saturated by re-renders during the 1.5 GB model download.
  const lastProgressTs = useRef(0);
  const savedAtPct = useRef(0);
  const onLoadProgress = useCallback((p: LoadProgress) => {
    if (p.status === 'progress' && typeof p.progress === 'number') {
      const now = performance.now();
      if (p.progress < 99 && now - lastProgressTs.current < 100) return;
      lastProgressTs.current = now;
      setProgressPct(p.progress);
      setProgressMsg(`${p.status} ${p.file ?? ''} ${p.progress.toFixed(1)}%`);
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
      clearSavedProgress();
      setSavedProgress(null);
      savedAtPct.current = 0;
      void refreshCacheInfo();
    } catch (err) {
      setModelError(err instanceof Error ? err.message : String(err));
      setModelState('error');
      void refreshCacheInfo();
    }
  }, [onLoadProgress, refreshCacheInfo]);

  const handleSelectSeed = useCallback((s: GallerySeed) => {
    setActiveSeedId(s.id);
    setSeedCode(s.code);
  }, []);

  const bumpTaste = useCallback(() => setTasteVersion((v) => v + 1), []);
  const handleTasteCleared = useCallback(() => {
    /* sidebar will re-fetch; no app-level state to clear */
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
        <div className="mode-tabs" role="tablist">
          <button
            className={`mode-tab${mode === 'remix' ? ' active' : ''}`}
            role="tab"
            aria-selected={mode === 'remix'}
            onClick={() => {
              if (mode === 'remix') return;
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
        {cacheInfo && (
          <div
            className="cache-info"
            title={cacheInfo.cacheNames.join(', ') || 'no transformers cache buckets found'}
          >
            {cacheInfo.modelEntryCount > 0 ? (
              <>
                🧊 <b>{formatBytes(cacheInfo.modelBytes)}</b> cached locally
                {' · '}
                {cacheInfo.modelEntryCount} file
                {cacheInfo.modelEntryCount === 1 ? '' : 's'}
                {cacheInfo.totalOriginBytes != null && (
                  <>
                    {' · '}origin uses {formatBytes(cacheInfo.totalOriginBytes)}
                    {cacheInfo.quotaBytes
                      ? ` of ${formatBytes(cacheInfo.quotaBytes)} quota`
                      : ''}
                  </>
                )}
              </>
            ) : (
              <>
                🆕 no cached weights yet — first load downloads ~1.5 GB
                {cacheInfo.totalOriginBytes != null &&
                  cacheInfo.totalOriginBytes > 1024 * 1024 && (
                    <>
                      {' · '}origin already holds {formatBytes(cacheInfo.totalOriginBytes)} (other caches)
                    </>
                  )}
              </>
            )}
            <button
              className="muted"
              style={{ marginLeft: 8, fontSize: '0.78rem', padding: '2px 8px' }}
              onClick={() => void refreshCacheInfo()}
              title="Re-query Cache Storage"
            >
              ↻
            </button>
          </div>
        )}
      </div>

      {mode === 'talentshow' && (
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
      )}

      {mode === 'remix' && (
        <Studio
          modelReady={modelState === 'ready'}
          onSavedChange={bumpTaste}
          tasteVersion={tasteVersion}
        />
      )}

      {mode === 'talentshow' && (
        <TalentShow
          modelReady={modelState === 'ready'}
          seedCode={seedCode}
          onChampionSaved={bumpTaste}
        />
      )}

      <TasteSidebar version={tasteVersion} onCleared={handleTasteCleared} />

      <footer className="app-foot">
        <a href="?spike">Day-1 spike harness →</a>
      </footer>
    </div>
  );
}
