import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { resolveAppLocale, type AppLocale } from './types'

export function useAppLocale(): AppLocale {
  return useAppStore(state => resolveAppLocale(state.preferences.language))
}

export function useLocaleStrings<T>(getter: (locale: AppLocale) => T): T {
  const locale = useAppLocale()
  return useMemo(() => getter(locale), [getter, locale])
}
