import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type EngineSection = 'runs' | 'compare' | 'history'

type EngineNavigationContextValue = {
  activeSection: EngineSection
  setActiveSection: (section: EngineSection) => void
  sections: { id: EngineSection; label: string; hint: string }[]
}

const ENGINE_SECTIONS: { id: EngineSection; label: string; hint: string }[] = [
  { id: 'runs', label: 'Runs backend', hint: 'Candidats utiles et lancement Python' },
  { id: 'compare', label: 'Compare TS / Python', hint: 'Ecarts, alignement et lecture de route' },
  { id: 'history', label: 'Historique', hint: 'Traçabilité réelle des runs backend' },
]

const EngineNavigationContext = createContext<EngineNavigationContextValue | null>(null)

export function EngineNavigationProvider({ children }: { children: ReactNode }) {
  const [activeSection, setActiveSection] = useState<EngineSection>('runs')

  const value = useMemo<EngineNavigationContextValue>(() => ({
    activeSection,
    setActiveSection,
    sections: ENGINE_SECTIONS,
  }), [activeSection])

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
