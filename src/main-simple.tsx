import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppSimple from './App-simple.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppSimple />
  </StrictMode>,
);
