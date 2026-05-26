import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { play, stop, clearLastError } from '../strudel/engine';
import { remixSeed } from '../remix/orchestrate';
import { addTournamentWin } from '../memory/taste';
import { preloadAvatar } from '../talent/avatar';
import { pickCharactersForBracket } from '../talent/characters';
import { getStoredApiKey, type BackendMode } from '../model/backend';
import {
  chooseWinner,
  createBracket,
  currentMatch,
  type BracketState,
  type Contestant,
} from '../talent/bracket';
import { MatchView } from './Match';
import { BracketView } from './BracketView';
import { Confetti } from './Confetti';
import { CastingStage } from './CastingStage';
import { TalentStage, type CurtainState } from './TalentStage';
import { Performer } from './Performer';
import { Toast, useToast } from './Toast';
import { fireGoldenConfetti } from './goldenConfetti';
import { GemmaHost } from './GemmaHost';

const GOLDEN_BUZZ_SHOCK_MS = 1500;

type Phase = 'setup' | 'casting' | 'showing' | 'champion';

const CURTAIN_CLOSE_MS = 700;
const CURTAIN_SETTLE_MS = 50;

type TalentShowProps = {
  modelReady: boolean;
  /**
   * Active backend mode. We use this (rather than just `modelReady`) so we
   * can distinguish "local model not loaded yet" (button stays disabled,
   * user must use the loader) from "remote selected, no OpenRouter key"
   * (button stays clickable so the click can surface a toast pointing at
   * Settings).
   */
  currentMode: BackendMode;
  seedCode: string;
  onChampionSaved?: () => void;
  /** Hand the bracket champion off to the Studio for further chat editing. */
  onContinueInStudio?: (mixCode: string, label: string) => void;
  /**
   * Fired whenever the show wraps up (restart mid-show, or "Hold another
   * show" from the champion scene). App uses this to auto-pick a fresh
   * seed so the next setup phase starts in different musical territory.
   */
  onShowFinished?: () => void;
  /**
   * Re-pick the current setup-phase theme on demand (the 🎲 re-roll button).
   * Same fresh-seed logic as `onShowFinished`, but user-triggered before a
   * show starts rather than after one wraps.
   */
  onReroll?: () => void;
  /** Open the backend chooser modal - wired into the no-key toast CTA. */
  onOpenSettings?: () => void;
};

