import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PERSONA,
  PERSONA_APOLOGY,
  PERSONA_GREETING,
} from '../studio/persona';
import { composeTurn, TurnCancelledError } from '../studio/chat';
import {
  loadDraft,
  saveDraft,
  saveMixAs,
  type ChatTurnRecord,
  type SavedMix,
} from '../studio/storage';
import { addLike, deleteLike, getAllLikes } from '../memory/taste';
import { play, stop, clearLastError } from '../strudel/engine';
import { getStoredApiKey, type BackendMode } from '../model/backend';
import { type PersonaMood } from './Persona';
import { GemmaHost } from './GemmaHost';
import { MixCanvas } from './MixCanvas';
import { MixInspector } from './MixInspector';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { SavedMixes } from './SavedMixes';
import { SoundPalette } from './SoundPalette';
import { Toast, useToast } from './Toast';
import type { SoundChip } from '../studio/sounds';

type StudioProps = {
  modelReady: boolean;
  /**
   * Active backend mode. Lets the chat input stay enabled for remote-mode
   * sessions even when no API key is set yet - submitting then surfaces a
   * toast instead of silently no-op'ing.
   */
  currentMode: BackendMode;
  onSavedChange?: () => void;
  /** Bumped by the parent when the taste store changes (e.g. sidebar cleared). */
  tasteVersion?: number;
  /** Hand the current mix off to the Talent Show as a bracket seed. */
  onBracketCurrent?: (mixCode: string) => void;
  /** Open the backend chooser modal - wired into the no-key toast CTA. */
  onOpenSettings?: () => void;
};

const MOOD_HOLD_MS = 1600;

function freshGreetingHistory(): ChatTurnRecord[] {
  return [{ role: 'assistant', content: PERSONA_GREETING, ts: Date.now() }];
}

