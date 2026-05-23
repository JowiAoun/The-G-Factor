import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { play, stop, clearLastError } from '../strudel/engine';
import { remixSeed } from '../remix/orchestrate';
import { addTournamentWin } from '../memory/taste';
import { hashSeed, preloadAvatar } from '../talent/avatar';
import {
  chooseWinner,
  createBracket,
  currentMatch,
  type BracketState,
  type Contestant,
} from '../talent/bracket';
import { ContestantCard } from './Contestant';
import { MatchView } from './Match';
import { BracketView } from './BracketView';
import { Confetti } from './Confetti';
import { CastingStage } from './CastingStage';

const REVEAL_DURATION_MS = 1500;

type Phase = 'setup' | 'casting' | 'showing' | 'champion';

type TalentShowProps = {
  modelReady: boolean;
  seedCode: string;
  onChampionSaved?: () => void;
  /** Hand the bracket champion off to the Studio for further chat editing. */
  onContinueInStudio?: (mixCode: string, label: string) => void;
};

function TalentShowInner({
  modelReady,
  seedCode,
  onChampionSaved,
  onContinueInStudio,
}: TalentShowProps) {
  const [bracketSize, setBracketSize] = useState<4 | 8>(4);
  const [phase, setPhase] = useState<Phase>('setup');
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [championSaved, setChampionSaved] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const playLock = useRef(false);
  const autoSaveTimer = useRef<number | null>(null);
  const revealTimer = useRef<number | null>(null);
  const castingStartedAt = useRef<number>(0);
  // Monotonic id of the current run. Bumped on every Hold-the-show and on
  // every reset so in-flight `remixSeed` callbacks can detect that the run
  // they belong to was abandoned and discard their state updates.
  const runIdRef = useRef(0);

  const handleHoldShow = useCallback(async () => {
    if (!modelReady || phase === 'casting') return;
    const trimmed = seedCode.trim();
    if (!trimmed) return;
    stop();
    setEngineError(null);
    setPhase('casting');
    setContestants([]);
    setBracket(null);
    setChampionSaved(false);
    setPlayingId(null);
    setRevealing(false);
    castingStartedAt.current = performance.now();
    const runId = ++runIdRef.current;

    const collected: Contestant[] = [];
    try {
      await remixSeed(trimmed, bracketSize, (result, index) => {
        if (runIdRef.current !== runId) return;
        const variation = result.variation;
        const valid = result.status === 'valid' && variation;
        const avatarSeed = hashSeed(
          `${trimmed}|${index}|${variation?.variation_code ?? `dnf-${index}`}`,
        );
        // Pre-warm cache for all five mouth states.
        preloadAvatar(avatarSeed);
        const c: Contestant = {
          id: `c-${index}`,
          label: variation?.transformation_label ?? `Contestant ${index + 1}`,
          code: variation?.variation_code ?? '',
          explanation:
            variation?.explanation_one_line ??
            result.attempts.at(-1)?.error ??
            'generation failed',
          avatarSeed,
          status: valid ? 'valid' : 'dnf',
        };
        collected.push(c);
        setContestants([...collected]);
      });
      if (runIdRef.current !== runId) return;
      const initial = createBracket(collected);
      setBracket(initial);
      if (initial.champion) {
        // One-valid-contestant edge case: jump straight to the
        // champion scene, skipping the curtain-reveal beat.
        setPhase('champion');
      } else {
        // Theatrical reveal: Buzz delivers a final line, the
        // curtains slide outward (~800 ms), then the bracket mounts.
        setRevealing(true);
        revealTimer.current = window.setTimeout(() => {
          if (runIdRef.current !== runId) return;
          setPhase('showing');
          setRevealing(false);
          revealTimer.current = null;
        }, REVEAL_DURATION_MS);
      }
    } catch (err) {
      if (runIdRef.current !== runId) return;
      setEngineError(err instanceof Error ? err.message : String(err));
      setPhase('setup');
      setRevealing(false);
    }
  }, [modelReady, phase, seedCode, bracketSize]);

  const handlePlay = useCallback(async (cid: string, code: string) => {
    if (playLock.current) return;
    playLock.current = true;
    setEngineError(null);
    clearLastError();
    try {
      stop();
      await play(code);
      setPlayingId(cid);
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : String(err));
    } finally {
      playLock.current = false;
    }
  }, []);

  const handleStop = useCallback(() => {
    stop();
    setPlayingId(null);
  }, []);

  const handleChoose = useCallback((winnerId: string) => {
    setBracket((b) => {
      if (!b) return b;
      const m = currentMatch(b);
      if (!m) return b;
      const next = chooseWinner(b, m.id, winnerId);
      if (next.champion) {
        // Tiny delay so winner-jump and loser-fade can finish before the
        // champion scene crossfades in.
        window.setTimeout(() => setPhase('champion'), 700);
      }
      return next;
    });
    stop();
    setPlayingId(null);
  }, []);

  const persistChampion = useCallback(async () => {
    if (!bracket?.champion || championSaved) return;
    const champ = bracket.champion;
    const defeated: string[] = [];
    for (const m of bracket.matches) {
      if (!m.winnerId || !m.loserId) continue;
      if (m.winnerId === champ.id) {
        const loser = bracket.contestants.find((c) => c.id === m.loserId);
        if (loser) defeated.push(loser.label);
      }
    }
    try {
      await addTournamentWin({
        seed_code: seedCode.trim(),
        variation_code: champ.code,
        transformation_label: champ.label,
        explanation_one_line: champ.explanation,
        avatar_seed: champ.avatarSeed,
        tournament: {
          size: bracket.size,
          rounds_beaten: defeated.length,
          defeated_labels: defeated,
        },
      });
      setChampionSaved(true);
      onChampionSaved?.();
    } catch (err) {
      setEngineError(
        `taste store: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [bracket, championSaved, seedCode, onChampionSaved]);

  // Auto-save champion 3 s after the scene mounts if the user hasn't acted.
  useEffect(() => {
    if (phase !== 'champion' || !bracket?.champion || championSaved) return;
    autoSaveTimer.current = window.setTimeout(() => {
      void persistChampion();
    }, 3000);
    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
  }, [phase, bracket?.champion, championSaved, persistChampion]);

  // Stop audio on unmount (e.g. mode switch back to Remix Studio)
  // and clear any in-flight reveal timer so it can't fire post-unmount.
  useEffect(
    () => () => {
      stop();
      if (revealTimer.current) {
        window.clearTimeout(revealTimer.current);
        revealTimer.current = null;
      }
    },
    [],
  );

  const handleReset = useCallback(() => {
    // Invalidate any in-flight remixSeed callbacks for the previous run.
    runIdRef.current++;
    if (revealTimer.current) {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    stop();
    setPhase('setup');
    setContestants([]);
    setBracket(null);
    setPlayingId(null);
    setChampionSaved(false);
    setEngineError(null);
    setRevealing(false);
  }, []);

  return (
    <>
      {phase === 'setup' && (
        <div className="panel">
          <div className="taste-head">
            <h2 style={{ margin: 0 }}>🎪 Talent Show</h2>
            <div className="bracket-size-toggle" role="radiogroup" aria-label="Bracket size">
              <button
                className={bracketSize === 4 ? 'primary' : 'muted'}
                onClick={() => setBracketSize(4)}
                role="radio"
                aria-checked={bracketSize === 4}
              >
                4 contestants
              </button>
              <button
                className={bracketSize === 8 ? 'primary' : 'muted'}
                onClick={() => setBracketSize(8)}
                role="radio"
                aria-checked={bracketSize === 8}
              >
                8 contestants
              </button>
            </div>
          </div>
          <p style={{ color: '#9aa0a8', fontSize: '0.92rem', marginTop: 10 }}>
            Gemma generates {bracketSize} variations of the current seed; each gets a face. Pick one from
            every pair until a champion is crowned — and the champion gets a 🏆 entry in your taste memory.
          </p>
          <div className="setup-seed-row">
            <span className="setup-seed-label">Starting from</span>
            <code className="setup-seed-code">
              {seedCode.trim() || '<no seed yet — pick one from the gallery>'}
            </code>
          </div>
          <button
            className="primary"
            onClick={handleHoldShow}
            disabled={!modelReady || !seedCode.trim()}
            style={{ marginTop: 8 }}
          >
            {modelReady ? '🎪 Hold the show' : 'Load the model first'}
          </button>
          {engineError && (
            <div className="errors" style={{ marginTop: 10 }}>
              {engineError}
            </div>
          )}
        </div>
      )}

      {(phase === 'casting' || phase === 'showing') && (
        <div className="talentshow-toolbar">
          <button
            className="muted talentshow-restart-btn"
            onClick={handleReset}
            title={
              phase === 'casting'
                ? 'Stop casting and return to setup'
                : 'Discard this bracket and return to setup'
            }
          >
            🔁 Restart show
          </button>
        </div>
      )}

      {phase === 'casting' && (
        <CastingStage
          bracketSize={bracketSize}
          contestantsReady={contestants.length}
          startedAt={castingStartedAt.current}
          revealing={revealing}
        />
      )}

      {phase === 'showing' && bracket && (
        <>
          <BracketView state={bracket} />
          {currentMatch(bracket) && (
            <MatchView
              match={currentMatch(bracket)!}
              totalMatches={bracket.matches.length}
              matchIndex={bracket.cursor}
              rounds={bracket.rounds}
              playingId={playingId}
              onPlay={handlePlay}
              onStop={handleStop}
              onChoose={handleChoose}
            />
          )}
          {engineError && <div className="errors">{engineError}</div>}
        </>
      )}

      {phase === 'champion' && bracket?.champion && (
        <div className="panel champion-scene">
          <Confetti />
          <div className="champion-spotlight">
            <ContestantCard
              contestant={bracket.champion}
              state="champion"
              compact
            />
          </div>
          <div className="champion-actions">
            {!championSaved ? (
              <button className="primary" onClick={persistChampion}>
                🏆 Save champion to taste
              </button>
            ) : (
              <span className="champion-saved">🏆 saved to taste memory</span>
            )}
            <button
              onClick={() =>
                handlePlay(bracket.champion!.id, bracket.champion!.code)
              }
              disabled={playingId === bracket.champion.id}
            >
              ▶ Play once more
            </button>
            <button onClick={handleStop} disabled={playingId === null}>
              ⏹ Stop
            </button>
            {onContinueInStudio && (
              <button
                onClick={() =>
                  onContinueInStudio(
                    bracket.champion!.code,
                    bracket.champion!.label,
                  )
                }
                title="Send the champion to the Studio for chat editing"
              >
                🎛 Continue in Studio
              </button>
            )}
            <button onClick={handleReset} className="muted">
              🔁 Hold another show
            </button>
          </div>
          {engineError && (
            <div className="errors" style={{ marginTop: 10 }}>
              {engineError}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Memoised so the rapid `setProgressPct` / `setProgressMsg` updates during
// model download don't re-render the whole talent-show tree — the component
// only depends on `modelReady` (one transition) and `seedCode` (rare while
// downloading). Without this the main thread saturates on big downloads.
export const TalentShow = memo(TalentShowInner);
