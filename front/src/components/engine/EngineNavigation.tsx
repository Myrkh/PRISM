import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { getEngineStrings } from '@/i18n/engine'
import { useLocaleStrings } from '@/i18n/useLocale'

export type EngineSection = 'runs' | 'compare' | 'history'

type EngineNavigationContextValue = {
  activeSection: EngineSection
  setActiveSection: (section: EngineSection) => void
  sections: { id: EngineSection; label: string; hint: string }[]
}

const EngineNavigationContext = createContext<EngineNavigationContextValue | null>(null)

export function EngineNavigationProvider({ children }: { children: ReactNode }) {
  const strings = useLocaleStrings(getEngineStrings)
  const [activeSection, setActiveSection] = useState<EngineSection>('runs')

  const value = useMemo<EngineNavigationContextValue>(() => ({
    activeSection,
    setActiveSection,
    sections: [
      { id: 'runs', label: strings.sections.runs.label, hint: strings.sections.runs.hint },
      { id: 'compare', label: strings.sections.compare.label, hint: strings.sections.compare.hint },
      { id: 'history', label: strings.sections.history.label, hint: strings.sections.history.hint },
    ],
  }), [activeSection, strings])

  return (
    <EngineNavigationContext.Provider value={value}>
      {children}
    </EngineNavigationContext.Provider>
  )
}

export function useEngineNavigation() {
  const context = useContext(EngineNavigationContext)
  if (!context) throw new Error('useEngineNavigation must be used inside EngineNavigationProvider')
  return context
}
