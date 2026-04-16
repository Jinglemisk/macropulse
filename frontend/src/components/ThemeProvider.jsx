import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { defaultSettings } from '../config/defaultSettings';
import {
  applyDensity, applyEffects, applyFontScale, applyMode, applyPalette
} from '../utils/cssVars';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ThemeCtx = createContext(null);
const PREFS_KEY = 'macropulse:prefs';

export function ThemeProvider({ initialSettings, children }) {
  const settings = initialSettings || defaultSettings;
  const themes = settings.themes || defaultSettings.themes;

  const [prefs, setPrefs] = useLocalStorage(PREFS_KEY, {});

  const activeThemeId = prefs.activeTheme || settings.activeTheme || 'phosphor';
  const density       = prefs.density     || settings.density     || 'normal';
  const fontScale     = prefs.fontScale   || settings.fontScale   || 1.0;
  const effects       = { ...(settings.effects || {}), ...(prefs.effects || {}) };

  const activeTheme = themes[activeThemeId] || themes.phosphor || defaultSettings.themes.phosphor;
  const fallbackPalette = defaultSettings.themes.phosphor.palette;

  // Apply CSS vars + dataset attributes on every change.
  useEffect(() => {
    applyPalette(activeTheme.palette, fallbackPalette);
    applyMode(activeTheme.mode || 'dark');
    applyDensity(density);
    applyEffects(effects);
    applyFontScale(fontScale);
  }, [activeTheme, density, effects, fontScale, fallbackPalette]);

  const setTheme = useCallback((id) => {
    if (!themes[id]) return;
    setPrefs((p) => ({ ...p, activeTheme: id }));
  }, [themes, setPrefs]);

  const setDensity = useCallback((d) => {
    if (!['compact', 'normal', 'comfortable'].includes(d)) return;
    setPrefs((p) => ({ ...p, density: d }));
  }, [setPrefs]);

  const setEffect = useCallback((key, value) => {
    setPrefs((p) => ({ ...p, effects: { ...(p.effects || {}), [key]: value } }));
  }, [setPrefs]);

  const cycleTheme = useCallback(() => {
    const ids = Object.keys(themes);
    const i = ids.indexOf(activeThemeId);
    setTheme(ids[(i + 1) % ids.length]);
  }, [themes, activeThemeId, setTheme]);

  const cycleDensity = useCallback(() => {
    const order = ['compact', 'normal', 'comfortable'];
    const i = order.indexOf(density);
    setDensity(order[(i + 1) % order.length]);
  }, [density, setDensity]);

  const value = useMemo(() => ({
    settings,
    themes,
    activeThemeId,
    activeTheme,
    density,
    effects,
    fontScale,
    setTheme,
    setDensity,
    setEffect,
    cycleTheme,
    cycleDensity
  }), [settings, themes, activeThemeId, activeTheme, density, effects, fontScale,
       setTheme, setDensity, setEffect, cycleTheme, cycleDensity]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
