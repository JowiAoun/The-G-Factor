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
