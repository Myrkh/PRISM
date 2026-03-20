export type AppLocale = 'fr' | 'en'

export function resolveAppLocale(input?: string | null): AppLocale {
  return input === 'en' ? 'en' : 'fr'
}
