import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, type AppMode } from './ui/App';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const initialMode: AppMode = params.has('leaderboard')
  ? 'leaderboard'
  : params.has('talentshow')
    ? 'talentshow'
    : 'remix';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App initialMode={initialMode} />
  </React.StrictMode>,
);

// Offline support, prod-only. The worker uses network-first for HTML so
// a stale prod bundle can't strand a user on the wrong content (the
// `pnpm preview` → `pnpm dev` collision class), and cache-first only
// for hashed `/assets/*` which are content-addressed and safe to cache
// forever. Cache names carry a build-time-injected version string
// (`swVersion` plugin in vite.config.ts) so each deploy installs a
// fresh cache and the previous build's bytes are purged on activate.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
