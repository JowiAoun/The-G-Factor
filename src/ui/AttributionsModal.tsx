import { useEffect, useRef } from 'react';

type Props = { onClose: () => void };

/**
 * Open-attribution modal. Currently scoped to the one credit that is
 * legally required (the DiceBear ToonHead avatar style under CC BY 4.0).
 * Other dependencies' licences live in `package.json` and the dist
 * tarballs of those packages - they're MIT/Apache/BSD-style and don't
 * require a per-page credit.
 */
export function AttributionsModal({ onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="attr-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attr-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="attr-modal">
        <header className="attr-modal-head">
          <h2 id="attr-modal-title">Programme Credits</h2>
          <button
            ref={closeRef}
            type="button"
            className="attr-modal-close"
            onClick={onClose}
            aria-label="Close attributions"
            title="Close (Esc)"
          >
            ×
          </button>
        </header>

        <section className="attr-section">
          <h3>Avatars</h3>
          <p>
            Talent-show contestants and the Gemma persona wear the{' '}
            <a
              href="https://www.dicebear.com/styles/toon-head/"
              target="_blank"
              rel="noreferrer"
            >
              DiceBear ToonHead
            </a>{' '}
            style.
          </p>
          <p className="attr-license">
            <strong>ToonHead by Johan Melin</strong> - licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            . Remix of the original: we seed the renderer deterministically
            from each contestant's variation code and cycle five mouth poses
            to drive the talking animation.
          </p>
          <p className="attr-meta">
            The DiceBear library itself ships under the MIT license.
          </p>
        </section>
      </div>
    </div>
  );
}
