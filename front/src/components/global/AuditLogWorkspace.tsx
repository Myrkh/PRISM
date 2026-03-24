import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  FileClock,
  History,
  X,
} from 'lucide-react'
import {
  type AuditEntry,
  type AuditKind,
  AUDIT_KIND_TONES,
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
  RightPanelSection,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/store/appStore'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { getAuditStrings } from '@/i18n/audit'
import { useLocaleStrings } from '@/i18n/useLocale'

// ── Kind dot ────────────────────────────────────────────────────────────────

function KindDot({ kind, level }: { kind: AuditKind; level: AuditEntry['level'] }) {
  if (level === 'warning') {
    return (
      <AlertTriangle
        size={14}
        strokeWidth={2.2}
        style={{ color: semantic.warning, flexShrink: 0 }}
      />
    )
  }
  const color = AUDIT_KIND_TONES[kind]
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: 8, height: 8, background: color, flexShrink: 0 }}
    />
  )
}

// ── Kind + subKind badges ────────────────────────────────────────────────────

function KindBadge({ kind, label }: { kind: AuditKind; label: string }) {
  const tone = AUDIT_KIND_TONES[kind]
  return (
    <span
      className="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
      style={{ borderColor: `${tone}28`, background: `${tone}10`, color: tone }}
    >
      {label}
    </span>
  )
}

function SubKindBadge({ label }: { label: string }) {
  const { BORDER, PAGE_BG, TEXT_DIM } = usePrismTheme()
  return (
    <span
      className="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold"
      style={{ borderColor: `${BORDER}80`, background: PAGE_BG, color: TEXT_DIM }}
    >
      {label}
    </span>
  )
}

