import { useState } from 'react';
import { AttributionsModal } from './AttributionsModal';

// TODO: replace with the published blog-article URL once the post is live.
const BLOG_URL: string | null = null;
// TODO: replace with the public GitHub repo URL once the repo is published.
const REPO_URL: string | null = null;

const AUTHOR_URL = 'https://github.com/JowiAoun';

/**
 * Persistent page footer. Renders four pieces:
 *   1. Blog article link (placeholder until published).
 *   2. Attributions modal trigger (currently the CC BY 4.0 credit for the
 *      DiceBear ToonHead style).
 *   3. Project GitHub repo link (placeholder until published).
 *   4. "Made by Jowi Aoun" credit pointing at the author's GitHub profile.
 *
 * Placeholder URLs render as muted, non-clickable spans so users don't
 * click a dead link expecting content. Swapping in a real value flips them
 * to live anchors automatically.
 */
export function Footer() {
  const [attrOpen, setAttrOpen] = useState(false);

  return (
    <>
      <footer className="app-footer">
        <nav className="footer-links" aria-label="Site footer">
          {BLOG_URL ? (
            <a href={BLOG_URL} target="_blank" rel="noreferrer">
              Read the blog
            </a>
          ) : (
            <span className="footer-link-todo" title="Coming soon">
              Read the blog
            </span>
          )}
          <span className="footer-sep" aria-hidden="true">
            ✦
          </span>
          <button
            type="button"
            className="footer-link-btn"
            onClick={() => setAttrOpen(true)}
          >
            Programme credits
          </button>
          <span className="footer-sep" aria-hidden="true">
            ✦
          </span>
          {REPO_URL ? (
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              Backstage pass
            </a>
          ) : (
            <span className="footer-link-todo" title="Coming soon">
              Backstage pass
            </span>
          )}
        </nav>
        <div className="footer-credit">
          Direction by{' '}
          <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
            Jowi Aoun
          </a>{' '}
          <span aria-label="love">❤️</span>
        </div>
      </footer>
      {attrOpen && <AttributionsModal onClose={() => setAttrOpen(false)} />}
    </>
  );
}
