import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { EngineRun } from '@/core/types'
import { dbFetchEngineRuns } from '@/lib/engineRuns'
import { AUDIT_SCOPE_ORDER, type AuditScope } from '@/components/audit/auditModel'
import { getAuditStrings } from '@/i18n/audit'
import { useLocaleStrings } from '@/i18n/useLocale'

type AuditNavigationContextValue = {
  activeScope: AuditScope
  setActiveScope: (scope: AuditScope) => void
  projectFilter: string | null
  setProjectFilter: (projectId: string | null) => void
  clearFilters: () => void
  scopes: { id: AuditScope; label: string; hint: string }[]
  engineRuns: EngineRun[]
  engineRunsLoading: boolean
}

const AuditNavigationContext = createContext<AuditNavigationContextValue | null>(null)

export function AuditNavigationProvider({ children }: { children: ReactNode }) {
  const strings = useLocaleStrings(getAuditStrings)
  const [activeScope, setActiveScope] = useState<AuditScope>('all')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [engineRuns, setEngineRuns] = useState<EngineRun[]>([])
  const [engineRunsLoading, setEngineRunsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadRuns = async () => {
      setEngineRunsLoading(true)
      try {
        const runs = await dbFetchEngineRuns({ limit: 300 })
        if (!active) return
        setEngineRuns(runs)
      } catch {
        if (!active) return
        setEngineRuns([])
      } finally {
        if (active) setEngineRunsLoading(false)
      }
    }

    void loadRuns()
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuditNavigationContextValue>(() => ({
    activeScope,
    setActiveScope,
    projectFilter,
    setProjectFilter,
    clearFilters: () => {
      setActiveScope('all')
      setProjectFilter(null)
    },
    scopes: AUDIT_SCOPE_ORDER.map(scope => ({
      id: scope,
      label: strings.scopes[scope].label,
      hint: strings.scopes[scope].hint,
    })),
    engineRuns,
    engineRunsLoading,
  }), [activeScope, engineRuns, engineRunsLoading, projectFilter, strings])

  return (
    <AuditNavigationContext.Provider value={value}>
      {children}
    </AuditNavigationContext.Provider>
  )
}

export function useAuditNavigation() {
  const context = useContext(AuditNavigationContext)
  if (!context) throw new Error('useAuditNavigation must be used inside AuditNavigationProvider')
  return context
}
