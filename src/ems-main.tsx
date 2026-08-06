import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/app.css';

/**
 * Entry point for the EMS module (`/ems.html`).
 *
 * It keeps its own HTML entry because its Figma-transcribed token set and
 * global `body` styles are deliberately unscoped — mounting it in the same
 * document as the PMS would have the two design systems fight over
 * `--border-strong` and the page background.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