// ── Right panel ──────────────────────────────────────────────────────────────

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

  return (
    <RightPanelShell persistKey="audit-log">
      <RightPanelSection id="event" label={strings.rightPanel.eventTab} Icon={FileClock}>
        <div className="space-y-4">
        <InspectorSection title={strings.rightPanel.selectionTitle}>
          {selected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <InspectorStatusBadge
                  label={selected.level === 'warning' ? strings.badges.warning : strings.badges.info}
                  color={selected.level === 'warning' ? semantic.warningDim : semantic.info}
                  background={selected.level === 'warning' ? `${semantic.warning}16` : `${semantic.info}14`}
                  borderColor={selected.level === 'warning' ? `${semantic.warning}30` : `${semantic.info}28`}
                  icon={selected.level === 'warning' ? <AlertTriangle size={11} /> : undefined}
                />
                <KindBadge kind={selected.kind} label={strings.kinds[selected.kind]} />
                {selected.subKind && (
                  <SubKindBadge label={strings.engineSubKinds[selected.subKind] ?? selected.subKind} />
                )}
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
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}

// ── Row ──────────────────────────────────────────────────────────────────────

function AuditRow({
  entry,
  active,
  onClick,
  onOpen,
  strings,
}: {
  entry: AuditEntry
  active: boolean
  onClick: () => void
  onOpen: (entry: AuditEntry) => void
  strings: ReturnType<typeof getAuditStrings>
}) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const levelBorderColor = entry.level === 'warning' ? semantic.warning : AUDIT_KIND_TONES[entry.kind]
  const canNavigate = Boolean(entry.targetView)

  return (
    <div
      className="group relative"
      style={{ borderBottom: `1px solid ${BORDER}35` }}
    >
      <button
        type="button"
        onClick={onClick}
        className="grid w-full gap-4 px-5 py-3.5 text-left transition-[background-color,box-shadow,transform] duration-150 ease-out"
        style={{
          gridTemplateColumns: '32px 144px minmax(0,2fr) minmax(0,1fr)',
          background: active ? SURFACE : 'transparent',
          boxShadow: active ? SHADOW_CARD : 'none',
          transform: 'translateY(0)',
        }}
        onMouseEnter={event => {
          if (!active) {
            event.currentTarget.style.background = PAGE_BG
            event.currentTarget.style.boxShadow = SHADOW_SOFT
          }
        }}
        onMouseLeave={event => {
          event.currentTarget.style.background = active ? SURFACE : 'transparent'
          event.currentTarget.style.boxShadow = active ? SHADOW_CARD : 'none'
        }}
      >
        {/* active indicator bar */}
        <span
          className="pointer-events-none absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
          style={{
            background: levelBorderColor,
            opacity: active ? 1 : 0,
            transform: `translateX(${active ? '0px' : '-1px'}) scaleY(${active ? 1 : 0.64})`,
          }}
        />

        {/* Col 1 — level/kind dot */}
        <div className="flex items-start justify-center pt-0.5">
          <KindDot kind={entry.kind} level={entry.level} />
        </div>

        {/* Col 2 — date */}
        <div className="min-w-0">
          <p className="text-[12px] font-semibold tabular-nums" style={{ color: TEXT }}>
            {formatAuditWhen(entry.timestamp, strings.localeTag)}
          </p>
        </div>

        {/* Col 3 — event: kind badge + subKind badge + action + details */}
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <KindBadge kind={entry.kind} label={strings.kinds[entry.kind]} />
            {entry.subKind && (
              <SubKindBadge label={strings.engineSubKinds[entry.subKind] ?? entry.subKind} />
            )}
          </div>
          <p className="truncate text-[13px] font-semibold leading-snug" style={{ color: TEXT }}>
            {entry.action}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {entry.details}
          </p>
        </div>

        {/* Col 4 — context */}
        <div className="min-w-0 pr-8">
          <p className="truncate text-[12px] font-semibold" style={{ color: TEXT }}>
            {entry.projectName}
            {entry.sifNumber ? ` · ${entry.sifNumber}` : ''}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {entry.linkedViewLabel ?? strings.row.linkedViewFallback}
          </p>
        </div>
      </button>

      {/* ↗ quick-nav button — absolute, appears on row hover */}
      {canNavigate && (
        <button
          type="button"
          title={entry.targetView === 'engine' ? strings.rightPanel.openEngine : strings.rightPanel.openSif}
          onClick={event => { event.stopPropagation(); onOpen(entry) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md border opacity-0 transition-[opacity,background-color,border-color,box-shadow] duration-150 group-hover:opacity-100"
          style={{
            borderColor: `${BORDER}90`,
            background: PAGE_BG,
            color: TEXT_DIM,
            boxShadow: SHADOW_SOFT,
          }}
          onMouseEnter={event => {
            Object.assign(event.currentTarget.style, {
              background: SURFACE,
              borderColor: BORDER,
              color: TEXT,
            })
          }}
          onMouseLeave={event => {
            Object.assign(event.currentTarget.style, {
              background: PAGE_BG,
              borderColor: `${BORDER}90`,
              color: TEXT_DIM,
            })
          }}
        >
          <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  )
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

function AuditToolbar({
  query,
  onChange,
  sortAsc,
  onToggleSort,
  resultCount,
  totalCount,
  projectLabel,
  strings,
}: {
  query: string
  onChange: (value: string) => void
  sortAsc: boolean
  onToggleSort: () => void
  resultCount: number
  totalCount: number
  projectLabel: string | null
  strings: ReturnType<typeof getAuditStrings>
}) {
  const { BORDER, PAGE_BG, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  const hasQuery = query.trim().length > 0

  return (
    <div className="border-y px-5 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <div className="flex items-center gap-3">
        {/* search */}
        <div className="relative min-w-0 flex-1" style={{ maxWidth: 560 }}>
          <svg
            width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: TEXT_DIM }}
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <Input
            type="search"
            value={query}
            onChange={event => onChange(event.target.value)}
            placeholder={strings.search.placeholder}
            className="h-9 rounded-lg pl-9 pr-9 text-[13px]"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: TEXT_DIM }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* context badges */}
        {projectLabel && (
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap"
            style={{ color: TEXT, borderColor: `${BORDER}80`, background: PAGE_BG }}
          >
            {projectLabel}
          </span>
        )}

        {/* sort toggle */}
        <button
          type="button"
          onClick={onToggleSort}
          title={sortAsc ? strings.toolbar.sortAsc : strings.toolbar.sortDesc}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150"
          style={{
            borderColor: `${BORDER}90`,
            background: sortAsc ? SURFACE : PAGE_BG,
            color: sortAsc ? TEXT : TEXT_DIM,
            boxShadow: sortAsc ? SHADOW_SOFT : 'none',
          }}
          onMouseEnter={event => {
            Object.assign(event.currentTarget.style, { background: SURFACE, borderColor: BORDER, color: TEXT })
          }}
          onMouseLeave={event => {
            Object.assign(event.currentTarget.style, {
              background: sortAsc ? SURFACE : PAGE_BG,
              borderColor: `${BORDER}90`,
              color: sortAsc ? TEXT : TEXT_DIM,
            })
          }}
        >
          <ArrowUpDown size={12} />
          {sortAsc ? strings.toolbar.sortAsc : strings.toolbar.sortDesc}
        </button>

        {/* count */}
        <p className="shrink-0 text-[11px]" style={{ color: TEXT_DIM }}>
          {hasQuery ? strings.search.filtered(resultCount, totalCount) : strings.search.visibleTotal(totalCount)}
        </p>
      </div>
    </div>
  )
}

// ── Main workspace ────────────────────────────────────────────────────────────

export function AuditLogWorkspace() {
  const strings = useLocaleStrings(getAuditStrings)
  const projects = useAppStore(state => state.projects)
  const navigate = useAppStore(state => state.navigate)
  const { setRightPanelOverride } = useLayout()
  const { activeScope, projectFilter, engineRuns, engineRunsLoading } = useAuditNavigation()
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_PANEL, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(false)

  const entries = useMemo(() => buildAuditEntries(projects, engineRuns, strings.model), [engineRuns, projects, strings])

  const projectLabel = useMemo(
    () => projectFilter ? projects.find(p => p.id === projectFilter)?.name ?? null : null,
    [projectFilter, projects],
  )

  const scopeEntries = useMemo(() => {
    const byProject = projectFilter ? entries.filter(e => e.projectId === projectFilter) : entries
    return byProject.filter(e => matchesAuditScope(e, activeScope))
  }, [activeScope, entries, projectFilter])

  const filteredEntries = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const base = trimmed
      ? scopeEntries.filter(entry => {
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
      : scopeEntries

    return sortAsc ? [...base].reverse() : base
  }, [query, scopeEntries, sortAsc, strings])

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredEntries.some(e => e.id === selectedId)) {
      setSelectedId(filteredEntries[0].id)
    }
  }, [filteredEntries, selectedId])

  const selected = filteredEntries.find(e => e.id === selectedId) ?? null
  const warningCount = scopeEntries.filter(e => e.level === 'warning').length

  const navigateToEntry = useCallback((entry: AuditEntry) => {
    if (entry.targetView === 'engine') {
      navigate({ type: 'engine' })
      return
    }
    if (!entry.projectId || !entry.sifId) return
    navigate({
      type: 'sif-dashboard',
      projectId: entry.projectId,
      sifId: entry.sifId,
      tab: entry.actionTab ?? 'cockpit',
    })
  }, [navigate])

  const openSelected = useCallback(() => {
    if (selected) navigateToEntry(selected)
  }, [navigateToEntry, selected])

  useEffect(() => {
    setRightPanelOverride(
      <AuditRightPanel selected={selected} onOpenSelected={openSelected} strings={strings} />,
    )
    return () => setRightPanelOverride(null)
  }, [openSelected, selected, setRightPanelOverride, strings])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-0 px-6">

        {/* ── Workspace header ─────────────────────────────────────────────── */}
        <div
          className="flex items-baseline justify-between gap-6 py-5"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center gap-2.5">
            <History size={16} strokeWidth={2} style={{ color: TEAL, flexShrink: 0, marginBottom: 1 }} />
            <h1
              className="text-[13px] font-bold uppercase tracking-[0.18em]"
              style={{ color: TEAL }}
            >
              {strings.header.title}
            </h1>
          </div>

          <div className="flex shrink-0 items-baseline gap-4">
            <span className="text-[13px]" style={{ color: TEXT_DIM }}>
              <span
                className="tabular-nums font-semibold"
                style={{ color: TEXT, fontSize: 15 }}
              >
                {filteredEntries.length}
              </span>
              {' '}{strings.header.statVisibleLabel}
            </span>
            <span style={{ color: BORDER }}>·</span>
            <span className="text-[13px]" style={{ color: TEXT_DIM }}>
              <span
                className="tabular-nums font-semibold"
                style={{
                  color: warningCount > 0 ? semantic.warning : TEXT_DIM,
                  fontSize: 15,
                }}
              >
                {warningCount}
              </span>
              {' '}{strings.header.statWarningsLabel}
            </span>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 py-5">
          <section
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}
          >
          {/* Toolbar */}
          <AuditToolbar
            query={query}
            onChange={setQuery}
            sortAsc={sortAsc}
            onToggleSort={() => setSortAsc(v => !v)}
            resultCount={filteredEntries.length}
            totalCount={scopeEntries.length}
            projectLabel={projectLabel}
            strings={strings}
          />

          {/* Content */}
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
                  {engineRunsLoading ? strings.empty.loadingDescription : strings.empty.resetDescription}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-0">
              {/* Table header */}
              <div
                className="grid gap-4 border-b px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{
                  gridTemplateColumns: '32px 144px minmax(0,2fr) minmax(0,1fr)',
                  borderColor: `${BORDER}35`,
                  background: PAGE_BG,
                  color: TEXT_DIM,
                }}
              >
                <span />
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
                    onOpen={navigateToEntry}
                    strings={strings}
                  />
                ))}
              </div>
            </div>
          )}
          </section>
        </div>
      </div>
    </div>
  )
}
