import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { EngineRun } from '@/core/types'
import { dbFetchEngineRuns } from '@/lib/engineRuns'
import { AUDIT_SCOPE_ORDER, AUDIT_SCOPE_META, type AuditScope } from '@/components/audit/auditModel'

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
      label: AUDIT_SCOPE_META[scope].label,
      hint: AUDIT_SCOPE_META[scope].hint,
    })),
    engineRuns,
    engineRunsLoading,
  }), [activeScope, engineRuns, engineRunsLoading, projectFilter])

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
