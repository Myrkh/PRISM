import type { ElementType } from 'react'
import { BookOpen, FilterX, Search } from 'lucide-react'
import { LIBRARY_SUBSYSTEM_META } from '@/components/library/LibraryTemplateCard'
import {
  useLibraryNavigation,
  type LibraryCollectionScope,
  type LibrarySourceScope,
} from '@/components/library/LibraryNavigation'
import {
  SidebarBody,
  SidebarSectionTitle,
  sidebarHoverIn,
  sidebarHoverOut,
  sidebarPressDown,
  sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { getLibraryStrings } from '@/i18n/library'
import { useLocaleStrings } from '@/i18n/useLocale'
import { usePrismTheme } from '@/styles/usePrismTheme'

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

function getLibraryCollectionTone(scope: LibraryCollectionScope) {
  if (scope === 'project') return '#F59E0B'
  if (scope === 'user') return '#0284C7'
  return '#0F766E'
}

export function LibrarySidebar() {
  const {
    deferredQuery,
    sourceScope,
    subsystemScope,
    projectFilter,
    libraryFilter,
    sourceCounts,
    subsystemCounts,
    projectFilters,
    libraryFilters,
    totalIndexed,
    totalVisible,
    setSourceScope,
    setSubsystemScope,
    setProjectFilter,
    setLibraryFilter,
    clearFilters,
  } = useLibraryNavigation()
  const strings = useLocaleStrings(getLibraryStrings)
  const { BORDER, PAGE_BG, SHADOW_SOFT, TEXT, TEXT_DIM } = usePrismTheme()

  const hasActiveFilters = sourceScope !== 'all' || subsystemScope !== 'all' || Boolean(projectFilter) || Boolean(libraryFilter)
  const visibleProjectTotal = projectFilters.reduce((sum, project) => sum + project.count, 0)
  const namedLibraryTotal = libraryFilters.reduce((sum, library) => sum + library.count, 0)

  return (
    <SidebarBody className="pb-4">
      <div className="mb-3 flex items-start justify-between gap-3 px-2">
        <div>
          <SidebarSectionTitle className="mb-0 px-0">{strings.sidebar.title}</SidebarSectionTitle>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {strings.sidebar.summary(deferredQuery, totalVisible, totalIndexed)}
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
            {strings.sidebar.reset}
          </button>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <SidebarSectionTitle>{strings.sidebar.originTitle}</SidebarSectionTitle>
          <div className="space-y-1">
            {(Object.entries(strings.sourceMeta) as [LibrarySourceScope, { label: string; hint: string }][]).map(([scopeId, meta]) => {
              const tone = scopeId === 'project' ? '#F59E0B' : scopeId === 'user' ? '#0284C7' : '#0F766E'
              return (
                <FilterButton
                  key={scopeId}
                  label={meta.label}
                  hint={meta.hint}
                  count={sourceCounts[scopeId]}
                  active={sourceScope === scopeId}
                  tone={tone}
                  onClick={() => setSourceScope(scopeId)}
                />
              )
            })}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>{strings.sidebar.familiesTitle}</SidebarSectionTitle>
          <div className="space-y-1">
            <FilterButton
              label={strings.sidebar.allFamiliesLabel}
              hint={strings.sidebar.allFamiliesHint}
              count={subsystemCounts.all}
              active={subsystemScope === 'all'}
              tone="#0F766E"
              onClick={() => setSubsystemScope('all')}
            />
            {(['sensor', 'logic', 'actuator'] as const).map(type => {
              const meta = LIBRARY_SUBSYSTEM_META[type]
              return (
                <FilterButton
                  key={type}
                  label={meta.label}
                  hint={type === 'sensor'
                    ? strings.subsystemHints.sensor
                    : type === 'logic'
                      ? strings.subsystemHints.logic
                      : strings.subsystemHints.actuator}
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
          <SidebarSectionTitle>{strings.sidebar.namedLibrariesTitle}</SidebarSectionTitle>
          <div className="space-y-1">
            <FilterButton
              label={strings.sidebar.allLibrariesLabel}
              hint={strings.sidebar.allLibrariesHint}
              count={namedLibraryTotal}
              active={!libraryFilter}
              tone="#0284C7"
              onClick={() => setLibraryFilter(null)}
            />
            {libraryFilters.map(library => (
              <FilterButton
                key={library.id}
                label={library.label}
                hint={strings.sidebar.collectionHint[library.scope]}
                count={library.count}
                active={libraryFilter === library.id}
                tone={getLibraryCollectionTone(library.scope)}
                onClick={() => setLibraryFilter(library.id)}
              />
            ))}
          </div>
          {libraryFilters.length === 0 && (
            <p className="px-2 pt-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
              {strings.sidebar.noNamedLibraries}
            </p>
          )}
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>{strings.sidebar.projectsTitle}</SidebarSectionTitle>
          <div className="space-y-1">
            <FilterButton
              label={strings.sidebar.allProjectsLabel}
              hint={strings.sidebar.allProjectsHint}
              count={visibleProjectTotal}
              active={!projectFilter}
              tone="#F59E0B"
              onClick={() => setProjectFilter(null)}
            />
            {projectFilters.map(project => (
              <FilterButton
                key={project.id}
                label={project.label}
                count={project.count}
                active={projectFilter === project.id}
                tone="#F59E0B"
                onClick={() => setProjectFilter(project.id)}
              />
            ))}
          </div>
        </div>

        <div className="border-t pt-4" style={{ borderColor: `${BORDER}33` }}>
          <SidebarSectionTitle>{strings.sidebar.usageTitle}</SidebarSectionTitle>
          <div className="space-y-2 px-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            <div className="flex items-start gap-2">
              <BookOpen size={13} className="mt-[2px] shrink-0" />
              <p>{strings.sidebar.usagePrimary}</p>
            </div>
            <div className="flex items-start gap-2">
              <Search size={13} className="mt-[2px] shrink-0" />
              <p>{strings.sidebar.usageSecondary}</p>
            </div>
          </div>
        </div>
      </div>
    </SidebarBody>
  )
}
