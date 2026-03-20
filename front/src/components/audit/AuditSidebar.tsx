import { useMemo } from 'react'
import { FilterX, Search } from 'lucide-react'
import {
  AUDIT_SCOPE_META,
  buildAuditEntries,
  matchesAuditScope,
} from '@/components/audit/auditModel'
import { useAuditNavigation } from '@/components/audit/AuditNavigation'
import {
  SidebarBody,
  SidebarSectionTitle,
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

type FilterButtonProps = {
  label: string
  hint?: string
  count: number
  active: boolean
  tone: string
  onClick: () => void
}

function FilterButton({ label, hint, count, active, tone, onClick }: FilterButtonProps) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-full items-start gap-2 overflow-hidden rounded-md px-2.5 py-2 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
      style={{
        background: active ? SURFACE : 'transparent',
        border: `1px solid ${active ? `${tone}24` : 'transparent'}`,
        boxShadow: active ? SHADOW_CARD : 'none',
        color: active ? TEXT : TEXT_DIM,
        transform: 'translateY(0) scale(1)',
      }}
      onMouseEnter={event => {
        if (!active) {
          sidebarHoverIn(event.currentTarget, {
            background: PAGE_BG,
            borderColor: `${BORDER}D0`,
            boxShadow: SHADOW_SOFT,
            color: TEXT,
          })
        }
      }}
      onMouseLeave={event => {
        if (!active) {
          sidebarHoverOut(event.currentTarget, {
            background: 'transparent',
            borderColor: 'transparent',
            boxShadow: 'none',
            color: TEXT_DIM,
          })
        }
        sidebarPressUp(event.currentTarget, active ? SHADOW_CARD : 'none')
      }}
      onPointerDown={event => sidebarPressDown(event.currentTarget, SHADOW_SOFT)}
      onPointerUp={event => sidebarPressUp(event.currentTarget, active ? SHADOW_CARD : SHADOW_SOFT)}
      onPointerCancel={event => sidebarPressUp(event.currentTarget, active ? SHADOW_CARD : 'none')}
    >
      <div
        className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
        style={{
          background: tone,
          opacity: active ? 1 : 0,
          transform: `translateX(${active ? '0px' : '-1px'}) scaleY(${active ? 1 : 0.6})`,
        }}
      />
      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate text-sm font-semibold">{label}</p>
        {hint ? (
          <p className="truncate text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {hint}
          </p>
        ) : null}
      </div>
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold font-mono"
        style={{
          borderColor: `${BORDER}A8`,
          background: PAGE_BG,
          color: active ? tone : TEXT_DIM,
        }}
      >
        {count}
      </span>
    </button>
  )
}

export function AuditSidebar() {
  const projects = useAppStore(state => state.projects)
  const { activeScope, setActiveScope, projectFilter, setProjectFilter, clearFilters, scopes, engineRuns, engineRunsLoading } = useAuditNavigation()
  const { BORDER, PAGE_BG, SHADOW_SOFT, TEXT, TEXT_DIM } = usePrismTheme()

  const entries = useMemo(() => buildAuditEntries(projects, engineRuns), [engineRuns, projects])
  const hasActiveFilters = activeScope !== 'all' || Boolean(projectFilter)
  const filteredByScope = entries.filter(entry => matchesAuditScope(entry, activeScope))
  const warningCount = filteredByScope.filter(entry => entry.level === 'warning').length

  const projectCounts = useMemo(() => (
    projects
      .map(project => ({
        id: project.id,
        label: project.name,
        count: entries.filter(entry => entry.projectId === project.id && matchesAuditScope(entry, activeScope)).length,
      }))
      .filter(project => project.count > 0)
  ), [activeScope, entries, projects])

  return (
    <SidebarBody className="pb-4">
      <div className="mb-3 flex items-start justify-between gap-3 px-2">
        <div>
          <SidebarSectionTitle className="mb-0 px-0">Journal d'audit</SidebarSectionTitle>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {engineRunsLoading
              ? 'Synchronisation des runs Engine en cours…'
              : projectFilter
                ? `${filteredByScope.length} événement${filteredByScope.length > 1 ? 's' : ''} dans le projet filtré`
                : `${entries.length} événements reconstruits depuis les dossiers actifs et les runs backend`}
          </p>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
            style={{
              borderColor: `${BORDER}C8`,
              background: PAGE_BG,
              color: TEXT_DIM,
              boxShadow: 'none',
              transform: 'translateY(0) scale(1)',
            }}
            onMouseEnter={event => sidebarHoverIn(event.currentTarget, {
              background: `${BORDER}12`,
              borderColor: `${BORDER}D8`,
              boxShadow: SHADOW_SOFT,
              color: TEXT,
            })}
            onMouseLeave={event => {
              sidebarHoverOut(event.currentTarget, {
                background: PAGE_BG,
                borderColor: `${BORDER}C8`,
                boxShadow: 'none',
                color: TEXT_DIM,
              })
              sidebarPressUp(event.currentTarget, 'none')
            }}
            onPointerDown={event => sidebarPressDown(event.currentTarget, SHADOW_SOFT)}
            onPointerUp={event => sidebarPressUp(event.currentTarget, SHADOW_SOFT)}
            onPointerCancel={event => sidebarPressUp(event.currentTarget, 'none')}
          >
            <FilterX size={11} />
            Reset
          </button>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <SidebarSectionTitle>Portée</SidebarSectionTitle>
          <div className="space-y-1">
            {scopes.map(scope => (
              <FilterButton
                key={scope.id}
                label={scope.label}
                hint={scope.hint}
                count={entries.filter(entry => matchesAuditScope(entry, scope.id)).length}
                active={activeScope === scope.id}
                tone={AUDIT_SCOPE_META[scope.id].tone}
                onClick={() => setActiveScope(scope.id)}
              />
            ))}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>Projets</SidebarSectionTitle>
          <div className="space-y-1">
            <FilterButton
              label="Tous les projets"
              hint="Lecture transverse sans restriction"
              count={filteredByScope.length}
              active={!projectFilter}
              tone={AUDIT_SCOPE_META.all.tone}
              onClick={() => setProjectFilter(null)}
            />
            {projectCounts.map(project => (
              <FilterButton
                key={project.id}
                label={project.label}
                count={project.count}
                active={projectFilter === project.id}
                tone={AUDIT_SCOPE_META.all.tone}
                onClick={() => setProjectFilter(project.id)}
              />
            ))}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>Lecture rapide</SidebarSectionTitle>
          <div className="space-y-2 px-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            <div className="rounded-md border px-3 py-2" style={{ borderColor: `${BORDER}70`, background: PAGE_BG, color: TEXT }}>
              {warningCount} événement{warningCount > 1 ? 's' : ''} warning dans le périmètre courant
            </div>
            <div className="flex items-start gap-2">
              <Search size={13} className="mt-[2px] shrink-0" />
              <p>
                Utilise la recherche du panneau central pour retrouver un projet, une SIF, une action ou un run Engine.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SidebarBody>
  )
}
