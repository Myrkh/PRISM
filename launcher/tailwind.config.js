/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        // Brand PRISM — identiques à tokens.ts
        teal:      { DEFAULT: '#009BA4', dim: '#5FD8D2', dark: '#007A82' },
        navy:      { DEFAULT: '#003D5C', dark: '#002A42' },
        // Dark palette
        'prism-rail':   '#0F1318',
        'prism-panel':  '#14181C',
        'prism-card':   '#23292F',
        'prism-card2':  '#1D232A',
        'prism-page':   '#1A1F24',
        'prism-border': '#2A3138',
      },
    },
  },
  plugins: [],
}
