// Inlined fallback used when /settings.json fails to load.
// Keep palette keys in sync with public/settings.json.
export const defaultSettings = {
  activeTheme: 'phosphor',
  density: 'normal',
  fontScale: 1.0,
  effects: { scanlines: true, glow: true, grain: false },
  themes: {
    phosphor: {
      label: 'Phosphor Green CRT',
      mode: 'dark',
      palette: {
        bg: '4 7 10', surf: '10 20 16', surfAlt: '13 26 21', line: '26 43 34',
        text: '74 222 128', muted: '47 134 80', dim: '26 76 49',
        up: '163 255 138', down: '255 82 82', warn: '255 184 77', accent: '74 222 128',
        classA: '163 255 138', classB: '74 222 128', classC: '255 184 77', classD: '255 82 82'
      }
    },
    amber: {
      label: 'Bloomberg Amber',
      mode: 'dark',
      palette: {
        bg: '14 13 11', surf: '26 24 21', surfAlt: '32 30 27', line: '46 42 35',
        text: '245 185 66', muted: '138 122 85', dim: '82 70 50',
        up: '135 211 105', down: '255 107 107', warn: '245 185 66', accent: '77 208 225',
        classA: '135 211 105', classB: '245 185 66', classC: '255 158 87', classD: '255 107 107'
      }
    },
    slate: {
      label: 'Slate Cyan',
      mode: 'dark',
      palette: {
        bg: '11 16 32', surf: '19 26 46', surfAlt: '26 35 60', line: '36 48 73',
        text: '230 237 247', muted: '125 138 168', dim: '73 89 122',
        up: '74 222 128', down: '248 113 113', warn: '251 191 36', accent: '34 211 238',
        classA: '34 211 238', classB: '74 222 128', classC: '251 191 36', classD: '232 121 198'
      }
    },
    paper: {
      label: 'Paper Bright',
      mode: 'light',
      palette: {
        bg: '247 244 236', surf: '255 255 255', surfAlt: '242 238 228', line: '216 210 194',
        text: '26 26 26', muted: '107 99 86', dim: '168 156 138',
        up: '22 122 61', down: '179 38 30', warn: '184 109 9', accent: '30 99 214',
        classA: '22 122 61', classB: '30 99 214', classC: '184 109 9', classD: '179 38 30'
      }
    }
  }
};

export const PALETTE_KEYS = [
  'bg', 'surf', 'surfAlt', 'line', 'text', 'muted', 'dim',
  'up', 'down', 'warn', 'accent', 'classA', 'classB', 'classC', 'classD'
];

// camelCase palette key → kebab CSS variable name (without leading --)
export const cssVarName = (key) =>
  key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

export const TRIPLET_RE = /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/;
