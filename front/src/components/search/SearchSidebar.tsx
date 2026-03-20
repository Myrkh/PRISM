import { FilterX, Search } from 'lucide-react'
import { useSearchNavigation } from '@/components/search/SearchNavigation'
import { SEARCH_SCOPE_META, SEARCH_SCOPE_ORDER, getSearchScopeTone } from '@/components/search/searchMeta'
import {
  SidebarBody,
  SidebarSectionTitle,
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
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
      onMouseEnter={e => {
        if (!active) {
          sidebarHoverIn(e.currentTarget, {
            background: PAGE_BG,
            borderColor: `${BORDER}D0`,
            boxShadow: SHADOW_SOFT,
            color: TEXT,
          })
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          sidebarHoverOut(e.currentTarget, {
            background: 'transparent',
            borderColor: 'transparent',
            boxShadow: 'none',
            color: TEXT_DIM,
          })
        }
        sidebarPressUp(e.currentTarget, active ? SHADOW_CARD : 'none')
      }}
      onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
      onPointerUp={e => sidebarPressUp(e.currentTarget, active ? SHADOW_CARD : SHADOW_SOFT)}
      onPointerCancel={e => sidebarPressUp(e.currentTarget, active ? SHADOW_CARD : 'none')}
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
        {hint && (
          <p className="truncate text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {hint}
          </p>
        )}
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

export function SearchSidebar() {
  const {
    deferredQuery,
    scope,
    projectFilter,
    scopeCounts,
    projectFilters,
    totalIndexed,
    totalVisible,
    missingRevisionCount,
    setScope,
    setProjectFilter,
    clearFilters,
  } = useSearchNavigation()
  const { BORDER, PAGE_BG, SHADOW_SOFT, TEXT, TEXT_DIM } = usePrismTheme()

  const hasActiveFilters = scope !== 'all' || Boolean(projectFilter)
  const visibleProjectTotal = projectFilters.reduce((sum, project) => sum + project.count, 0)

  return (
    <SidebarBody className="pb-4">
      <div className="mb-3 flex items-start justify-between gap-3 px-2">
        <div>
          <SidebarSectionTitle className="mb-0 px-0">Recherche globale</SidebarSectionTitle>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {deferredQuery
              ? `${totalVisible} résultat${totalVisible > 1 ? 's' : ''} pour « ${deferredQuery} »`
              : `${totalIndexed} objets indexés dans l’espace de travail`}
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
            onMouseEnter={e => sidebarHoverIn(e.currentTarget, {
              background: `${BORDER}12`,
              borderColor: `${BORDER}D8`,
              boxShadow: SHADOW_SOFT,
              color: TEXT,
            })}
            onMouseLeave={e => {
              sidebarHoverOut(e.currentTarget, {
                background: PAGE_BG,
                borderColor: `${BORDER}C8`,
                boxShadow: 'none',
                color: TEXT_DIM,
              })
              sidebarPressUp(e.currentTarget, 'none')
            }}
            onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
            onPointerUp={e => sidebarPressUp(e.currentTarget, SHADOW_SOFT)}
            onPointerCancel={e => sidebarPressUp(e.currentTarget, 'none')}
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
            <FilterButton
              label={SEARCH_SCOPE_META.all.label}
              hint={SEARCH_SCOPE_META.all.hint}
              count={Object.values(scopeCounts).reduce((sum, value) => sum + value, 0)}
              active={scope === 'all'}
              tone={getSearchScopeTone('sifs')}
              onClick={() => setScope('all')}
            />
            {SEARCH_SCOPE_ORDER.map(scopeId => {
              const meta = SEARCH_SCOPE_META[scopeId]
              return (
                <FilterButton
                  key={scopeId}
                  label={meta.label}
                  hint={meta.hint}
                  count={scopeCounts[scopeId]}
                  active={scope === scopeId}
                  tone={getSearchScopeTone(scopeId)}
                  onClick={() => setScope(scopeId)}
                />
              )
            })}
          </div>
          {missingRevisionCount > 0 && (
            <p className="mt-3 px-2 text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
              L’historique de {missingRevisionCount} SIF se charge en arrière-plan pour enrichir la recherche.
            </p>
          )}
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>Projets</SidebarSectionTitle>
          <div className="space-y-1">
            <FilterButton
              label="Tous les projets"
              hint="Recherche transverse sans restriction"
              count={visibleProjectTotal}
              active={!projectFilter}
              tone={getSearchScopeTone('projects')}
              onClick={() => setProjectFilter(null)}
            />
            {projectFilters.map(project => (
              <FilterButton
                key={project.id}
                label={project.label}
                count={project.count}
                active={projectFilter === project.id}
                tone={getSearchScopeTone('projects')}
                onClick={() => setProjectFilter(project.id)}
              />
            ))}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>Usage</SidebarSectionTitle>
          <div className="flex items-start gap-2 px-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            <Search size={13} className="mt-[2px] shrink-0" />
            <p>
              Tape un tag instrument, une SIF, une hypothèse, une campagne ou une révision. Chaque résultat ouvre directement la bonne vue.
            </p>
          </div>
        </div>
      </div>
    </SidebarBody>
  )
}
