import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpikeApp } from './spike/SpikeApp';
import { App } from './ui/App';
import './styles.css';

const isSpike = new URLSearchParams(window.location.search).has('spike');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isSpike ? <SpikeApp /> : <App />}</React.StrictMode>,
);
