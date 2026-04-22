import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppFallback from './App-fallback.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppFallback />
  </StrictMode>,
);
