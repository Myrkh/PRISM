import type { ElementType } from 'react'
import { BookOpen, FilterX, Search } from 'lucide-react'
import {
  INITIAL_LIBRARY_VISIBLE_COUNT,
  LIBRARY_SUBSYSTEM_META,
} from '@/components/library/LibraryTemplateCard'
import {
  useLibraryNavigation,
  type LibrarySourceScope,
  type LibrarySubsystemScope,
} from '@/components/library/LibraryNavigation'
import {
  SidebarBody,
  SidebarSectionTitle,
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { usePrismTheme } from '@/styles/usePrismTheme'

const LIBRARY_SOURCE_META: Record<LibrarySourceScope, { label: string; hint: string; tone: string }> = {
  all: {
    label: 'Tout le catalogue',
    hint: 'Standards, projets et bibliothèque personnelle',
    tone: '#0F766E',
  },
  builtin: {
    label: 'Standards validés',
    hint: 'Catalogue lambda_db et base validée',
    tone: '#0F766E',
  },
  project: {
    label: 'Templates projet',
    hint: 'Composants propres à un ou plusieurs projets',
    tone: '#F59E0B',
  },
  user: {
    label: 'Bibliothèque personnelle',
    hint: 'Mes templates réutilisables et imports privés',
    tone: '#0284C7',
  },
}

type FilterButtonProps = {
  label: string
  hint?: string
  count: number
  active: boolean
  tone: string
  Icon?: ElementType
  onClick: () => void
}

function FilterButton({ label, hint, count, active, tone, Icon, onClick }: FilterButtonProps) {
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
      {Icon ? (
        <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border" style={{ borderColor: `${tone}22`, background: `${tone}10`, color: tone }}>
          <Icon size={13} />
        </span>
      ) : null}
      <div className={`min-w-0 flex-1 ${Icon ? '' : 'pl-1'}`}>
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

export function LibrarySidebar() {
  const {
    deferredQuery,
    sourceScope,
    subsystemScope,
    projectFilter,
    sourceCounts,
    subsystemCounts,
    projectFilters,
    totalIndexed,
    totalVisible,
    setSourceScope,
    setSubsystemScope,
    setProjectFilter,
    clearFilters,
  } = useLibraryNavigation()
  const { BORDER, PAGE_BG, SHADOW_SOFT, TEXT, TEXT_DIM } = usePrismTheme()

  const hasActiveFilters = sourceScope !== 'all' || subsystemScope !== 'all' || Boolean(projectFilter)
  const visibleProjectTotal = projectFilters.reduce((sum, project) => sum + project.count, 0)

  return (
    <SidebarBody className="pb-4">
      <div className="mb-3 flex items-start justify-between gap-3 px-2">
        <div>
          <SidebarSectionTitle className="mb-0 px-0">Bibliothèque maître</SidebarSectionTitle>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {deferredQuery
              ? `${totalVisible} résultat${totalVisible > 1 ? 's' : ''} pour « ${deferredQuery} »`
              : `${totalIndexed} templates disponibles dans le catalogue global`}
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
          <SidebarSectionTitle>Origine</SidebarSectionTitle>
          <div className="space-y-1">
            {(Object.entries(LIBRARY_SOURCE_META) as [LibrarySourceScope, typeof LIBRARY_SOURCE_META[LibrarySourceScope]][]).map(([scopeId, meta]) => (
              <FilterButton
                key={scopeId}
                label={meta.label}
                hint={meta.hint}
                count={sourceCounts[scopeId]}
                active={sourceScope === scopeId}
                tone={meta.tone}
                onClick={() => setSourceScope(scopeId)}
              />
            ))}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>Familles</SidebarSectionTitle>
          <div className="space-y-1">
            <FilterButton
              label="Toutes les familles"
              hint="Capteurs, logique et actionneurs"
              count={subsystemCounts.all}
              active={subsystemScope === 'all'}
              tone={LIBRARY_SOURCE_META.all.tone}
              onClick={() => setSubsystemScope('all')}
            />
            {(['sensor', 'logic', 'actuator'] as const).map(type => {
              const meta = LIBRARY_SUBSYSTEM_META[type]
              return (
                <FilterButton
                  key={type}
                  label={meta.label}
                  hint={type === 'sensor'
                    ? 'Transmetteurs, capteurs et switches'
                    : type === 'logic'
                      ? 'Automates, solveurs et relais'
                      : 'Vannes, positionneurs et packages finaux'}
                  count={subsystemCounts[type]}
                  active={subsystemScope === type}
                  tone={meta.color}
                  Icon={meta.Icon}
                  onClick={() => setSubsystemScope(type)}
                />
              )
            })}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>Projets</SidebarSectionTitle>
          <div className="space-y-1">
            <FilterButton
              label="Tous les projets"
              hint="Les standards et la bibliothèque perso restent visibles"
              count={visibleProjectTotal}
              active={!projectFilter}
              tone={LIBRARY_SOURCE_META.project.tone}
              onClick={() => setProjectFilter(null)}
            />
            {projectFilters.map(project => (
              <FilterButton
                key={project.id}
                label={project.label}
                count={project.count}
                active={projectFilter === project.id}
                tone={LIBRARY_SOURCE_META.project.tone}
                onClick={() => setProjectFilter(project.id)}
              />
            ))}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>Usage</SidebarSectionTitle>
          <div className="space-y-2 px-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            <div className="flex items-start gap-2">
              <BookOpen size={13} className="mt-[2px] shrink-0" />
              <p>
                La bibliothèque maître sert à gérer les standards, les templates projet et les références personnelles.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Search size={13} className="mt-[2px] shrink-0" />
              <p>
                Recherche par type, fabricant, référence ou source pour retrouver rapidement un composant réutilisable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SidebarBody>
  )
}
