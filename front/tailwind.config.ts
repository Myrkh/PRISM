import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
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
