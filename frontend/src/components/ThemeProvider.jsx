import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { defaultSettings } from '../config/defaultSettings';
import {
  applyDensity, applyEffects, applyFontScale, applyMode, applyPalette
} from '../utils/cssVars';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ThemeCtx = createContext(null);
const PREFS_KEY = 'macropulse:prefs';

const LAYOUTS = ['cockpit', 'panel', 'floor'];
const DEFAULT_LAYOUT = 'panel';

export function ThemeProvider({ initialSettings, children }) {
  const settings = initialSettings || defaultSettings;
  const themes = settings.themes || defaultSettings.themes;

  const [prefs, setPrefs] = useLocalStorage(PREFS_KEY, {});

  const activeThemeId = prefs.activeTheme || settings.activeTheme || 'phosphor';
  const layout        = LAYOUTS.includes(prefs.layout) ? prefs.layout
                       : LAYOUTS.includes(settings.layout) ? settings.layout
                       : DEFAULT_LAYOUT;
  const fontScale     = prefs.fontScale   || settings.fontScale   || 1.0;
  const effects       = { ...(settings.effects || {}), ...(prefs.effects || {}) };

  const activeTheme = themes[activeThemeId] || themes.phosphor || defaultSettings.themes.phosphor;
  const fallbackPalette = defaultSettings.themes.phosphor.palette;

  // Apply CSS vars + dataset attributes on every change.
  // Density CSS vars are pinned to 'normal' — the Density switch was retired
  // in favor of the Layout switch, but downstream styles still consume --row,
  // --pad, --cell, --gap, --section.
  useEffect(() => {
    applyPalette(activeTheme.palette, fallbackPalette);
    applyMode(activeTheme.mode || 'dark');
    applyDensity('normal');
    document.documentElement.dataset.layout = layout;
    applyEffects(effects);
    applyFontScale(fontScale);
  }, [activeTheme, layout, effects, fontScale, fallbackPalette]);

  const setTheme = useCallback((id) => {
    if (!themes[id]) return;
    setPrefs((p) => ({ ...p, activeTheme: id }));
  }, [themes, setPrefs]);

  const setLayout = useCallback((id) => {
    if (!LAYOUTS.includes(id)) return;
    setPrefs((p) => ({ ...p, layout: id }));
  }, [setPrefs]);

  const setEffect = useCallback((key, value) => {
    setPrefs((p) => ({ ...p, effects: { ...(p.effects || {}), [key]: value } }));
  }, [setPrefs]);

  const cycleTheme = useCallback(() => {
    const ids = Object.keys(themes);
    const i = ids.indexOf(activeThemeId);
    setTheme(ids[(i + 1) % ids.length]);
  }, [themes, activeThemeId, setTheme]);

  const cycleLayout = useCallback(() => {
    const i = LAYOUTS.indexOf(layout);
    setLayout(LAYOUTS[(i + 1) % LAYOUTS.length]);
  }, [layout, setLayout]);

  const value = useMemo(() => ({
    settings,
    themes,
    activeThemeId,
    activeTheme,
    layout,
    layouts: LAYOUTS,
    effects,
    fontScale,
    setTheme,
    setLayout,
    setEffect,
    cycleTheme,
    cycleLayout
  }), [settings, themes, activeThemeId, activeTheme, layout, effects, fontScale,
       setTheme, setLayout, setEffect, cycleTheme, cycleLayout]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
