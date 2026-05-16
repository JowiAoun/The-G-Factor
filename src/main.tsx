import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpikeApp } from './spike/SpikeApp';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SpikeApp />
  </React.StrictMode>,
);
