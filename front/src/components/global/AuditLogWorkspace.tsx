import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, FileClock, History, Info, Search, X } from 'lucide-react'
import {
  type AuditEntry,
  type AuditKind,
  type AuditScope,
  AUDIT_SCOPE_TONES,
  buildAuditEntries,
  formatAuditWhen,
  matchesAuditScope,
} from '@/components/audit/auditModel'
import { useAuditNavigation } from '@/components/audit/AuditNavigation'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import {
  InspectorActionButton,
  InspectorReferenceRow,
  InspectorSection,
  InspectorStatusBadge,
  InspectorSurface,
  RightPanelBody,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/appStore'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getAuditStrings } from '@/i18n/audit'
import { useLocaleStrings } from '@/i18n/useLocale'

const AUDIT_KIND_TONES: Record<AuditKind, string> = {
  governance: '#2563EB',
  'proof-tests': '#0E9F6E',
  operations: '#7C3AED',
  engine: '#0F766E',
}

function AuditLevelBadge({
  level,
  labels,
}: {
  level: AuditEntry['level']
  labels: { warning: string; info: string }
}) {
  return level === 'warning' ? (
    <InspectorStatusBadge
      label={labels.warning}
      color={semantic.warningDim}
      background={`${semantic.warning}16`}
      borderColor={`${semantic.warning}30`}
      icon={<AlertTriangle size={11} />}
    />
  ) : (
    <InspectorStatusBadge
      label={labels.info}
      color={semantic.info}
      background={`${semantic.info}14`}
      borderColor={`${semantic.info}28`}
      icon={<Info size={11} />}
    />
  )
}

function AuditKindBadge({
  kind,
  label,
}: {
  kind: AuditKind
  label: string
}) {
  const tone = AUDIT_KIND_TONES[kind]
  return (
    <InspectorStatusBadge
      label={label}
      color={tone}
      background={`${tone}12`}
      borderColor={`${tone}24`}
    />
  )
}

function AuditSearchToolbar({
  query,
  onChange,
  resultCount,
  totalCount,
  projectLabel,
  scope,
  strings,
}: {
  query: string
  onChange: (value: string) => void
  resultCount: number
  totalCount: number
  projectLabel: string | null
  scope: AuditScope | null
  strings: ReturnType<typeof getAuditStrings>
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const hasQuery = query.trim().length > 0

  return (
    <div className="border-y px-5 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-3 lg:max-w-[760px] lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-[560px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: TEXT_DIM }}
            />
            <Input
              type="search"
              value={query}
              onChange={event => onChange(event.target.value)}
              placeholder={strings.search.placeholder}
              className="h-10 rounded-lg pl-9 pr-9 text-sm"
            />
            {hasQuery ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: TEXT_DIM }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {projectLabel ? (
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1"
                style={{ color: TEXT, borderColor: `${BORDER}80`, background: PAGE_BG }}
              >
                {projectLabel}
              </span>
            ) : null}
            {scope ? (
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1"
                style={{
                  color: AUDIT_SCOPE_TONES[scope] ?? TEXT,
                  borderColor: `${BORDER}80`,
                  background: PAGE_BG,
                }}
              >
                {strings.scopes[scope].label}
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-[11px]" style={{ color: TEXT_DIM }}>
          {hasQuery ? strings.search.filtered(resultCount, totalCount) : strings.search.visibleTotal(totalCount)}
        </p>
      </div>
    </div>
  )
}

function AuditRightPanel({
  selected,
  onOpenSelected,
  strings,
}: {
  selected: AuditEntry | null
  onOpenSelected: () => void
  strings: ReturnType<typeof getAuditStrings>
}) {
  const { TEXT, TEXT_DIM } = usePrismTheme()
  const tabs = useMemo(() => [
    { id: 'event' as const, label: strings.rightPanel.eventTab, Icon: FileClock },
  ], [strings.rightPanel.eventTab])

  return (
    <RightPanelShell items={tabs} active="event" onSelect={() => {}}>
      <RightPanelBody compact className="space-y-4">
        <InspectorSection title={strings.rightPanel.selectionTitle}>
          {selected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <AuditLevelBadge level={selected.level} labels={strings.badges} />
                <AuditKindBadge kind={selected.kind} label={strings.kinds[selected.kind]} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{selected.action}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{selected.details}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {strings.rightPanel.selectionEmpty}
            </p>
          )}
        </InspectorSection>

        <InspectorSection title={strings.rightPanel.contextTitle}>
          {selected ? (
            <InspectorSurface className="space-y-0">
              <InspectorReferenceRow label={strings.rightPanel.contextDate} value={formatAuditWhen(selected.timestamp, strings.localeTag)} />
              <InspectorReferenceRow label={strings.rightPanel.contextProject} value={selected.projectName} />
              {selected.sifNumber ? <InspectorReferenceRow label={strings.rightPanel.contextSif} value={selected.sifNumber} /> : null}
              <InspectorReferenceRow label={strings.rightPanel.contextActor} value={selected.actor || strings.row.actorFallback} />
              {selected.linkedViewLabel ? <InspectorReferenceRow label={strings.rightPanel.contextLinkedView} value={selected.linkedViewLabel} /> : null}
            </InspectorSurface>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {strings.rightPanel.contextEmpty}
            </p>
          )}
        </InspectorSection>

        <InspectorSection title={strings.rightPanel.actionTitle}>
          {selected?.targetView === 'engine' ? (
            <InspectorActionButton
              onClick={onOpenSelected}
              color="#FFFFFF"
              background="linear-gradient(135deg, #0F766E, #0B5D57)"
              borderColor="rgba(15,118,110,0.4)"
            >
              <span>{strings.rightPanel.openEngine}</span>
              <ArrowUpRight size={13} />
            </InspectorActionButton>
          ) : selected?.sifId ? (
            <InspectorActionButton
              onClick={onOpenSelected}
              color="#FFFFFF"
              background="linear-gradient(135deg, #009BA4, #007A82)"
              borderColor="rgba(0,155,164,0.4)"
            >
              <span>{strings.rightPanel.openSif}</span>
              <ArrowUpRight size={13} />
            </InspectorActionButton>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {strings.rightPanel.actionEmpty}
            </p>
          )}
        </InspectorSection>
      </RightPanelBody>
    </RightPanelShell>
  )
}

function AuditRow({
  entry,
  active,
  onClick,
  strings,
}: {
  entry: AuditEntry
  active: boolean
  onClick: () => void
  strings: ReturnType<typeof getAuditStrings>
}) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const levelTone = entry.level === 'warning' ? semantic.warning : semantic.info

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative grid w-full gap-4 px-5 py-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out"
      style={{
        gridTemplateColumns: '136px 184px minmax(0,1.65fr) minmax(0,1fr)',
        borderBottom: `1px solid ${BORDER}35`,
        background: active ? SURFACE : 'transparent',
        boxShadow: active ? SHADOW_CARD : 'none',
        transform: 'translateY(0)',
      }}
      onMouseEnter={event => {
        if (!active) {
          event.currentTarget.style.background = PAGE_BG
          event.currentTarget.style.boxShadow = SHADOW_SOFT
          event.currentTarget.style.transform = 'translateY(-0.5px)'
        }
      }}
      onMouseLeave={event => {
        event.currentTarget.style.background = active ? SURFACE : 'transparent'
        event.currentTarget.style.boxShadow = active ? SHADOW_CARD : 'none'
        event.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span
        className="pointer-events-none absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
        style={{
          background: levelTone,
          opacity: active ? 1 : 0,
          transform: `translateX(${active ? '0px' : '-1px'}) scaleY(${active ? 1 : 0.64})`,
        }}
      />

      <div className="space-y-2">
        <AuditLevelBadge level={entry.level} labels={strings.badges} />
        <AuditKindBadge kind={entry.kind} label={strings.kinds[entry.kind]} />
      </div>

      <div className="min-w-0">
        <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
          {formatAuditWhen(entry.timestamp, strings.localeTag)}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {entry.actor || strings.row.actorFallback}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold" style={{ color: TEXT }}>
          {entry.action}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {entry.details}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold" style={{ color: TEXT }}>
          {entry.projectName}
          {entry.sifNumber ? ` · ${entry.sifNumber}` : ''}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {entry.linkedViewLabel ?? strings.row.linkedViewFallback}
        </p>
      </div>
    </button>
  )
}

export function AuditLogWorkspace() {
  const strings = useLocaleStrings(getAuditStrings)
  const projects = useAppStore(state => state.projects)
  const navigate = useAppStore(state => state.navigate)
  const { setRightPanelOverride } = useLayout()
  const { activeScope, projectFilter, engineRuns, engineRunsLoading } = useAuditNavigation()
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const entries = useMemo(() => buildAuditEntries(projects, engineRuns, strings.model), [engineRuns, projects, strings])
  const projectLabel = useMemo(
    () => projectFilter ? projects.find(project => project.id === projectFilter)?.name ?? null : null,
    [projectFilter, projects],
  )

  const projectScopedEntries = useMemo(
    () => projectFilter ? entries.filter(entry => entry.projectId === projectFilter) : entries,
    [entries, projectFilter],
  )

  const scopeEntries = useMemo(
    () => projectScopedEntries.filter(entry => matchesAuditScope(entry, activeScope)),
    [activeScope, projectScopedEntries],
  )

  const filteredEntries = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return scopeEntries
    return scopeEntries.filter(entry => {
      const haystack = [
        entry.action,
        entry.details,
        entry.projectName,
        entry.sifNumber ?? '',
        entry.actor,
        strings.kinds[entry.kind],
      ].join(' ').toLowerCase()
      return haystack.includes(trimmed)
    })
  }, [query, scopeEntries, strings])

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredEntries.some(entry => entry.id === selectedId)) {
      setSelectedId(filteredEntries[0].id)
    }
  }, [filteredEntries, selectedId])

  const selected = filteredEntries.find(entry => entry.id === selectedId) ?? null
  const warningCount = scopeEntries.filter(entry => entry.level === 'warning').length

  const openSelected = useCallback(() => {
    if (!selected) return
    if (selected.targetView === 'engine') {
      navigate({ type: 'engine' })
      return
    }
    if (!selected.projectId || !selected.sifId) return
    navigate({
      type: 'sif-dashboard',
      projectId: selected.projectId,
      sifId: selected.sifId,
      tab: selected.actionTab ?? 'cockpit',
    })
  }, [navigate, selected])

  useEffect(() => {
    setRightPanelOverride(
      <AuditRightPanel
        selected={selected}
        onOpenSelected={openSelected}
        strings={strings}
      />,
    )
    return () => setRightPanelOverride(null)
  }, [openSelected, selected, setRightPanelOverride, strings])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-5 px-6 py-6">
        <section
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
        >
          <div className="border-b px-5 py-4" style={{ borderColor: `${BORDER}35` }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                    style={{ color: TEAL, borderColor: `${TEAL}25`, background: `${TEAL}10` }}
                  >
                    <History size={16} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL_DIM }}>
                      {strings.header.eyebrow}
                    </p>
                    <h1 className="mt-1 text-[24px] font-semibold tracking-tight leading-none" style={{ color: TEXT }}>
                      {strings.header.title}
                    </h1>
                  </div>
                </div>
                <p className="mt-3 max-w-[820px] text-[14px] leading-[1.8]" style={{ color: TEXT_DIM }}>
                  {strings.header.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-1"
                  style={{ color: TEAL, borderColor: `${TEAL}28`, background: `${TEAL}10` }}
                >
                  {strings.header.visible(filteredEntries.length)}
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-1"
                  style={{ color: warningCount > 0 ? semantic.warningDim : TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}
                >
                  {strings.header.warnings(warningCount)}
                </span>
              </div>
            </div>
          </div>

          <AuditSearchToolbar
            query={query}
            onChange={setQuery}
            resultCount={filteredEntries.length}
            totalCount={scopeEntries.length}
            projectLabel={projectLabel}
            scope={activeScope !== 'all' ? activeScope : null}
            strings={strings}
          />

          {filteredEntries.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-12">
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border"
                style={{ color: TEAL, borderColor: `${TEAL}24`, background: `${TEAL}0F` }}
              >
                <History size={20} />
              </span>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{strings.empty.title}</p>
                <p className="mt-1 max-w-[520px] text-[13px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {engineRunsLoading
                    ? strings.empty.loadingDescription
                    : strings.empty.resetDescription}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-0">
              <div
                className="grid gap-4 border-b px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{
                  gridTemplateColumns: '136px 184px minmax(0,1.65fr) minmax(0,1fr)',
                  borderColor: `${BORDER}35`,
                  background: PAGE_BG,
                  color: TEXT_DIM,
                }}
              >
                <span>{strings.table.level}</span>
                <span>{strings.table.date}</span>
                <span>{strings.table.event}</span>
                <span>{strings.table.context}</span>
              </div>

              <div>
                {filteredEntries.map(entry => (
                  <AuditRow
                    key={entry.id}
                    entry={entry}
                    active={entry.id === selectedId}
                    onClick={() => setSelectedId(entry.id)}
                    strings={strings}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
