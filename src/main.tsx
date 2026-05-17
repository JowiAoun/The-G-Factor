import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpikeApp } from './spike/SpikeApp';
import { App, type AppMode } from './ui/App';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const isSpike = params.has('spike');
const initialMode: AppMode = params.has('talentshow') ? 'talentshow' : 'remix';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isSpike ? <SpikeApp /> : <App initialMode={initialMode} />}
  </React.StrictMode>,
);

// Register the cache-first service worker only in production builds — dev
// runs through Vite HMR and skipping the worker keeps source-map reloads
// instant. Failure is silent: the app works fine without the SW; offline
// support just degrades to "works while tab stays open" instead of
// "survives full reload offline".
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
