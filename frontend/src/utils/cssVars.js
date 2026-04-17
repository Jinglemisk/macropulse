// Apply a palette object ({bg:'4 7 10', ...}) to :root as CSS variables.
import { cssVarName, PALETTE_KEYS, TRIPLET_RE } from '../config/defaultSettings';

export function applyPalette(palette, fallbackPalette) {
  const root = document.documentElement;
  PALETTE_KEYS.forEach((key) => {
    let value = palette?.[key];
    if (!value || !TRIPLET_RE.test(String(value).trim())) {
      // eslint-disable-next-line no-console
      console.warn(`[macropulse] palette.${key} invalid ("${value}"); using fallback`);
      value = fallbackPalette?.[key];
    }
    if (value) {
      root.style.setProperty(`--${cssVarName(key)}`, value.trim());
    }
  });
}

export function applyDensity(density) {
  const root = document.documentElement;
  root.dataset.density = density;
  // Drive the per-density numerics through CSS vars so Tailwind arbitrary
  // values like h-[var(--row)] / px-[var(--pad)] just work.
  const sizes = {
    compact:     { row: '24px', pad: '6px',  text: '12px', gap: '8px',  section: '16px' },
    normal:      { row: '32px', pad: '10px', text: '13px', gap: '12px', section: '24px' },
    comfortable: { row: '40px', pad: '14px', text: '14px', gap: '16px', section: '32px' }
  };
  const s = sizes[density] || sizes.normal;
  root.style.setProperty('--row',     s.row);
  root.style.setProperty('--pad',     s.pad);
  root.style.setProperty('--cell',    s.text);
  root.style.setProperty('--gap',     s.gap);
  root.style.setProperty('--section', s.section);
}

export function applyMode(mode) {
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.style.colorScheme = mode;
}

export function applyEffects(effects = {}) {
  const root = document.documentElement;
  root.dataset.fxScanlines = effects.scanlines ? 'on' : 'off';
  root.dataset.fxGlow      = effects.glow      ? 'on' : 'off';
  root.dataset.fxGrain     = effects.grain     ? 'on' : 'off';
}

export function applyFontScale(scale = 1.0) {
  document.documentElement.style.fontSize = `${Math.round(16 * scale)}px`;
}
