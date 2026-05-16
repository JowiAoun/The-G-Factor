import { useCallback, useMemo, useRef, useState } from 'react';
import { loadModel, getDetectedDevice, type LoadProgress } from '../model/gemma';
import { play, stop, getLastError, clearLastError } from '../strudel/engine';
import { runSpike, SPIKE_TOTAL, type SpikeRow } from './run';

type Verdict = 'unknown' | 'yes' | 'no';
type ModelState = 'idle' | 'loading' | 'ready' | 'error';

function badgeForStatus(s: SpikeRow['result']['status']) {
  if (s === 'valid') return <span className="badge ok">parsed</span>;
  if (s === 'invalid_strudel') return <span className="badge warn">bad strudel</span>;
  if (s === 'invalid_json' || s === 'invalid_shape')
    return <span className="badge bad">bad json</span>;
  return <span className="badge bad">error</span>;
}

function verdictClass(passed: number, interesting: number): string {
  if (passed < 10) return 'fail';
  if (interesting >= 8) return 'pass';
  if (interesting >= 6) return 'marginal';
  return 'fail';
}

function verdictLabel(passed: number, interesting: number, totalScored: number): string {
  if (totalScored < SPIKE_TOTAL) return `awaiting verdicts (${totalScored}/${SPIKE_TOTAL} scored)`;
  if (passed < 10) return `FAIL — parse rate ${passed}/15 < 10`;
  if (interesting >= 8) return `PASS — ${interesting}/15 interesting`;
  if (interesting >= 6) return `MARGINAL — ${interesting}/15 interesting (try 4B)`;
  return `FAIL — only ${interesting}/15 interesting (pivot to Sigil)`;
}

