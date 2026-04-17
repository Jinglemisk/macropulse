/** @type {import('tailwindcss').Config} */
// All colors below resolve from CSS custom properties set by ThemeProvider.
// Palette values must be space-separated rgb triplets (e.g. "4 7 10") so the
// `<alpha-value>` placeholder works (e.g. `bg-surf/40`, `text-up`, `border-line/60`).
const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg:      themed('bg'),
        surf:    themed('surf'),
        surfAlt: themed('surf-alt'),
        line:    themed('line'),
        text:    themed('text'),
        muted:   themed('muted'),
        dim:     themed('dim'),
        up:      themed('up'),
        down:    themed('down'),
        warn:    themed('warn'),
        accent:  themed('accent'),
        classA:  themed('class-a'),
        classB:  themed('class-b'),
        classC:  themed('class-c'),
        classD:  themed('class-d')
      },
      fontFamily: {
        // Display-grade mono is the dominant typeface (Bloomberg-terminal feel).
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', '"Berkeley Mono"', 'ui-monospace', 'monospace'],
        // Sans is reserved for prose (notes, interpretation copy).
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // A serif accent for the regime hero verdict.
        display: ['"Fraunces"', '"IBM Plex Serif"', 'ui-serif', 'Georgia', 'serif']
      },
      letterSpacing: {
        ui: '0.18em',
        wider2: '0.24em'
      },
      borderRadius: {
        none: '0px'
      }
    }
  },
  plugins: []
};
