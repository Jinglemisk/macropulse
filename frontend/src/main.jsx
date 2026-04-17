import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './components/ThemeProvider.jsx';
import { defaultSettings } from './config/defaultSettings.js';
import './styles/index.css';

// Cache-bust the runtime settings file in dev so edits are visible immediately.
const settingsUrl = import.meta.env.DEV
  ? `/settings.json?v=${Date.now()}`
  : '/settings.json';

async function bootstrap() {
  let settings = defaultSettings;
  try {
    const res = await fetch(settingsUrl, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      // Merge so missing keys fall back to defaults.
      settings = {
        ...defaultSettings,
        ...json,
        themes: { ...defaultSettings.themes, ...(json.themes || {}) },
        effects: { ...(defaultSettings.effects || {}), ...(json.effects || {}) }
      };
    }
  } catch {
    // ignore — defaultSettings will be used
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider initialSettings={settings}>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
}

bootstrap();
