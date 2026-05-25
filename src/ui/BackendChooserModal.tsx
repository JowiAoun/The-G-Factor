import { useEffect, useMemo, useRef, useState } from 'react';
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
  type BackendMode,
} from '../model/backend';

type Props = {
  /** Hides the close/cancel affordances when true (first-time decision is required). */
  isFirstVisit: boolean;
  onClose: () => void;
};

/**
 * Two-card chooser for the inference backend. Mounted by App on first
 * visit (blocking) and on demand via the ⚙ settings button (dismissable).
 *
 * The OpenRouter key, when remote is selected, is supplied by the user
 * here and only here — it is stored in `localStorage` per browser and
 * never lands in the deployed bundle. If a stored key already exists,
 * the input becomes an optional override field.
 */
export function BackendChooserModal({ isFirstVisit, onClose }: Props) {
  const [selected, setSelected] = useState<BackendMode | null>(() => {
    // Settings-triggered: pre-select the current mode. First-visit: no
    // pre-selection so the user has to make a deliberate choice.
    if (isFirstVisit) return null;
    return hasMadeBackendChoice() ? getMode() : null;
  });
  const [keyInput, setKeyInput] = useState('');
  const storedKey = useMemo(() => getStoredApiKey(), []);
  const [throttle, setThrottle] = useState<number>(() => getThrottleMs());

  const firstFocusRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstFocusRef.current?.focus();
  }, []);

  // ESC closes in settings mode only.
  useEffect(() => {
    if (isFirstVisit) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFirstVisit, onClose]);

  const showsKeyInput = selected === 'remote' && !storedKey;
  const showsOverrideInput = selected === 'remote' && !!storedKey;
  const keyInputTrimmed = keyInput.trim();
  const keyInputValid =
    keyInputTrimmed.length === 0 || looksLikeApiKey(keyInputTrimmed);

  const canSave = (() => {
    if (selected === null) return false;
    if (selected === 'local') return true;
    // Remote with a previously-saved key and no override typed → ok.
    if (storedKey && keyInputTrimmed.length === 0) return true;
    // Remote with a typed key → require it to look valid.
    if (keyInputTrimmed.length > 0) return looksLikeApiKey(keyInputTrimmed);
    return false;
  })();

  const handleSave = () => {
    if (!selected) return;
    if (selected === 'remote' && keyInputTrimmed.length > 0) {
      setStoredApiKey(keyInputTrimmed);
    }
    if (!isFirstVisit) {
      setThrottleMs(throttle);
    }
    setMode(selected);
    onClose();
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isFirstVisit) return;
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="backend-modal-backdrop"
      role="presentation"
      onClick={handleBackdrop}
    >
      <div
        className="backend-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backend-modal-title"
      >
        <div className="backend-modal-head">
          <h2 id="backend-modal-title">Where should we run Gemma?</h2>
          {!isFirstVisit && (
            <button
              className="backend-modal-close"
              onClick={onClose}
              aria-label="Close settings"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>

        <div className="backend-cards">
          <button
            ref={firstFocusRef}
            className={`backend-card ${selected === 'local' ? 'selected' : ''}`}
            onClick={() => setSelected('local')}
            role="radio"
            aria-checked={selected === 'local'}
          >
            <div className="backend-card-icon" aria-hidden="true">
              💻
            </div>
            <div className="backend-card-title">Locally</div>
            <div className="backend-card-subtitle">Gemma 4 E2B</div>
            <div className="backend-card-body">
              ~1.5 GB one-time download. Needs WebGPU. Runs entirely in your
              browser — zero network calls during generation.
            </div>
          </button>
          <button
            className={`backend-card ${selected === 'remote' ? 'selected' : ''}`}
            onClick={() => setSelected('remote')}
            role="radio"
            aria-checked={selected === 'remote'}
          >
            <div className="backend-card-icon" aria-hidden="true">
              ☁
            </div>
            <div className="backend-card-title">On OpenRouter</div>
            <div className="backend-card-subtitle">
              {REMOTE_MODEL_ID.replace('google/', '')}
            </div>
            <div className="backend-card-body">
              No download. Faster contestants. Calls OpenRouter directly from
              your browser using your key — nothing routes through our
              servers.
            </div>
          </button>
        </div>

        {showsKeyInput && (
          <div className="backend-key-block">
            <label htmlFor="backend-key-input" className="backend-key-label">
              Your OpenRouter API key
            </label>
            <input
              id="backend-key-input"
              type="password"
              className="backend-key-input"
              placeholder="sk-or-v1-…"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="backend-key-note">
              We call OpenRouter <em>directly from your browser</em> — your
              key never goes to our servers. Each contestant generation is
              a paid OpenRouter call against your balance, so we recommend
              creating a fresh key for this demo with a low spending limit.{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
              >
                Get a key →
              </a>
            </div>
            {keyInputTrimmed.length > 0 && !keyInputValid && (
              <div className="backend-key-error">
                That doesn't look like an OpenRouter key (should start with{' '}
                <code>sk-or-</code>).
              </div>
            )}
          </div>
        )}

        {showsOverrideInput && (
          <div className="backend-key-block">
            <div className="backend-key-status">
              ✓ Using your saved OpenRouter key (stored in this browser).
            </div>
            <label htmlFor="backend-key-input" className="backend-key-label">
              Paste a new key to replace it (optional)
            </label>
            <input
              id="backend-key-input"
              type="password"
              className="backend-key-input"
              placeholder="sk-or-v1-…"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {keyInputTrimmed.length > 0 && !keyInputValid && (
              <div className="backend-key-error">
                That doesn't look like an OpenRouter key (should start with{' '}
                <code>sk-or-</code>).
              </div>
            )}
          </div>
        )}

        {!isFirstVisit && (
          <div className="backend-throttle-block">
            <label
              htmlFor="backend-throttle-input"
              className="backend-key-label"
            >
              Delay between contestants: <b>{throttle} ms</b>
            </label>
            <input
              id="backend-throttle-input"
              type="range"
              min={0}
              max={5000}
              step={100}
              value={throttle}
              onChange={(e) => setThrottle(Number(e.target.value))}
              className="backend-throttle-slider"
            />
            <div className="backend-key-note">
              How long to pause between each Talent Show contestant generation.
              Higher values keep the free OpenRouter tier under its per-minute
              cap; <code>0</code> is fine for Local mode. Default{' '}
              {THROTTLE_DEFAULTS.default} ms.
            </div>
          </div>
        )}

        <div className="backend-actions">
          <button
            className="primary"
            disabled={!canSave}
            onClick={handleSave}
          >
            Save &amp; continue
          </button>
          {!isFirstVisit && (
            <button className="muted" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
