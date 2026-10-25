import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill'
import './index.css'
import App from './App.tsx'

// Enables full-color world flag emojis on Windows Chromium/Firefox browsers
polyfillCountryFlagEmojis();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