function StudioInner({
  modelReady,
  currentMode,
  onSavedChange,
  tasteVersion = 0,
  onBracketCurrent,
  onOpenSettings,
}: StudioProps) {
  // Boot from a persisted draft when present; otherwise start fresh with
  // Gemma's greeting. We read once on first render via useMemo so React
  // StrictMode's double-effect doesn't double-write the draft.
  const initial = useMemo(() => loadDraft(), []);
  const [mixCode, setMixCode] = useState(initial?.mix_code ?? '');
  const [history, setHistory] = useState<ChatTurnRecord[]>(
    initial?.history?.length ? initial.history : freshGreetingHistory(),
  );
  const [undoStack, setUndoStack] = useState<string[]>(initial?.undo_stack ?? []);
  const [redoStack, setRedoStack] = useState<string[]>(initial?.redo_stack ?? []);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [mood, setMood] = useState<PersonaMood>('idle');
  const [playing, setPlaying] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [usedExemplars, setUsedExemplars] = useState(0);
  const [likedMixCodes, setLikedMixCodes] = useState<Set<string>>(new Set());

  const { toast, showToast, dismissToast } = useToast();

  const playLock = useRef(false);
  const moodTimer = useRef<number | null>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const replayAbortRef = useRef<AbortController | null>(null);
  const [replaying, setReplaying] = useState(false);

  // Editor-edit debounce + drop-flag bookkeeping.
  //
  // CodeMirror has its own per-keystroke history; Studio's undoStack stays
  // at "macro" granularity (one entry per chat turn / palette drop / settled
  // typing burst) so the ↶ Undo button doesn't take 50 clicks to back out
  // one Gemma turn. `editStartMixRef` snapshots the pre-typing mix on the
  // first keystroke of a burst; `editDebounceRef` is the 1.5 s timer.
  // `dropFlagRef` lets the drop handler claim an undo push for itself so
  // the subsequent onChange echo doesn't schedule a duplicate.
  const editStartMixRef = useRef<string | null>(null);
  const editDebounceRef = useRef<number | null>(null);
  const dropFlagRef = useRef(false);
  // Audition timer for the sound-palette click-to-audition path. Holding
  // a ref means rapid clicks cancel each other instead of stacking.
  const auditionTimerRef = useRef<number | null>(null);

  // Auto-save on every state change that matters. localStorage writes are
  // synchronous but trivially cheap at this size; the four-dep effect fires
  // once per user action. Skipped during replay so the in-flight cinematic
  // doesn't clobber the user's actual draft - once replay ends, the
  // `replaying` flag flips and the effect runs once with the final state.
  useEffect(() => {
    if (replaying) return;
    saveDraft({
      mix_code: mixCode,
      history,
      undo_stack: undoStack,
      redo_stack: redoStack,
      updated_at: Date.now(),
    });
  }, [mixCode, history, undoStack, redoStack, replaying]);

  // Auto-scroll the chat log to the newest message.
  useEffect(() => {
    const el = chatLogRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history, generating]);

  // Stop audio when this surface unmounts (user switches tab).
  useEffect(() => () => { void stop(); }, []);

  // Keep the heart-button state in sync with the taste store: refresh on
  // mount AND whenever the parent bumps tasteVersion (sidebar clear, new
  // tournament champion saved, etc.).
  useEffect(() => {
    let cancelled = false;
    getAllLikes()
      .then((likes) => {
        if (cancelled) return;
        setLikedMixCodes(new Set(likes.map((l) => l.variation_code)));
      })
      .catch(() => {
        if (!cancelled) setLikedMixCodes(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [tasteVersion]);

  const flashMood = useCallback((next: PersonaMood, holdMs = MOOD_HOLD_MS) => {
    setMood(next);
    if (moodTimer.current) window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => {
      setMood('idle');
      moodTimer.current = null;
    }, holdMs);
  }, []);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (generating) return;
      // Fresh localStorage read at submit time - the user may have just
      // closed the settings modal after pasting (or removing) a key.
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
      setEngineError(null);
      setDiagnostic(null);
      setGenerating(true);
      setMood('thinking');

      const userTurn: ChatTurnRecord = { role: 'user', content: text, ts: Date.now() };
      const nextHistory = [...history, userTurn];
      setHistory(nextHistory);

      // Fresh AbortController per turn so a cancel only kills this round-trip.
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await composeTurn({
          currentMix: mixCode,
          history: nextHistory.map(({ role, content }) => ({ role, content })),
          userMessage: text,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (result.status === 'valid' && result.turn) {
          // Push the *previous* mix onto undo, clear redo, swap in new mix.
          setUndoStack((s) => [...s, mixCode]);
          setRedoStack([]);
          setMixCode(result.turn.new_mix_code);
          setHistory([
            ...nextHistory,
            {
              role: 'assistant',
              content: result.turn.assistant_message,
              action_label: result.turn.action_label,
              ts: Date.now(),
            },
          ]);
          setUsedExemplars(result.exemplarsUsed);
          setMood('idle');
        } else {
          // Retries exhausted - keep the existing mix and apologise.
          const lastErr = result.attempts.at(-1)?.error;
          setHistory([
            ...nextHistory,
            {
              role: 'assistant',
              content: PERSONA_APOLOGY,
              action_label: 'no-op',
              ts: Date.now(),
            },
          ]);
          if (lastErr) setDiagnostic(`(${result.status}: ${lastErr.slice(0, 140)})`);
          flashMood('apology');
        }
      } catch (err) {
        if (err instanceof TurnCancelledError) {
          // Cancelled - append a marker turn so the history is coherent.
          setHistory([
            ...nextHistory,
            {
              role: 'assistant',
              content: '(cancelled)',
              action_label: 'cancelled',
              ts: Date.now(),
            },
          ]);
          setMood('idle');
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setEngineError(msg);
          flashMood('apology');
        }
      } finally {
        setGenerating(false);
        abortRef.current = null;
      }
    },
    [modelReady, generating, history, mixCode, flashMood, currentMode, showToast, onOpenSettings],
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handlePlay = useCallback(async () => {
    if (playLock.current || !mixCode.trim()) return;
    playLock.current = true;
    setEngineError(null);
    clearLastError();
    try {
      await stop();
      await play(mixCode);
      setPlaying(true);
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : String(err));
    } finally {
      playLock.current = false;
    }
  }, [mixCode]);

  const handleStop = useCallback(() => {
    stop();
    setPlaying(false);
  }, []);

  /**
   * Direct edits in the CodeMirror editor. Three paths:
   *   1. External echo - parent set value, CM6 dispatched, onChange came
   *      back with `next === mixCode`. No-op.
   *   2. Drop completion - drop handler already pushed the pre-drop mix to
   *      undoStack. Skip the typing-debounce snapshot.
   *   3. User typed - capture pre-typing mix on the first keystroke of a
   *      burst, then push it to undoStack 1.5 s after typing settles.
   */
  const handleCodeChange = useCallback(
    (next: string) => {
      if (next === mixCode) return;
      setMixCode(next);
      if (dropFlagRef.current) {
        dropFlagRef.current = false;
        if (editDebounceRef.current !== null) {
          window.clearTimeout(editDebounceRef.current);
          editDebounceRef.current = null;
        }
        editStartMixRef.current = null;
        return;
      }
      if (editStartMixRef.current === null) {
        editStartMixRef.current = mixCode;
      }
      if (editDebounceRef.current !== null) {
        window.clearTimeout(editDebounceRef.current);
      }
      editDebounceRef.current = window.setTimeout(() => {
        const startMix = editStartMixRef.current;
        if (startMix !== null && startMix !== next) {
          setUndoStack((s) => [...s, startMix]);
          setRedoStack([]);
        }
        editStartMixRef.current = null;
        editDebounceRef.current = null;
      }, 1500);
    },
    [mixCode],
  );

  /**
   * Fired by the CodeEditor BEFORE its dispatch - we record the pre-drop
   * mix on the undo stack and set a flag so the following onChange (from
   * the dispatched insertion) doesn't schedule a duplicate typing-debounce
   * undo entry.
   */
  const handleDropSnippet = useCallback(() => {
    setUndoStack((s) => [...s, mixCode]);
    setRedoStack([]);
    dropFlagRef.current = true;
  }, [mixCode]);

  /**
   * Click-to-audition on a palette chip: play the chip's snippet for a
   * short window, then stop. Cancels any prior in-flight audition so
   * rapid clicks don't pile up sample tails.
   */
  const handleAudition = useCallback(async (chip: SoundChip) => {
    if (auditionTimerRef.current !== null) {
      window.clearTimeout(auditionTimerRef.current);
      auditionTimerRef.current = null;
    }
    await stop();
    setPlaying(false);
    setEngineError(null);
    clearLastError();
    try {
      await play(chip.snippet);
      auditionTimerRef.current = window.setTimeout(() => {
        stop();
        auditionTimerRef.current = null;
      }, 600);
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      const rest = stack.slice(0, -1);
      setRedoStack((r) => [...r, mixCode]);
      setMixCode(prev);
      return rest;
    });
  }, [mixCode]);

  const handleRedo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      const rest = stack.slice(0, -1);
      setUndoStack((u) => [...u, mixCode]);
      setMixCode(next);
      return rest;
    });
  }, [mixCode]);

  const handleSaveAs = useCallback(() => {
    if (!mixCode.trim()) return;
    const suggested =
      history.find((t) => t.action_label && t.action_label !== 'no-op')?.action_label ??
      'Untitled mix';
    const name = window.prompt('Name this mix:', suggested);
    if (name === null) return;
    // Capture the linear journey of mix states so the saved entry can be
    // replayed turn-by-turn later. undoStack holds every pre-update mix;
    // appending the current code completes the chronology. Consecutive
    // duplicates are collapsed (cancelled / apology turns don't change
    // the mix and shouldn't add a "stuck" frame to the replay).
    const journey: string[] = [];
    for (const snap of [...undoStack, mixCode]) {
      if (journey[journey.length - 1] !== snap) journey.push(snap);
    }
    saveMixAs(name, { mix_code: mixCode, history, snapshots: journey });
    setLibraryVersion((v) => v + 1);
    flashMood('saved');
    onSavedChange?.();
  }, [mixCode, history, undoStack, flashMood, onSavedChange]);

  /**
   * Toggle a like for the *current* mix snapshot. Writes to the same
   * IndexedDB taste store that the Talent Show champions feed, so future
   * chat turns + future bracket runs both retrieve studio likes as
   * exemplars via the bigram similarity.
   */
  const handleToggleLike = useCallback(async () => {
    if (!mixCode.trim()) return;
    try {
      if (likedMixCodes.has(mixCode)) {
        const likes = await getAllLikes();
        const target = likes.find((l) => l.variation_code === mixCode);
        if (target) await deleteLike(target.id);
      } else {
        // Pick the most recent meaningful action_label for the
        // transformation tag; fall back to a generic 'studio mix'.
        const recent = [...history]
          .reverse()
          .find(
            (t) =>
              t.role === 'assistant' &&
              t.action_label &&
              t.action_label !== 'no-op' &&
              t.action_label !== 'cancelled',
          );
        await addLike({
          seed_code: mixCode,
          variation_code: mixCode,
          transformation_label: recent?.action_label ?? 'studio mix',
          explanation_one_line:
            recent?.content?.slice(0, 200) ?? 'liked from the chat studio',
        });
      }
      onSavedChange?.();
    } catch (err) {
      setEngineError(
        `taste store: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [mixCode, likedMixCodes, history, onSavedChange]);

  const handleLoadSaved = useCallback(
    (saved: SavedMix) => {
      stop();
      setPlaying(false);
      // Keep the previous mix on the undo stack so the user can step back.
      if (mixCode) setUndoStack((s) => [...s, mixCode]);
      setRedoStack([]);
      setMixCode(saved.mix_code);
      setHistory(saved.history.length ? saved.history : freshGreetingHistory());
    },
    [mixCode],
  );

  /**
   * Walk a saved mix's chat history turn-by-turn, advancing the mix-canvas
   * snapshot in lockstep on every assistant turn that changed the mix.
   * Lets the user (or the demo) "replay" a finished session as a
   * ~1-second-per-turn cinematic. Suppresses auto-save while playing so
   * the in-flight intermediate states don't clobber the working draft.
   */
  const handleReplay = useCallback(
    async (saved: SavedMix) => {
      // Cancel any prior replay first.
      replayAbortRef.current?.abort();
      const controller = new AbortController();
      replayAbortRef.current = controller;

      stop();
      setPlaying(false);
      setEngineError(null);
      setDiagnostic(null);
      setReplaying(true);

      const snapshots = saved.snapshots ?? [];
      const TURN_MS = 1100;
      let snapIdx = 0;

      // Start with the initial snapshot (empty mix if we have one).
      setHistory([]);
      setMixCode(snapshots[0] ?? '');
      // Briefly hold the empty/initial state so the first chat bubble
      // doesn't materialise on top of the mix change.
      await new Promise<void>((r) => setTimeout(r, 400));
      if (controller.signal.aborted) {
        setReplaying(false);
        return;
      }

      for (let i = 0; i < saved.history.length; i++) {
        if (controller.signal.aborted) break;
        await new Promise<void>((r) => setTimeout(r, TURN_MS));
        if (controller.signal.aborted) break;
        const turn = saved.history[i];
        setHistory((h) => [...h, turn]);
        const changedMix =
          turn.role === 'assistant' &&
          !!turn.action_label &&
          !['no-op', 'cancelled', 'imported'].includes(turn.action_label);
        if (changedMix) {
          snapIdx++;
          if (snapIdx < snapshots.length) {
            setMixCode(snapshots[snapIdx]);
          }
        }
      }

      // Final state - guarantees the canvas matches saved.mix_code even
      // when the snapshot/turn counts disagree (legacy saves, or a bug).
      if (!controller.signal.aborted) {
        setMixCode(saved.mix_code);
        // Populate undo with the full journey so the user can step back
        // through the replay by hand if they want.
        setUndoStack(snapshots.length > 1 ? snapshots.slice(0, -1) : []);
        setRedoStack([]);
      }
      setReplaying(false);
    },
    [],
  );

  const handleStopReplay = useCallback(() => {
    replayAbortRef.current?.abort();
    setReplaying(false);
  }, []);

  const handleBracket = useCallback(() => {
    if (!mixCode.trim()) return;
    stop();
    setPlaying(false);
    onBracketCurrent?.(mixCode);
  }, [mixCode, onBracketCurrent]);

  const handleNewMix = useCallback(() => {
    if (
      !window.confirm(
        'Start a fresh mix? Your current draft is replaced (saved entries stay).',
      )
    ) {
      return;
    }
    stop();
    setPlaying(false);
    setMixCode('');
    setHistory(freshGreetingHistory());
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return (
    <div className="studio-grid rehearsal-room">
      <GemmaHost
        title="The Rehearsal Room"
        sub="tonight's mix in progress"
        mood={mood}
        playing={playing}
        line={
          <>
            I'm <strong>{PERSONA.name}</strong>. Tell me what we should make.
            Drag a sound, paste a pattern, or just ask.
          </>
        }
      />
      <div className="studio-main">

        <MixCanvas
          mixCode={mixCode}
          playing={playing}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          saving={false}
          onPlay={handlePlay}
          onStop={handleStop}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSaveAs={handleSaveAs}
          onNewMix={handleNewMix}
          onCodeChange={handleCodeChange}
          onDropSnippet={handleDropSnippet}
          onLike={handleToggleLike}
          liked={likedMixCodes.has(mixCode)}
          onBracket={onBracketCurrent ? handleBracket : undefined}
        />

        <SoundPalette onAudition={handleAudition} />

        <MixInspector mixCode={mixCode} />

        {usedExemplars > 0 && (
          <div className="exemplar-pill-row">
            <span
              className="exemplar-pill"
              title="Top-K liked mixes were injected into Gemma's prompt for this turn"
            >
              ♥ {usedExemplars} taste exemplar{usedExemplars === 1 ? '' : 's'} used
            </span>
          </div>
        )}

        {engineError && (
          <div className="errors">engine error: {engineError}</div>
        )}
        {diagnostic && (
          <div
            className="errors"
            style={{ borderColor: '#6b521f', background: '#2a241a', color: '#d4b34a' }}
          >
            {diagnostic}
          </div>
        )}

        <div
          className="chat-log"
          ref={chatLogRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Chat with Gemma"
        >
          {history.map((t, i) => {
            // Stream only the newest assistant turn - gives the typewriter
            // effect on Gemma's freshest reply without re-animating the
            // whole transcript on every render.
            const isLatestAssistant =
              i === history.length - 1 && t.role === 'assistant' && !generating;
            return (
              <ChatBubble
                key={i}
                role={t.role}
                content={t.content}
                actionLabel={t.action_label}
                stream={isLatestAssistant}
              />
            );
          })}
          {generating && (
            <ChatBubble role="assistant" content="…thinking…" actionLabel="working" />
          )}
        </div>

        <ChatInput
          onSubmit={handleSubmit}
          onCancel={generating ? handleCancel : undefined}
          disabled={generating || (currentMode === 'local' && !modelReady)}
          placeholder={
            currentMode === 'local' && !modelReady
              ? 'load the model first'
              : generating
                ? 'gemma is thinking…'
                : currentMode === 'remote' && !modelReady
                  ? '> add your OpenRouter key in ⚙ Settings to chat with Gemma'
                  : '✎ note to coach: what should we try next? (try "start with a four-on-the-floor kick")'
          }
        />
      </div>

      <SavedMixes
        version={libraryVersion}
        onLoad={handleLoadSaved}
        onReplay={handleReplay}
        onChange={() => setLibraryVersion((v) => v + 1)}
      />

      {replaying && (
        <div className="replay-banner" role="status">
          <span>🎬 Encore in progress…</span>
          <button className="muted" onClick={handleStopReplay}>
            ⏹ End encore
          </button>
        </div>
      )}

      <Toast state={toast} onDismiss={dismissToast} />
    </div>
  );
}

// Same memoisation rationale as the TalentShow component: parent App
// re-renders on every model-load progress tick. Studio's only externally-
// driven props are modelReady (a single transition) and onSavedChange
// (stable identity), so memo'ing eliminates a torrent of wasted renders
// during the initial download.
export const Studio = memo(StudioInner);
