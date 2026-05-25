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
import {
  getMode,
  getStoredApiKey,
  hasMadeBackendChoice,
  subscribeBackendChange,
} from '../model/backend';
import { pickRandomSeed } from '../seeds/gallery';
import { loadDraft, seedStudioDraft } from '../studio/storage';
import { TalentShow } from './TalentShow';
import { Studio } from './Studio';
import { BackendChooserModal } from './BackendChooserModal';
import { Footer } from './Footer';
import { Leaderboard } from './Leaderboard';
import { VenueMap } from './VenueMap';
import { RouteCurtain } from './RouteCurtain';

type ModelState = 'idle' | 'loading' | 'ready' | 'error';
export type AppMode = 'remix' | 'talentshow' | 'leaderboard';

export function App({ initialMode = 'talentshow' }: { initialMode?: AppMode } = {}) {
  const [mode, setMode] = useState<AppMode>(initialMode);
  // Two-stage mode switch so the route-curtain wipe can hide the
  // content swap. Clicking a venue sets `pendingMode`; once the
  // curtains have fully closed, RouteCurtain fires `onHalfway` and
  // we promote pendingMode -> mode (the swap happens off-screen).
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const requestMode = useCallback((next: AppMode) => {
    if (next === mode) return;
    setPendingMode(next);
  }, [mode]);
  const commitPendingMode = useCallback(() => {
    setPendingMode((next) => {
      if (next != null) setMode(next);
      return null;
    });
  }, []);

  const [modelState, setModelState] = useState<ModelState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(
    () => loadSavedProgress(),
  );
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);

  // The Talent Show no longer asks the user to pick a seed - the AI auto-picks
  // from `SEED_GALLERY` on cold load and again after every show via the
  // `onShowFinished` callback. `lastPickedIdRef` keeps successive picks from
  // landing on the same seed twice in a row.
  const lastPickedIdRef = useRef<string | null>(null);
  const [seedCode, setSeedCode] = useState(() => {
    const initial = pickRandomSeed();
    lastPickedIdRef.current = initial.id;
    return initial.code;
  });
  const [tasteVersion, setTasteVersion] = useState(0);

  // Backend chooser state. `backendVersion` increments whenever
  // backend.ts emits a change so derived values like `currentMode`
  // re-read after a save. `firstVisit` controls whether the modal
  // can be dismissed.
  const [backendVersion, setBackendVersion] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(() => !hasMadeBackendChoice());
  const [firstVisit, setFirstVisit] = useState(() => !hasMadeBackendChoice());
  useEffect(() => {
    const unsub = subscribeBackendChange(() => setBackendVersion((v) => v + 1));
    return unsub;
  }, []);
  const currentMode = getMode();
  const storedApiKey = getStoredApiKey();
  // `effectiveModelReady` short-circuits to true for remote-with-key -
  // there's nothing to download, so Studio + TalentShow can act
  // immediately. Local path stays as today.
  const effectiveModelReady =
    currentMode === 'remote'
      ? !!storedApiKey
      : modelState === 'ready';
  // Reference backendVersion so React re-evaluates derived values
  // (currentMode, effectiveModelReady) when subscribers fire.
  void backendVersion;

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
  // The Talent Show is the canonical "/" landing, so it gets no query
  // param. The Rehearsal Room (?studio=1) and Hall of Fame
  // (?leaderboard=1) live behind explicit params.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('studio');
    url.searchParams.delete('leaderboard');
    url.searchParams.delete('talentshow');
    if (mode === 'remix') url.searchParams.set('studio', '1');
    else if (mode === 'leaderboard') url.searchParams.set('leaderboard', '1');
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

  const handlePickFreshSeed = useCallback(() => {
    const next = pickRandomSeed(lastPickedIdRef.current);
    lastPickedIdRef.current = next.id;
    setSeedCode(next.code);
  }, []);

  // Shared hook for child components (Studio + TalentShow) so the
  // "OpenRouter key required" toast can offer a one-click jump into
  // the backend chooser.
  const handleOpenSettings = useCallback(() => {
    setFirstVisit(false);
    setSettingsOpen(true);
  }, []);

  const bumpTaste = useCallback(() => setTasteVersion((v) => v + 1), []);

  /**
   * Studio → Talent Show bridge: switch tabs with the current mix as the seed.
   * One-shot - the next show after this one runs goes back to auto-pick via
   * `onShowFinished`.
   */
  const handleBracketFromStudio = useCallback((mixCode: string) => {
    setSeedCode(mixCode);
    setMode('talentshow');
  }, []);

  /** Talent Show → Studio bridge: seed the studio draft with the champion. */
  const handleContinueInStudio = useCallback(
    (champMixCode: string, champLabel: string) => {
      const existing = loadDraft();
      const hasContent =
        !!existing &&
        (existing.mix_code.trim().length > 0 || existing.history.length > 1);
      if (hasContent) {
        const ok = window.confirm(
          'Continue this champion in the Studio? Your current draft will be replaced. Saved entries in your library are kept.',
        );
        if (!ok) return;
      }
      seedStudioDraft(champMixCode, champLabel);
      setMode('remix');
    },
    [],
  );

  const device = getDetectedDevice();

  return (
    <div className="app">
      <header className="app-head">
        <div className="wordmark" aria-label="The G Factor">
          <img
            className="wordmark-logo"
            src="/assets/logo.png"
            alt=""
            width={88}
            height={88}
          />
          <span className="wordmark-text">
            <span className="wordmark-the">THE</span>
            <span className="wordmark-g" aria-hidden="true">G</span>
            <span className="wordmark-factor">FACTOR</span>
          </span>
        </div>
        <div className="sub">
          Where Gemma learns your sound, live.{' '}
          <span
            className="brand-explain"
            title="The g factor is psychology's name for general intelligence: the broad cognitive capacity behind diverse tasks. We use Gemma as the engine."
          >
            G = general intelligence × Gemma
          </span>
        </div>
      </header>

      <VenueMap
        mode={pendingMode ?? mode}
        onSelect={requestMode}
        onOpenSettings={handleOpenSettings}
      />
      <RouteCurtain targetKey={pendingMode ?? mode} onHalfway={commitPendingMode} />

      {currentMode !== 'remote' && mode !== 'leaderboard' && (
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
                    ? `previous attempt reached ${savedProgress.pct.toFixed(0)}% - completed shards are cached, resume skips them`
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
                🆕 no cached weights yet - first load downloads ~1.5 GB
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
      )}

      {mode === 'remix' && (
        <Studio
          modelReady={effectiveModelReady}
          currentMode={currentMode}
          onSavedChange={bumpTaste}
          tasteVersion={tasteVersion}
          onBracketCurrent={handleBracketFromStudio}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {mode === 'talentshow' && (
        <TalentShow
          modelReady={effectiveModelReady}
          currentMode={currentMode}
          seedCode={seedCode}
          onChampionSaved={bumpTaste}
          onContinueInStudio={handleContinueInStudio}
          onShowFinished={handlePickFreshSeed}
          onReroll={handlePickFreshSeed}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {mode === 'leaderboard' && <Leaderboard version={tasteVersion} />}

      <Footer />

      {settingsOpen && (
        <BackendChooserModal
          isFirstVisit={firstVisit}
          onClose={() => {
            setSettingsOpen(false);
            setFirstVisit(false);
          }}
        />
      )}
    </div>
  );
}
