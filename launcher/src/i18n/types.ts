/**
 * src/i18n/types.ts — PRISM Launcher
 * Type AppLocale + resolver. Même pattern que PRISM front.
 */

export type AppLocale = 'fr' | 'en'

export function resolveLocale(input?: string | null): AppLocale {
  return input === 'en' ? 'en' : 'fr'
}
