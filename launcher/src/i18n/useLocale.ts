/**
 * src/i18n/useLocale.ts — PRISM Launcher
 * Hook locale + setter via localStorage + CustomEvent.
 * Même pattern que PRISM front (pas de Zustand ici — standalone).
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { type AppLocale, resolveLocale } from './types'

const STORAGE_KEY = 'prism-launcher-locale'
const EVENT_NAME  = 'prism-launcher-locale-change'

// ── Lecture / écriture locale ─────────────────────────────────────────────────

export function getStoredLocale(): AppLocale {
  return resolveLocale(localStorage.getItem(STORAGE_KEY))
}

export function setStoredLocale(locale: AppLocale): void {
  localStorage.setItem(STORAGE_KEY, locale)
  window.dispatchEvent(new CustomEvent<AppLocale>(EVENT_NAME, { detail: locale }))
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useLocale(): [AppLocale, (l: AppLocale) => void] {
  const [locale, setLocale] = useState<AppLocale>(getStoredLocale)

  useEffect(() => {
    const handler = (e: Event) => {
      setLocale((e as CustomEvent<AppLocale>).detail)
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  const changeLocale = useCallback((l: AppLocale) => {
    setStoredLocale(l)
  }, [])

  return [locale, changeLocale]
}

// ── Hook strings (même signature que le front) ────────────────────────────────

export function useLocaleStrings<T>(getter: (locale: AppLocale) => T): T {
  const [locale] = useLocale()
  return useMemo(() => getter(locale), [getter, locale])
}
