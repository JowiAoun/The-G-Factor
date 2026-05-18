/**
 * localStorage-backed persistence for the conversational Studio.
 *
 * Two records live here:
 *   - `strudel-tutor.studio.draft`  → the in-progress working state (one
 *     object): current mix code + chat history + undo/redo stacks. Written
 *     on every successful turn so a refresh restores the session.
 *   - `strudel-tutor.studio.saved`  → an array of named mixes the user has
 *     explicitly saved. Capped at `MAX_SAVED_MIXES` entries with the
 *     oldest evicted first to keep localStorage well under quota.
 *
 * All reads are tolerant: malformed JSON, missing fields, or a totally
 * absent key all collapse to "no draft" / "empty library" so the UI can
 * always cold-start.
 */

const DRAFT_KEY = 'strudel-tutor.studio.draft';
const LIBRARY_KEY = 'strudel-tutor.studio.saved';

export const MAX_SAVED_MIXES = 30;
export const MAX_HISTORY_PERSISTED = 100;
export const MAX_UNDO_STACK = 50;

export type ChatTurnRecord = {
  role: 'user' | 'assistant';
  content: string;
  action_label?: string;
  ts: number;
};

export type StudioDraft = {
  mix_code: string;
  history: ChatTurnRecord[];
  undo_stack: string[];
  redo_stack: string[];
  updated_at: number;
};

export type SavedMix = {
  id: string;
  name: string;
  mix_code: string;
  history: ChatTurnRecord[];
  created_at: number;
};

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readKey<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeKey(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or storage-disabled (Safari private mode). Drop silently —
    // the UI keeps working from in-memory state.
  }
}

function trimHistory(history: ChatTurnRecord[]): ChatTurnRecord[] {
  if (history.length <= MAX_HISTORY_PERSISTED) return history;
  return history.slice(history.length - MAX_HISTORY_PERSISTED);
}

function trimStack(stack: string[]): string[] {
  if (stack.length <= MAX_UNDO_STACK) return stack;
  return stack.slice(stack.length - MAX_UNDO_STACK);
}

function isValidDraft(v: unknown): v is StudioDraft {
  if (typeof v !== 'object' || v === null) return false;
  const d = v as Partial<StudioDraft>;
  return (
    typeof d.mix_code === 'string' &&
    Array.isArray(d.history) &&
    Array.isArray(d.undo_stack) &&
    Array.isArray(d.redo_stack) &&
    typeof d.updated_at === 'number'
  );
}

function isValidSavedMix(v: unknown): v is SavedMix {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Partial<SavedMix>;
  return (
    typeof m.id === 'string' &&
    typeof m.name === 'string' &&
    typeof m.mix_code === 'string' &&
    Array.isArray(m.history) &&
    typeof m.created_at === 'number'
  );
}

export function loadDraft(): StudioDraft | null {
  const raw = readKey<unknown>(DRAFT_KEY);
  if (!isValidDraft(raw)) return null;
  return raw;
}

export function saveDraft(draft: StudioDraft): void {
  const normalised: StudioDraft = {
    ...draft,
    history: trimHistory(draft.history),
    undo_stack: trimStack(draft.undo_stack),
    redo_stack: trimStack(draft.redo_stack),
    updated_at: Date.now(),
  };
  writeKey(DRAFT_KEY, normalised);
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function listSavedMixes(): SavedMix[] {
  const raw = readKey<unknown>(LIBRARY_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidSavedMix).sort((a, b) => b.created_at - a.created_at);
}

export function saveMixAs(
  name: string,
  source: { mix_code: string; history: ChatTurnRecord[] },
): SavedMix {
  const trimmedName = name.trim().slice(0, 60) || 'Untitled mix';
  const mix: SavedMix = {
    id: uuid(),
    name: trimmedName,
    mix_code: source.mix_code,
    history: trimHistory(source.history),
    created_at: Date.now(),
  };
  const existing = listSavedMixes();
  // newest-first; evict from the tail when over cap
  const updated = [mix, ...existing].slice(0, MAX_SAVED_MIXES);
  writeKey(LIBRARY_KEY, updated);
  return mix;
}

export function deleteSavedMix(id: string): void {
  const existing = listSavedMixes();
  const updated = existing.filter((m) => m.id !== id);
  writeKey(LIBRARY_KEY, updated);
}

export function loadSavedMix(id: string): SavedMix | null {
  return listSavedMixes().find((m) => m.id === id) ?? null;
}

export function clearAllSavedMixes(): void {
  try {
    localStorage.removeItem(LIBRARY_KEY);
  } catch {
    // ignore
  }
}