export function SpikeApp() {
  const [modelState, setModelState] = useState<ModelState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<SpikeRow[]>([]);
  const [spikeProgress, setSpikeProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: SPIKE_TOTAL,
  });

  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
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
      const msg = err instanceof Error ? err.message : String(err);
      setModelError(msg);
      setModelState('error');
    }
  }, [onLoadProgress]);

  const handleRunSpike = useCallback(async () => {
    if (modelState !== 'ready' || running) return;
    setRunning(true);
    setRows([]);
    setVerdicts({});
    try {
      const result = await runSpike((p) => {
        setRows(p.rows);
        setSpikeProgress({ done: p.done, total: p.total });
      });
      setRows(result);
    } finally {
      setRunning(false);
    }
  }, [modelState, running]);

  const handlePlay = useCallback(async (id: string, code: string) => {
    if (playLock.current) return;
    playLock.current = true;
    setEngineError(null);
    clearLastError();
    try {
      stop();
      await play(code);
      setPlayingId(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setEngineError(msg);
    } finally {
      playLock.current = false;
    }
  }, []);

  const handleStop = useCallback(() => {
    stop();
    setPlayingId(null);
    const e = getLastError();
    if (e) setEngineError(e);
  }, []);

  const handleVerdict = useCallback((id: string, v: Verdict) => {
    setVerdicts((prev) => ({ ...prev, [id]: v }));
  }, []);

  const handleExport = useCallback(() => {
    const payload = {
      timestamp: new Date().toISOString(),
      model: 'onnx-community/gemma-4-E2B-it-ONNX',
      device: getDetectedDevice(),
      rows: rows.map((r) => ({
        seed_id: r.seed.id,
        seed_code: r.seed.code,
        variation_index: r.variationIndex,
        status: r.result.status,
        attempts: r.result.attempts.length,
        duration_ms: r.result.durationMs,
        variation: r.result.variation,
        last_error: r.result.attempts.at(-1)?.error,
        verdict: verdicts[r.id] ?? 'unknown',
      })),
      tally: {
        total: rows.length,
        parsed: rows.filter((r) => r.result.status === 'valid').length,
        interesting: Object.values(verdicts).filter((v) => v === 'yes').length,
        not_interesting: Object.values(verdicts).filter((v) => v === 'no').length,
        unscored: rows.length - Object.values(verdicts).filter((v) => v !== 'unknown').length,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spike-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows, verdicts]);

  const parsedCount = useMemo(
    () => rows.filter((r) => r.result.status === 'valid').length,
    [rows],
  );
  const interestingCount = useMemo(
    () => Object.values(verdicts).filter((v) => v === 'yes').length,
    [verdicts],
  );
  const totalScored = useMemo(
    () => Object.values(verdicts).filter((v) => v !== 'unknown').length,
    [verdicts],
  );

  return (
    <div className="app">
      <h1>Strudel Tutor — Day 1 Spike</h1>
      <div className="sub">
        Gemma 4 E2B (q4 ONNX) → 5 seeds × 3 variations → parse + listen → verdict.
      </div>

      <div className="panel">
        <h2>Model</h2>
        <div className="row">
          <button
            className="primary"
            onClick={handleLoad}
            disabled={modelState === 'loading' || modelState === 'ready'}
          >
            {modelState === 'ready' ? 'Loaded' : modelState === 'loading' ? 'Loading…' : 'Load Gemma 4 E2B'}
          </button>
          <div className="progressbar">
            <div style={{ width: `${progressPct}%` }} />
          </div>
          <span style={{ fontSize: '0.85rem', color: '#9aa0a8' }}>
            {progressMsg || (modelState === 'idle' ? 'click to download (~1.5 GB)' : '')}
          </span>
        </div>
        {modelError && <div className="errors">load error: {modelError}</div>}
      </div>

      <div className="panel">
        <h2>Spike</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          <button
            className="primary"
            onClick={handleRunSpike}
            disabled={modelState !== 'ready' || running}
          >
            {running ? `Running ${spikeProgress.done}/${spikeProgress.total}…` : 'Run spike'}
          </button>
          <button onClick={handleStop} disabled={!playingId}>
            ⏹ Stop audio
          </button>
          <button onClick={handleExport} disabled={rows.length === 0} className="muted">
            ⬇ Export JSON
          </button>
          <div style={{ flex: 1 }} />
          <div className="tally">
            <div>
              <b>{parsedCount}</b>
              <span style={{ fontSize: '0.78rem', color: '#9aa0a8' }}>parsed / {rows.length}</span>
            </div>
            <div>
              <b>{interestingCount}</b>
              <span style={{ fontSize: '0.78rem', color: '#9aa0a8' }}>interesting</span>
            </div>
          </div>
        </div>
        <div className={`verdict ${rows.length === SPIKE_TOTAL ? verdictClass(parsedCount, interestingCount) : 'pending'}`}>
          {verdictLabel(parsedCount, interestingCount, totalScored)}
        </div>
        {engineError && (
          <div className="errors" style={{ marginTop: 10 }}>
            engine error: {engineError}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Results</h2>
        {rows.length === 0 ? (
          <div style={{ color: '#9aa0a8' }}>No results yet — load the model, then run the spike.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Seed</th>
                <th>#</th>
                <th>Status</th>
                <th>Code</th>
                <th>Play</th>
                <th>Interesting?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const code = r.result.variation?.variation_code ?? '';
                const label = r.result.variation?.transformation_label;
                const verdict = verdicts[r.id] ?? 'unknown';
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.seed.label}</div>
                      <div className="code" style={{ color: '#9aa0a8', fontSize: '0.78rem' }}>
                        {r.seed.code}
                      </div>
                    </td>
                    <td>{r.variationIndex + 1}</td>
                    <td>{badgeForStatus(r.result.status)}</td>
                    <td className="code">
                      {label && <div className="label">{label}</div>}
                      {code || <span style={{ color: '#9aa0a8' }}>(no valid output)</span>}
                      {r.result.attempts.at(-1)?.error && (
                        <div style={{ color: '#c8888d', fontSize: '0.75rem', marginTop: 4 }}>
                          {r.result.attempts.at(-1)?.error}
                        </div>
                      )}
                    </td>
                    <td>
                      {code ? (
                        <button
                          onClick={() => (playingId === r.id ? handleStop() : handlePlay(r.id, code))}
                        >
                          {playingId === r.id ? '⏹' : '▶'}
                        </button>
                      ) : (
                        <span style={{ color: '#666' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={verdict === 'yes' ? 'yes' : 'muted'}
                        onClick={() => handleVerdict(r.id, verdict === 'yes' ? 'unknown' : 'yes')}
                        disabled={!code}
                      >
                        Y
                      </button>{' '}
                      <button
                        className={verdict === 'no' ? 'no' : 'muted'}
                        onClick={() => handleVerdict(r.id, verdict === 'no' ? 'unknown' : 'no')}
                        disabled={!code}
                      >
                        N
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
