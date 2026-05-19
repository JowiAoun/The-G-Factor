import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
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
import { Persona, type PersonaMood } from './Persona';
import { MixCanvas } from './MixCanvas';
import { MixInspector } from './MixInspector';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { SavedMixes } from './SavedMixes';

type StudioProps = {
  modelReady: boolean;
  onSavedChange?: () => void;
  /** Bumped by the parent when the taste store changes (e.g. sidebar cleared). */
  tasteVersion?: number;
};

const MOOD_HOLD_MS = 1600;

function freshGreetingHistory(): ChatTurnRecord[] {
  return [{ role: 'assistant', content: PERSONA_GREETING, ts: Date.now() }];
}

function StudioInner({ modelReady, onSavedChange, tasteVersion = 0 }: StudioProps) {
  // Boot from a persisted draft when present; otherwise start fresh with
  // Bleep's greeting. We read once on first render via useMemo so React
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

  const playLock = useRef(false);
  const moodTimer = useRef<number | null>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-save on every state change that matters. localStorage writes are
  // synchronous but trivially cheap at this size; the four-dep effect fires
  // once per user action.
  useEffect(() => {
    saveDraft({
      mix_code: mixCode,
      history,
      undo_stack: undoStack,
      redo_stack: redoStack,
      updated_at: Date.now(),
    });
  }, [mixCode, history, undoStack, redoStack]);

  // Auto-scroll the chat log to the newest message.
  useEffect(() => {
    const el = chatLogRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history, generating]);

  // Stop audio when this surface unmounts (user switches tab).
  useEffect(() => () => stop(), []);

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
      if (!modelReady || generating) return;
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
          // Retries exhausted — keep the existing mix and apologise.
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
          // Cancelled — append a marker turn so the history is coherent.
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
    [modelReady, generating, history, mixCode, flashMood],
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
      stop();
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
    saveMixAs(name, { mix_code: mixCode, history });
    setLibraryVersion((v) => v + 1);
    flashMood('saved');
    onSavedChange?.();
  }, [mixCode, history, flashMood, onSavedChange]);

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
    <div className="studio-grid">
      <div className="studio-main">
        <Persona mood={mood} />

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
          onLike={handleToggleLike}
          liked={likedMixCodes.has(mixCode)}
        />

        <MixInspector mixCode={mixCode} />

        {usedExemplars > 0 && (
          <div className="exemplar-pill-row">
            <span
              className="exemplar-pill"
              title="Top-K liked mixes were injected into Bleep's prompt for this turn"
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
          aria-label="Chat with Bleep"
        >
          {history.map((t, i) => (
            <ChatBubble
              key={i}
              role={t.role}
              content={t.content}
              actionLabel={t.action_label}
            />
          ))}
          {generating && (
            <ChatBubble role="assistant" content="…thinking…" actionLabel="working" />
          )}
        </div>

        <ChatInput
          onSubmit={handleSubmit}
          onCancel={generating ? handleCancel : undefined}
          disabled={!modelReady || generating}
          placeholder={
            !modelReady
              ? 'load the model first'
              : generating
                ? 'bleep is thinking…'
                : '> ask Bleep for what to add or change (try "start with a four-on-the-floor kick")'
          }
        />
      </div>

      <SavedMixes
        version={libraryVersion}
        onLoad={handleLoadSaved}
        onChange={() => setLibraryVersion((v) => v + 1)}
      />
    </div>
  );
}

// Same memoisation rationale as the TalentShow component: parent App
// re-renders on every model-load progress tick. Studio's only externally-
// driven props are modelReady (a single transition) and onSavedChange
// (stable identity), so memo'ing eliminates a torrent of wasted renders
// during the initial download.
export const Studio = memo(StudioInner);
