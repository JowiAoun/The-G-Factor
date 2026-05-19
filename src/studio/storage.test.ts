import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_SAVED_MIXES,
  clearAllSavedMixes,
  clearDraft,
  deleteSavedMix,
  listSavedMixes,
  loadDraft,
  loadSavedMix,
  saveDraft,
  saveMixAs,
  seedStudioDraft,
  type StudioDraft,
} from './storage';

// Minimal in-memory localStorage shim — vitest's node env doesn't ship one.
class MemStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v));
  }
}

beforeEach(() => {
  (globalThis as { localStorage: Storage }).localStorage = new MemStorage();
});
afterEach(() => {
  clearDraft();
  clearAllSavedMixes();
});

function freshDraft(overrides: Partial<StudioDraft> = {}): StudioDraft {
  return {
    mix_code: 's("bd*4")',
    history: [{ role: 'user', content: 'kick please', ts: 1 }],
    undo_stack: [''],
    redo_stack: [],
    updated_at: 0,
    ...overrides,
  };
}

describe('draft round-trip', () => {
  it('returns null when no draft is stored', () => {
    expect(loadDraft()).toBeNull();
  });

  it('saves and reloads a draft preserving shape', () => {
    const draft = freshDraft();
    saveDraft(draft);
    const back = loadDraft();
    expect(back).not.toBeNull();
    expect(back?.mix_code).toBe('s("bd*4")');
    expect(back?.history).toHaveLength(1);
  });

  it('updates `updated_at` on save even if input omits it', () => {
    const before = Date.now();
    saveDraft(freshDraft({ updated_at: 0 }));
    const back = loadDraft();
    expect(back!.updated_at).toBeGreaterThanOrEqual(before);
  });

  it('treats corrupted localStorage as missing', () => {
    localStorage.setItem('strudel-tutor.studio.draft', '{not json');
    expect(loadDraft()).toBeNull();
  });

  it('rejects a draft missing required fields', () => {
    localStorage.setItem(
      'strudel-tutor.studio.draft',
      JSON.stringify({ mix_code: 's("bd")' }),
    );
    expect(loadDraft()).toBeNull();
  });

  it('clearDraft removes the entry', () => {
    saveDraft(freshDraft());
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});

describe('saved-mix library', () => {
  it('returns an empty list when nothing is saved', () => {
    expect(listSavedMixes()).toEqual([]);
  });

  it('saveMixAs appends and returns a stable id+name+code', () => {
    const m = saveMixAs('Toon Funk', {
      mix_code: 's("bd hh sd hh")',
      history: [],
    });
    expect(m.name).toBe('Toon Funk');
    expect(m.mix_code).toBe('s("bd hh sd hh")');
    expect(m.id).toBeTruthy();
    expect(listSavedMixes()).toHaveLength(1);
  });

  it('trims names + falls back to "Untitled mix" on empty', () => {
    const m = saveMixAs('   ', { mix_code: 's("bd")', history: [] });
    expect(m.name).toBe('Untitled mix');
  });

  it('lists mixes newest-first', async () => {
    const first = saveMixAs('First', { mix_code: 's("bd")', history: [] });
    await new Promise((r) => setTimeout(r, 5));
    const second = saveMixAs('Second', { mix_code: 's("cp")', history: [] });
    const list = listSavedMixes();
    expect(list[0].id).toBe(second.id);
    expect(list[1].id).toBe(first.id);
  });

  it('loadSavedMix retrieves by id', () => {
    const m = saveMixAs('LoadMe', { mix_code: 's("bd")', history: [] });
    const got = loadSavedMix(m.id);
    expect(got?.name).toBe('LoadMe');
  });

  it('deleteSavedMix removes the entry', () => {
    const m = saveMixAs('Doomed', { mix_code: 's("bd")', history: [] });
    deleteSavedMix(m.id);
    expect(listSavedMixes()).toHaveLength(0);
    expect(loadSavedMix(m.id)).toBeNull();
  });

  it(`caps the library at ${MAX_SAVED_MIXES} entries, evicting oldest`, () => {
    // Save 1 more than the cap.
    for (let i = 0; i < MAX_SAVED_MIXES + 5; i++) {
      saveMixAs(`mix-${i}`, { mix_code: `s("${i}")`, history: [] });
    }
    const list = listSavedMixes();
    expect(list).toHaveLength(MAX_SAVED_MIXES);
    // The earliest entries are gone — the first save with i=0 should not exist.
    expect(list.find((m) => m.name === 'mix-0')).toBeUndefined();
    // The newest entry survives.
    expect(list[0].name).toBe(`mix-${MAX_SAVED_MIXES + 4}`);
  });

  it('treats corrupted library JSON as empty', () => {
    localStorage.setItem('strudel-tutor.studio.saved', '{not an array}');
    expect(listSavedMixes()).toEqual([]);
  });

  it('seedStudioDraft writes a draft + greeting that loadDraft can read back', () => {
    seedStudioDraft('s("bd*4")', 'Champion Mix');
    const draft = loadDraft();
    expect(draft).not.toBeNull();
    expect(draft?.mix_code).toBe('s("bd*4")');
    expect(draft?.history).toHaveLength(1);
    expect(draft?.history[0].role).toBe('assistant');
    expect(draft?.history[0].content).toContain('Champion Mix');
    expect(draft?.undo_stack).toEqual([]);
    expect(draft?.redo_stack).toEqual([]);
  });

  it('seedStudioDraft works with no attribution label', () => {
    seedStudioDraft('s("hh*8")');
    const draft = loadDraft();
    expect(draft?.mix_code).toBe('s("hh*8")');
    expect(draft?.history[0].content).toMatch(/Loaded a fresh mix/);
  });

  it('seedStudioDraft replaces any pre-existing draft', () => {
    saveDraft({
      mix_code: 's("old")',
      history: [{ role: 'user', content: 'old turn', ts: 1 }],
      undo_stack: ['prev'],
      redo_stack: [],
      updated_at: 1,
    });
    seedStudioDraft('s("new")', 'New mix');
    const draft = loadDraft();
    expect(draft?.mix_code).toBe('s("new")');
    expect(draft?.history).toHaveLength(1);
    expect(draft?.undo_stack).toEqual([]);
  });

  it('filters out individually-corrupted entries instead of failing', () => {
    localStorage.setItem(
      'strudel-tutor.studio.saved',
      JSON.stringify([
        { id: 'a', name: 'good', mix_code: 's("bd")', history: [], created_at: 1 },
        { id: 'b', name: 'partial' }, // missing fields
        null,
        { id: 'c', name: 'good2', mix_code: 's("cp")', history: [], created_at: 2 },
      ]),
    );
    const list = listSavedMixes();
    expect(list).toHaveLength(2);
    expect(list.map((m) => m.name).sort()).toEqual(['good', 'good2']);
  });
});
