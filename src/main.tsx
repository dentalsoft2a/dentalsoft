import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n/config';
import App from './App.tsx';
import './index.css';
import { checkAndClearCache } from './utils/cacheManager';
import './utils/logger';

checkAndClearCache();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
