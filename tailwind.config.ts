import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sl-bg':      '#050c1a',
        'sl-surface': '#08111f',
        'sl-border':  '#0f2037',
        'sl-accent':  '#06b6d4',
        'sl-text':    '#e2e8f0',
        'sl-muted':   '#475569',
        'sil-1': '#4ade80',
        'sil-2': '#60a5fa',
        'sil-3': '#fbbf24',
        'sil-4': '#c084fc',
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        barlow:   ['Barlow', 'sans-serif'],
        mono:     ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config