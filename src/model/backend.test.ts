import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  REMOTE_MODEL_ID,
  THROTTLE_DEFAULTS,
  getMode,
  getStoredApiKey,
  getThrottleMs,
  hasMadeBackendChoice,
  looksLikeApiKey,
  setMode,
  setStoredApiKey,
  setThrottleMs,
  subscribeBackendChange,
} from './backend';

// Minimal in-memory localStorage shim - vitest's node env doesn't ship one.
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

describe('REMOTE_MODEL_ID', () => {
  it('is the paid Gemma 4 31B identifier confirmed by the user', () => {
    expect(REMOTE_MODEL_ID).toBe('google/gemma-4-31b-it');
  });
});

describe('getMode / setMode', () => {
  it('defaults to local when nothing has been set', () => {
    expect(getMode()).toBe('local');
  });

  it('round-trips remote', () => {
    setMode('remote');
    expect(getMode()).toBe('remote');
  });

  it('round-trips local', () => {
    setMode('remote');
    setMode('local');
    expect(getMode()).toBe('local');
  });

  it('flips the has-chosen flag', () => {
    expect(hasMadeBackendChoice()).toBe(false);
    setMode('local');
    expect(hasMadeBackendChoice()).toBe(true);
  });
});

describe('getStoredApiKey / setStoredApiKey', () => {
  it('starts null', () => {
    expect(getStoredApiKey()).toBeNull();
  });

  it('round-trips a key', () => {
    setStoredApiKey('sk-or-v1-abcdef012345');
    expect(getStoredApiKey()).toBe('sk-or-v1-abcdef012345');
  });

  it('trims whitespace on save', () => {
    setStoredApiKey('   sk-or-v1-abc   ');
    expect(getStoredApiKey()).toBe('sk-or-v1-abc');
  });

  it('treats empty / whitespace-only as a clear', () => {
    setStoredApiKey('sk-or-v1-abc');
    setStoredApiKey('   ');
    expect(getStoredApiKey()).toBeNull();
  });

  it('clears on null', () => {
    setStoredApiKey('sk-or-v1-abc');
    setStoredApiKey(null);
    expect(getStoredApiKey()).toBeNull();
  });
});

describe('getThrottleMs / setThrottleMs', () => {
  it('defaults per backend mode when unset', () => {
    expect(getThrottleMs('local')).toBe(THROTTLE_DEFAULTS.local);
    expect(getThrottleMs('remote')).toBe(THROTTLE_DEFAULTS.remote);
  });

  it('uses the saved mode as the default fallback when no mode arg is given', () => {
    setMode('remote');
    expect(getThrottleMs()).toBe(THROTTLE_DEFAULTS.remote);
    setMode('local');
    expect(getThrottleMs()).toBe(THROTTLE_DEFAULTS.local);
  });

  it('applies a saved override to both modes (shared slider)', () => {
    setThrottleMs(800);
    expect(getThrottleMs('local')).toBe(800);
    expect(getThrottleMs('remote')).toBe(800);
  });

  it('round-trips a value', () => {
    setThrottleMs(2500);
    expect(getThrottleMs()).toBe(2500);
  });

  it('clamps negative values to 0', () => {
    setThrottleMs(-500);
    expect(getThrottleMs()).toBe(0);
  });

  it('clamps values above the max to the max', () => {
    setThrottleMs(THROTTLE_DEFAULTS.max + 99999);
    expect(getThrottleMs()).toBe(THROTTLE_DEFAULTS.max);
  });

  it('rounds non-integer ms', () => {
    setThrottleMs(1234.7);
    expect(getThrottleMs()).toBe(1235);
  });

  it('ignores garbage stored values and falls back to the mode default', () => {
    localStorage.setItem('strudel-tutor.model.throttle-ms', 'not-a-number');
    expect(getThrottleMs('local')).toBe(THROTTLE_DEFAULTS.local);
    expect(getThrottleMs('remote')).toBe(THROTTLE_DEFAULTS.remote);
  });

  it('notifies subscribers', () => {
    const cb = vi.fn();
    subscribeBackendChange(cb);
    setThrottleMs(1000);
    expect(cb).toHaveBeenCalled();
  });
});

describe('looksLikeApiKey', () => {
  it.each([
    'sk-or-v1-abcdef012345',
    'sk-or-v2-A1B2C3D4E5F6G7H8',
    'sk-or-abc-defghijklmnop',
    'sk-or-v1-_-_-_-_-_-_-_-_-',
  ])('accepts plausible OpenRouter key: %s', (key) => {
    expect(looksLikeApiKey(key)).toBe(true);
  });

  it.each([
    '',
    '   ',
    'sk-or-',
    'sk-or-short',
    'sk-anthropic-12345678901234',
    'pk-or-v1-12345678901234',
    'random text',
  ])('rejects %j', (key) => {
    expect(looksLikeApiKey(key)).toBe(false);
  });

  it('tolerates leading/trailing whitespace', () => {
    expect(looksLikeApiKey('   sk-or-v1-abcdefghij   ')).toBe(true);
  });
});

describe('subscribeBackendChange', () => {
  it('fires on setMode', () => {
    const cb = vi.fn();
    subscribeBackendChange(cb);
    setMode('remote');
    expect(cb).toHaveBeenCalled();
  });

  it('fires on setStoredApiKey (including clear)', () => {
    const cb = vi.fn();
    subscribeBackendChange(cb);
    setStoredApiKey('sk-or-v1-test1234567');
    setStoredApiKey(null);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('stops firing after unsubscribe', () => {
    const cb = vi.fn();
    const unsub = subscribeBackendChange(cb);
    unsub();
    setMode('remote');
    expect(cb).not.toHaveBeenCalled();
  });

  it('survives a throwing subscriber', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    subscribeBackendChange(bad);
    subscribeBackendChange(good);
    expect(() => setMode('remote')).not.toThrow();
    expect(good).toHaveBeenCalled();
  });
});

describe('localStorage exception safety', () => {
  it('returns defaults when localStorage throws on read', () => {
    const throwing: Storage = {
      length: 0,
      clear() {},
      getItem() {
        throw new Error('blocked');
      },
      key() {
        return null;
      },
      removeItem() {},
      setItem() {},
    };
    (globalThis as { localStorage: Storage }).localStorage = throwing;
    expect(getMode()).toBe('local');
    expect(getStoredApiKey()).toBeNull();
    expect(hasMadeBackendChoice()).toBe(false);
  });

  it('does not crash when localStorage throws on write', () => {
    const throwing: Storage = {
      length: 0,
      clear() {},
      getItem() {
        return null;
      },
      key() {
        return null;
      },
      removeItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    (globalThis as { localStorage: Storage }).localStorage = throwing;
    expect(() => setMode('remote')).not.toThrow();
    expect(() => setStoredApiKey('sk-or-v1-abc')).not.toThrow();
    expect(() => setStoredApiKey(null)).not.toThrow();
  });
});
