import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRobust from './App-robust.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRobust />
  </StrictMode>,
);
