import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpikeApp } from './spike/SpikeApp';
import { App } from './ui/App';
import './styles.css';

const isSpike = new URLSearchParams(window.location.search).has('spike');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isSpike ? <SpikeApp /> : <App />}</React.StrictMode>,
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