function TalentShowInner({
  modelReady,
  currentMode,
  seedCode,
  onChampionSaved,
  onContinueInStudio,
  onShowFinished,
  onReroll,
  onOpenSettings,
}: TalentShowProps) {
  const [bracketSize, setBracketSize] = useState<4 | 8>(4);
  // `phase` = what the user / generator has decided we should head to.
  // `renderedPhase` = what is currently mounted on screen. They diverge
  // briefly during curtain transitions: a desired-phase change closes the
  // curtain, then swaps `renderedPhase`, then opens the curtain.
  const [phase, setPhase] = useState<Phase>('setup');
  const [renderedPhase, setRenderedPhase] = useState<Phase>('setup');
  const [curtainState, setCurtainState] = useState<CurtainState>('closed');
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [championSaved, setChampionSaved] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  // Id of the contestant currently in the golden-buzz shock window.
  // Null outside that window. Cleared once the phase flips to champion.
  const [buzzedId, setBuzzedId] = useState<string | null>(null);

  const { toast, showToast, dismissToast } = useToast();

  const playLock = useRef(false);
  // Bumped by every stop intent (handleStop / handleChoose / handleGoldenBuzz
  // / handleReset). handlePlay captures this token before its async
  // play(code), and if it has changed when the await resolves we know a
  // stop was requested mid-flight - we re-stop and skip setPlayingId so
  // the audio play() just started doesn't loop on past the user's intent.
  const playTokenRef = useRef(0);
  const autoSaveTimer = useRef<number | null>(null);
  const castingStartedAt = useRef<number>(0);
  // Pending curtain-choreography timers. Cleared whenever the desired phase
  // changes again or the component unmounts, so a half-finished swing can't
  // fire into a stale `renderedPhase`.
  const curtainTimers = useRef<number[]>([]);
  // Monotonic id of the current run. Bumped on every Hold-the-show and on
  // every reset so in-flight `remixSeed` callbacks can detect that the run
  // they belong to was abandoned and discard their state updates.
  const runIdRef = useRef(0);

  const clearCurtainTimers = useCallback(() => {
    curtainTimers.current.forEach((t) => window.clearTimeout(t));
    curtainTimers.current = [];
  }, []);

  // Curtain choreography: bridge `phase` (desired) to `renderedPhase`
  // (actual) via close -> swap -> open chains. Major-phase swings only -
  // matches advancing within the bracket don't change `phase`, so no
  // curtain runs between matches.
  useEffect(() => {
    clearCurtainTimers();
    if (phase === renderedPhase) return;

    // Mounting the stage from setup: jump to the new rendered phase with
    // curtains already closed, then open them after the browser commits.
    if (renderedPhase === 'setup') {
      setRenderedPhase(phase);
      setCurtainState('closed');
      curtainTimers.current.push(
        window.setTimeout(() => setCurtainState('open'), CURTAIN_SETTLE_MS),
      );
      return clearCurtainTimers;
    }

    // Returning to setup: close curtains, then unmount the stage.
    if (phase === 'setup') {
      setCurtainState('closed');
      curtainTimers.current.push(
        window.setTimeout(() => setRenderedPhase('setup'), CURTAIN_CLOSE_MS),
      );
      return clearCurtainTimers;
    }

    // Mid-flight swap: close, wait for the curtain to actually cover the
    // stage, swap content, settle, open.
    setCurtainState('closed');
    curtainTimers.current.push(
      window.setTimeout(() => {
        setRenderedPhase(phase);
        curtainTimers.current.push(
          window.setTimeout(() => setCurtainState('open'), CURTAIN_SETTLE_MS),
        );
      }, CURTAIN_CLOSE_MS),
    );
    return clearCurtainTimers;
  }, [phase, renderedPhase, clearCurtainTimers]);

  const handleHoldShow = useCallback(async () => {
    if (phase === 'casting') return;
    // Re-read the key at click time - backendVersion-driven re-renders keep
    // `modelReady` fresh, but we want a hard guarantee at the moment of
    // submit so a key cleared mid-session can't slip a bad request through.
    if (currentMode === 'remote' && !getStoredApiKey()) {
      showToast(
        'OpenRouter API key required for remote mode.',
        onOpenSettings
          ? { label: 'Open Settings', onClick: onOpenSettings }
          : undefined,
      );
      return;
    }
    if (!modelReady) return;
    const trimmed = seedCode.trim();
    if (!trimmed) return;
    stop();
    setEngineError(null);
    setPhase('casting');
    setContestants([]);
    setBracket(null);
    setChampionSaved(false);
    setPlayingId(null);
    castingStartedAt.current = performance.now();
    const runId = ++runIdRef.current;

    // Deterministic per-seed roster pick - restarting the same bracket
    // shows the same faces in the same slots.
    const roster = pickCharactersForBracket(trimmed, bracketSize);
    const collected: Contestant[] = [];
    try {
      await remixSeed(trimmed, bracketSize, (result, index) => {
        if (runIdRef.current !== runId) return;
        const variation = result.variation;
        const valid = result.status === 'valid' && variation;
        const character = roster[index];
        // Pre-warm cache for all five mouth states using the character's
        // pinned avatar options.
        preloadAvatar(character.id, character.avatarOptions);
        const c: Contestant = {
          id: `c-${index}`,
          label: variation?.transformation_label ?? `Contestant ${index + 1}`,
          code: variation?.variation_code ?? '',
          explanation:
            variation?.explanation_one_line ??
            result.attempts.at(-1)?.error ??
            'generation failed',
          character,
          status: valid ? 'valid' : 'dnf',
        };
        collected.push(c);
        setContestants([...collected]);
      });
      if (runIdRef.current !== runId) return;
      const initial = createBracket(collected);
      setBracket(initial);
      // Curtain choreography drives the dramatic pause - we just announce
      // the next desired phase and the useEffect closes/swaps/opens.
      setPhase(initial.champion ? 'champion' : 'showing');
    } catch (err) {
      if (runIdRef.current !== runId) return;
      setEngineError(err instanceof Error ? err.message : String(err));
      setPhase('setup');
    }
  }, [modelReady, phase, seedCode, bracketSize, currentMode, showToast, onOpenSettings]);

  const handlePlay = useCallback(async (cid: string, code: string) => {
    if (playLock.current) return;
    playLock.current = true;
    const token = playTokenRef.current;
    setEngineError(null);
    clearLastError();
    try {
      await stop();
      await play(code);
      if (playTokenRef.current !== token) {
        // A stop intent fired during the await - play() resumed the audio
        // context and started a pattern that would now loop indefinitely.
        // Stop again and don't claim playingId for an audio path the user
        // already cancelled.
        stop();
        return;
      }
      setPlayingId(cid);
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : String(err));
    } finally {
      playLock.current = false;
    }
  }, []);

  const handleStop = useCallback(() => {
    playTokenRef.current++;
    stop();
    setPlayingId(null);
  }, []);

  const handleGoldenBuzz = useCallback((winnerId: string) => {
    if (!bracket) return;
    const winner = bracket.contestants.find((c) => c.id === winnerId);
    if (!winner) return;
    setBuzzedId(winnerId);
    playTokenRef.current++;
    stop();
    setPlayingId(null);
    void fireGoldenConfetti();
    // Hold the shock for the full window; the curtain choreography
    // useEffect picks up the phase change afterwards and runs
    // close -> swap -> open over the champion scene.
    window.setTimeout(() => {
      setBracket((b) =>
        b ? { ...b, champion: winner, cursor: b.matches.length } : b,
      );
      setPhase('champion');
      setBuzzedId(null);
    }, GOLDEN_BUZZ_SHOCK_MS);
  }, [bracket]);

  const handleChoose = useCallback((winnerId: string) => {
    setBracket((b) => {
      if (!b) return b;
      const m = currentMatch(b);
      if (!m) return b;
      const next = chooseWinner(b, m.id, winnerId);
      if (next.champion) {
        // Tiny delay so winner-jump and loser-fade can finish before the
        // curtain starts closing for the champion swap.
        window.setTimeout(() => setPhase('champion'), 700);
      }
      return next;
    });
    playTokenRef.current++;
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
        avatar_seed: champ.character.id,
        tournament: {
          size: bracket.size,
          rounds_beaten: defeated.length,
          defeated_labels: defeated,
          champion_character_id: champ.character.id,
          champion_character_name: champ.character.name,
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
  // Keyed off `renderedPhase` so the timer doesn't start before the curtain
  // finishes opening over the champion.
  useEffect(() => {
    if (renderedPhase !== 'champion' || !bracket?.champion || championSaved) return;
    autoSaveTimer.current = window.setTimeout(() => {
      void persistChampion();
    }, 3000);
    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
  }, [renderedPhase, bracket?.champion, championSaved, persistChampion]);

  // Stop audio on unmount (e.g. mode switch back to Remix Studio) and
  // clear any in-flight curtain timers so they can't fire post-unmount.
  useEffect(
    () => () => {
      stop();
      clearCurtainTimers();
    },
    [clearCurtainTimers],
  );

  const handleReset = useCallback(() => {
    // Invalidate any in-flight remixSeed callbacks for the previous run.
    runIdRef.current++;
    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    playTokenRef.current++;
    stop();
    setPhase('setup');
    setContestants([]);
    setBracket(null);
    setPlayingId(null);
    setChampionSaved(false);
    setEngineError(null);
    setBuzzedId(null);
    onShowFinished?.();
  }, [onShowFinished]);

  const champion = bracket?.champion ?? null;

  return (
    <>
      <Toast state={toast} onDismiss={dismissToast} />
      {renderedPhase === 'setup' && (
        <>
          <GemmaHost />
          <div className="panel">
            <div className="taste-head">
              <h2 style={{ margin: 0 }}>🎪 Tonight's Show</h2>
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
          <p style={{ color: 'var(--ink-parchment)', fontSize: '0.92rem', marginTop: 10 }}>
            Gemma picks a fresh seed and spins up {bracketSize} variations of it; each gets a face.
            Pick one from every pair until a champion is crowned - and the champion gets a 🏆 entry
            in your taste memory.
          </p>
          <div className="setup-seed-row">
            <span className="setup-seed-label">Today's theme</span>
            <code className="setup-seed-code">{seedCode.trim()}</code>
            {onReroll && (
              <button
                className="muted setup-seed-reroll"
                onClick={onReroll}
                title="Pick a different theme"
                aria-label="Re-roll the theme"
              >
                🎲 Re-roll
              </button>
            )}
          </div>
          <button
            className="primary cta-shine"
            onClick={handleHoldShow}
            disabled={
              !seedCode.trim() || (currentMode === 'local' && !modelReady)
            }
            style={{ marginTop: 8 }}
          >
            {currentMode === 'local' && !modelReady
              ? 'Load the model first'
              : '🎪 Hold the show'}
          </button>
          {engineError && (
            <div className="errors" style={{ marginTop: 10 }}>
              {engineError}
            </div>
          )}
          </div>
        </>
      )}

      {(renderedPhase === 'casting' || renderedPhase === 'showing') && (
        <div className="talentshow-toolbar">
          <button
            className="muted talentshow-restart-btn"
            onClick={handleReset}
            title={
              renderedPhase === 'casting'
                ? 'Stop casting and return to setup'
                : 'Discard this bracket and return to setup'
            }
          >
            🔁 Restart show
          </button>
        </div>
      )}

      {renderedPhase === 'casting' && (
        <CastingStage
          bracketSize={bracketSize}
          contestantsReady={contestants.length}
          startedAt={castingStartedAt.current}
          curtain={curtainState}
        />
      )}

      {renderedPhase === 'showing' && bracket && (
        <>
          <BracketView state={bracket} />
          {currentMatch(bracket) && (
            <MatchView
              match={currentMatch(bracket)!}
              totalMatches={bracket.matches.length}
              matchIndex={bracket.cursor}
              rounds={bracket.rounds}
              playingId={playingId}
              curtain={curtainState}
              buzzedId={buzzedId}
              onPlay={handlePlay}
              onStop={handleStop}
              onChoose={handleChoose}
              onGoldenBuzz={handleGoldenBuzz}
            />
          )}
          {engineError && <div className="errors">{engineError}</div>}
        </>
      )}

      {renderedPhase === 'champion' && champion && (
        <div className="champion-scene">
          <Confetti />
          <TalentStage
            phase="champion"
            curtain={curtainState}
            marquee="👑 Champion 👑"
            spotlightActive={playingId === champion.id}
          >
            <div className="performer-row is-solo">
              <Performer
                contestant={champion}
                state="champion"
                size={240}
              />
            </div>
          </TalentStage>
          <div className="champion-actions">
            {!championSaved ? (
              <button className="primary" onClick={persistChampion}>
                🏆 Save champion to taste
              </button>
            ) : (
              <span className="champion-saved">🏆 saved to taste memory</span>
            )}
            <button
              onClick={() => handlePlay(champion.id, champion.code)}
              disabled={playingId === champion.id}
            >
              ▶ Play once more
            </button>
            <button onClick={handleStop} disabled={playingId === null}>
              ⏹ Stop
            </button>
            {onContinueInStudio && (
              <button
                onClick={() => onContinueInStudio(champion.code, champion.label)}
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
// model download don't re-render the whole talent-show tree - the component
// only depends on `modelReady` (one transition) and `seedCode` (rare while
// downloading). Without this the main thread saturates on big downloads.
export const TalentShow = memo(TalentShowInner);
