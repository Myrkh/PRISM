import type { AppLocale } from '@/i18n/types'
import { resolveAppLocale } from '@/i18n/types'

export type AppThemePreference = 'dark' | 'light'

export interface AppPreferences {
  language: AppLocale
  theme: AppThemePreference
  engineCompareTolerancePct: number
  workspaceLeftPanelWidth: number
  workspaceRightPanelWidth: number
}

export const APP_PREFERENCES_STORAGE_KEY = 'prism-app-preferences'

export const WORKSPACE_LEFT_PANEL_WIDTH_MIN = 220
export const WORKSPACE_LEFT_PANEL_WIDTH_MAX = 320
export const WORKSPACE_LEFT_PANEL_WIDTH_DEFAULT = 240

export const WORKSPACE_RIGHT_PANEL_WIDTH_MIN = 220
export const WORKSPACE_RIGHT_PANEL_WIDTH_MAX = 720
export const WORKSPACE_RIGHT_PANEL_WIDTH_DEFAULT = 360

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  language: 'fr',
  theme: 'dark',
  engineCompareTolerancePct: 0.1,
  workspaceLeftPanelWidth: WORKSPACE_LEFT_PANEL_WIDTH_DEFAULT,
  workspaceRightPanelWidth: WORKSPACE_RIGHT_PANEL_WIDTH_DEFAULT,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value === null ? false : typeof value === 'object'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function resolveAppPreferences(input?: Partial<AppPreferences> | null): AppPreferences {
  const source = isRecord(input) ? input : {}
  const language = resolveAppLocale(typeof source.language === 'string' ? source.language : null)
  const theme = source.theme === 'light' ? 'light' : DEFAULT_APP_PREFERENCES.theme
  const tolerance = typeof source.engineCompareTolerancePct === 'number' && Number.isFinite(source.engineCompareTolerancePct)
    ? clamp(source.engineCompareTolerancePct, 0, 5)
    : DEFAULT_APP_PREFERENCES.engineCompareTolerancePct
  const workspaceLeftPanelWidth = typeof source.workspaceLeftPanelWidth === 'number' && Number.isFinite(source.workspaceLeftPanelWidth)
    ? Math.round(clamp(source.workspaceLeftPanelWidth, WORKSPACE_LEFT_PANEL_WIDTH_MIN, WORKSPACE_LEFT_PANEL_WIDTH_MAX))
    : DEFAULT_APP_PREFERENCES.workspaceLeftPanelWidth
  const workspaceRightPanelWidth = typeof source.workspaceRightPanelWidth === 'number' && Number.isFinite(source.workspaceRightPanelWidth)
    ? Math.round(clamp(source.workspaceRightPanelWidth, WORKSPACE_RIGHT_PANEL_WIDTH_MIN, WORKSPACE_RIGHT_PANEL_WIDTH_MAX))
    : DEFAULT_APP_PREFERENCES.workspaceRightPanelWidth

  return {
    language,
    theme,
    engineCompareTolerancePct: Number(tolerance.toFixed(2)),
    workspaceLeftPanelWidth,
    workspaceRightPanelWidth,
  }
}

export function loadAppPreferences(): AppPreferences {
  if (typeof window === 'undefined') return DEFAULT_APP_PREFERENCES

  try {
    const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY)
    if (raw === null || raw === '') return DEFAULT_APP_PREFERENCES
    return resolveAppPreferences(JSON.parse(raw))
  } catch {
    return DEFAULT_APP_PREFERENCES
  }
}

export function saveAppPreferences(preferences: AppPreferences): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      APP_PREFERENCES_STORAGE_KEY,
      JSON.stringify(resolveAppPreferences(preferences)),
    )
  } catch {
    // Best-effort local persistence only.
  }
}

export function applyAppPreferencesToDocument(preferences: AppPreferences): void {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', preferences.theme === 'dark')
  document.documentElement.lang = preferences.language
}
