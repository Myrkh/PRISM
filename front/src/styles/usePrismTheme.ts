import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { colors, dark, light, radius, semantic } from './tokens'

const lightRail = '#EEF3F7'
const lightPanel = '#EEF3F7'
const lightCard = '#FFFFFF'
const lightSurface = '#F8FBFD'
const lightTextDim = '#667085'
const lightBorder = '#D6DEE8'

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
        rail: lightRail,
        panel: lightPanel,
        card: lightCard,
        surface: lightSurface,
        page: lightRail,
        border: lightBorder,
        text: light.text,
        textDim: lightTextDim,
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
