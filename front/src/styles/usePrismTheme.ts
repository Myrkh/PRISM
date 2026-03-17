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
        card: '0 24px 46px rgba(0,0,0,0.34), 0 10px 18px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.16)',
        panel: '0 32px 66px rgba(0,0,0,0.42), 0 12px 24px rgba(0,0,0,0.28), 0 3px 6px rgba(0,0,0,0.18)',
        tab: '0 16px 30px rgba(0,0,0,0.30), 0 6px 12px rgba(0,0,0,0.19), 0 1px 3px rgba(0,0,0,0.14)',
        dock: '-24px 0 50px rgba(0,0,0,0.42), -6px 0 14px rgba(0,0,0,0.24), 1px 0 0 rgba(255,255,255,0.04) inset',
        soft: '0 14px 28px rgba(0,0,0,0.22), 0 5px 10px rgba(0,0,0,0.15)',
      }
    : {
        card: '0 24px 46px rgba(15,23,42,0.065), 0 10px 18px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.025)',
        panel: '0 30px 64px rgba(15,23,42,0.085), 0 12px 24px rgba(15,23,42,0.05), 0 3px 6px rgba(15,23,42,0.03)',
        tab: '0 16px 30px rgba(15,23,42,0.06), 0 6px 12px rgba(15,23,42,0.035), 0 1px 3px rgba(15,23,42,0.025)',
        dock: '-24px 0 50px rgba(15,23,42,0.10), -6px 0 14px rgba(15,23,42,0.045), 1px 0 0 rgba(255,255,255,0.62) inset',
        soft: '0 14px 28px rgba(15,23,42,0.05), 0 5px 10px rgba(15,23,42,0.028)',
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
