/**
 * src/hooks/useTheme.ts — PRISM Launcher
 * Gestion dark/light mode avec persistance localStorage.
 * Même comportement que le store PRISM principal.
 */

import { useCallback, useEffect, useState } from 'react'
import { dark, light, shadowsDark, shadowsLight } from '../tokens'

export type Theme = 'dark' | 'light'

export interface ThemeTokens {
  isDark:       boolean
  RAIL_BG:      string
  PANEL_BG:     string
  CARD_BG:      string
  SURFACE:      string
  PAGE_BG:      string
  BORDER:       string
  TEXT:         string
  TEXT_DIM:     string
  SHADOW_CARD:  string
  SHADOW_PANEL: string
  SHADOW_SOFT:  string
}

function buildTokens(isDark: boolean): ThemeTokens {
  const p = isDark ? dark : light
  const s = isDark ? shadowsDark : shadowsLight
  return {
    isDark,
    RAIL_BG:      p.rail,
    PANEL_BG:     p.panel,
    CARD_BG:      p.card,
    SURFACE:      p.card2,
    PAGE_BG:      p.page,
    BORDER:       p.border,
    TEXT:         p.text,
    TEXT_DIM:     p.textDim,
    SHADOW_CARD:  s.card,
    SHADOW_PANEL: s.panel,
    SHADOW_SOFT:  s.soft,
  }
}

const STORAGE_KEY = 'prism-launcher-theme'

export function useTheme(): [ThemeTokens, () => void] {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => setIsDark(v => !v), [])

  return [buildTokens(isDark), toggle]
}
