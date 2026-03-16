import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { colors, dark, light, radius, semantic } from './tokens'

function buildTheme(isDark: boolean) {
  const palette = isDark
    ? {
        rail: dark.rail,
        panel: dark.panel,
        card: dark.card,
        surface: dark.card2,
        page: dark.page,
        border: dark.border,
        text: dark.text,
        textDim: dark.textDim,
      }
    : {
        rail: light.rail,
        panel: light.panel,
        card: light.card,
        surface: light.card2,
        page: light.page,
        border: light.border,
        text: light.text,
        textDim: light.textDim,
      }

  const shadows = isDark
    ? {
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 30px rgba(0,0,0,0.28), 0 4px 10px rgba(0,0,0,0.18)',
        panel: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 44px rgba(0,0,0,0.34), 0 6px 16px rgba(0,0,0,0.22)',
        tab: '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 22px rgba(0,0,0,0.24), 0 3px 8px rgba(0,0,0,0.16)',
        dock: '-18px 0 40px rgba(0,0,0,0.34), -2px 0 8px rgba(0,0,0,0.22), 1px 0 0 rgba(255,255,255,0.03) inset',
        soft: '0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 22px rgba(0,0,0,0.20)',
      }
    : {
        card: '0 1px 0 rgba(255,255,255,0.95) inset, 0 12px 28px rgba(15,23,42,0.05), 0 3px 8px rgba(15,23,42,0.03)',
        panel: '0 1px 0 rgba(255,255,255,0.96) inset, 0 18px 42px rgba(15,23,42,0.07), 0 4px 12px rgba(15,23,42,0.04)',
        tab: '0 1px 0 rgba(255,255,255,0.94) inset, 0 10px 24px rgba(15,23,42,0.05), 0 2px 6px rgba(15,23,42,0.03)',
        dock: '-18px 0 40px rgba(15,23,42,0.08), -2px 0 8px rgba(15,23,42,0.04), 1px 0 0 rgba(255,255,255,0.82) inset',
        soft: '0 1px 0 rgba(255,255,255,0.92) inset, 0 8px 22px rgba(15,23,42,0.04)',
      }

  return {
    isDark,
    BORDER: palette.border,
    RAIL_BG: palette.rail,
    PANEL_BG: palette.panel,
    CARD_BG: palette.card,
    SURFACE: palette.surface,
    PAGE_BG: palette.page,
    TEXT: palette.text,
    TEXT_DIM: palette.textDim,
    TEAL: colors.teal,
    TEAL_DIM: colors.tealDim,
    NAVY: colors.navy,
    NAVY2: colors.navyDark,
    R: radius,
    SHADOW_CARD: shadows.card,
    SHADOW_PANEL: shadows.panel,
    SHADOW_TAB: shadows.tab,
    SHADOW_DOCK: shadows.dock,
    SHADOW_SOFT: shadows.soft,
    semantic,
    dark: {
      rail: palette.rail,
      panel: palette.panel,
      card: palette.card,
      card2: palette.surface,
      page: palette.page,
      border: palette.border,
      text: palette.text,
      textDim: palette.textDim,
    },
  }
}

export type PrismTheme = ReturnType<typeof buildTheme>

export function usePrismTheme(): PrismTheme {
  const isDark = useAppStore(state => state.isDark)
  return useMemo(() => buildTheme(isDark), [isDark])
}
