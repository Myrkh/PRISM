export type AppThemePreference = 'dark' | 'light'

export interface AppPreferences {
  theme: AppThemePreference
  engineCompareTolerancePct: number
}

export const APP_PREFERENCES_STORAGE_KEY = 'prism-app-preferences'

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: 'dark',
  engineCompareTolerancePct: 0.1,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value === null ? false : typeof value === 'object'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function resolveAppPreferences(input?: Partial<AppPreferences> | null): AppPreferences {
  const source = isRecord(input) ? input : {}
  const theme = source.theme === 'light' ? 'light' : DEFAULT_APP_PREFERENCES.theme
  const tolerance = typeof source.engineCompareTolerancePct === 'number' && Number.isFinite(source.engineCompareTolerancePct)
    ? clamp(source.engineCompareTolerancePct, 0, 5)
    : DEFAULT_APP_PREFERENCES.engineCompareTolerancePct

  return {
    theme,
    engineCompareTolerancePct: Number(tolerance.toFixed(2)),
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
