/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a',
        surface: '#2a2a2a',
        border: '#3a3a3a',
        'text-primary': '#e0e0e0',
        'text-secondary': '#a0a0a0',
        accent: '#00d9ff',
        'class-a': '#3b82f6',
        'class-b': '#10b981',
        'class-c': '#f59e0b',
        'class-d': '#a855f7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
