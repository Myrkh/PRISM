import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, FileClock, History, Info, Search, X } from 'lucide-react'
import {
  type AuditEntry,
  type AuditKind,
  AUDIT_KIND_LABELS,
  AUDIT_SCOPE_META,
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

const AUDIT_RIGHT_TABS = [
  { id: 'event' as const, label: 'Evénement', Icon: FileClock },
]

const AUDIT_KIND_TONES: Record<AuditKind, string> = {
  governance: '#2563EB',
  'proof-tests': '#0E9F6E',
  operations: '#7C3AED',
  engine: '#0F766E',
}

const AUDIT_TAB_LABELS: Record<string, string> = {
  cockpit: 'Cockpit',
  context: 'Contexte',
  architecture: 'Architecture',
  verification: 'Vérification',
  exploitation: 'Exploitation',
  history: 'Historique',
  report: 'Rapport',
}

function AuditLevelBadge({ level }: { level: AuditEntry['level'] }) {
  return level === 'warning' ? (
    <InspectorStatusBadge
      label="Warning"
      color={semantic.warningDim}
      background={`${semantic.warning}16`}
      borderColor={`${semantic.warning}30`}
      icon={<AlertTriangle size={11} />}
    />
  ) : (
    <InspectorStatusBadge
      label="Info"
      color={semantic.info}
      background={`${semantic.info}14`}
      borderColor={`${semantic.info}28`}
      icon={<Info size={11} />}
    />
  )
}

function AuditKindBadge({ kind }: { kind: AuditKind }) {
  const tone = AUDIT_KIND_TONES[kind]
  return (
    <InspectorStatusBadge
      label={AUDIT_KIND_LABELS[kind]}
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
  scopeLabel,
}: {
  query: string
  onChange: (value: string) => void
  resultCount: number
  totalCount: number
  projectLabel: string | null
  scopeLabel: string | null
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
              placeholder="Rechercher un projet, une SIF, une action ou un détail..."
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
            {scopeLabel ? (
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-1"
                style={{
                  color: AUDIT_SCOPE_META[scopeLabel as keyof typeof AUDIT_SCOPE_META]?.tone ?? TEXT,
                  borderColor: `${BORDER}80`,
                  background: PAGE_BG,
                }}
              >
                {AUDIT_SCOPE_META[scopeLabel as keyof typeof AUDIT_SCOPE_META]?.label ?? scopeLabel}
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-[11px]" style={{ color: TEXT_DIM }}>
          {hasQuery ? `${resultCount} résultats sur ${totalCount}` : `${totalCount} événements visibles`}
        </p>
      </div>
    </div>
  )
}

function AuditRightPanel({
  selected,
  onOpenSelected,
}: {
  selected: AuditEntry | null
  onOpenSelected: () => void
}) {
  const { TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <RightPanelShell items={AUDIT_RIGHT_TABS} active="event" onSelect={() => {}}>
      <RightPanelBody compact className="space-y-4">
        <InspectorSection title="Sélection">
          {selected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <AuditLevelBadge level={selected.level} />
                <AuditKindBadge kind={selected.kind} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{selected.action}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{selected.details}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              Sélectionne un événement dans le journal pour inspecter son contexte et ouvrir la vue liée.
            </p>
          )}
        </InspectorSection>

        <InspectorSection title="Contexte">
          {selected ? (
            <InspectorSurface className="space-y-0">
              <InspectorReferenceRow label="Date" value={formatAuditWhen(selected.timestamp)} />
              <InspectorReferenceRow label="Projet" value={selected.projectName} />
              {selected.sifNumber ? <InspectorReferenceRow label="SIF" value={selected.sifNumber} /> : null}
              <InspectorReferenceRow label="Acteur" value={selected.actor || 'System'} />
              {selected.linkedViewLabel ? <InspectorReferenceRow label="Vue liée" value={selected.linkedViewLabel} /> : null}
            </InspectorSurface>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              Le contexte projet et la vue liée apparaîtront ici dès qu’une ligne sera sélectionnée.
            </p>
          )}
        </InspectorSection>

        <InspectorSection title="Action">
          {selected?.targetView === 'engine' ? (
            <InspectorActionButton
              onClick={onOpenSelected}
              color="#FFFFFF"
              background="linear-gradient(135deg, #0F766E, #0B5D57)"
              borderColor="rgba(15,118,110,0.4)"
            >
              <span>Ouvrir Engine</span>
              <ArrowUpRight size={13} />
            </InspectorActionButton>
          ) : selected?.sifId ? (
            <InspectorActionButton
              onClick={onOpenSelected}
              color="#FFFFFF"
              background="linear-gradient(135deg, #009BA4, #007A82)"
              borderColor="rgba(0,155,164,0.4)"
            >
              <span>Ouvrir la SIF liée</span>
              <ArrowUpRight size={13} />
            </InspectorActionButton>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              Cet événement ne pointe pas vers une vue navigable précise.
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
}: {
  entry: AuditEntry
  active: boolean
  onClick: () => void
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
        <AuditLevelBadge level={entry.level} />
        <AuditKindBadge kind={entry.kind} />
      </div>

      <div className="min-w-0">
        <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
          {formatAuditWhen(entry.timestamp)}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          {entry.actor || 'System'}
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
          {entry.linkedViewLabel ?? 'Contexte projet uniquement'}
        </p>
      </div>
    </button>
  )
}

export function AuditLogWorkspace() {
  const projects = useAppStore(state => state.projects)
  const navigate = useAppStore(state => state.navigate)
  const { setRightPanelOverride } = useLayout()
  const { activeScope, projectFilter, engineRuns, engineRunsLoading } = useAuditNavigation()
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const entries = useMemo(() => buildAuditEntries(projects, engineRuns), [engineRuns, projects])
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
        AUDIT_KIND_LABELS[entry.kind],
      ].join(' ').toLowerCase()
      return haystack.includes(trimmed)
    })
  }, [query, scopeEntries])

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
      />,
    )
    return () => setRightPanelOverride(null)
  }, [openSelected, selected, setRightPanelOverride])

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
                      Traçabilité active
                    </p>
                    <h1 className="mt-1 text-[24px] font-semibold tracking-tight leading-none" style={{ color: TEXT }}>
                      Audit Log
                    </h1>
                  </div>
                </div>
                <p className="mt-3 max-w-[820px] text-[14px] leading-[1.8]" style={{ color: TEXT_DIM }}>
                  Lecture transversale des événements utiles du workspace: gouvernance des dossiers, proof tests, événements d’exploitation et runs Engine. Le panneau droit donne le contexte exact de la ligne sélectionnée.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-1"
                  style={{ color: TEAL, borderColor: `${TEAL}28`, background: `${TEAL}10` }}
                >
                  {filteredEntries.length} visibles
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-1"
                  style={{ color: warningCount > 0 ? semantic.warningDim : TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}
                >
                  {warningCount} warning{warningCount > 1 ? 's' : ''} dans le périmètre
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
            scopeLabel={activeScope !== 'all' ? activeScope : null}
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
                <p className="text-sm font-semibold" style={{ color: TEXT }}>Aucun événement visible</p>
                <p className="mt-1 max-w-[520px] text-[13px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {engineRunsLoading
                    ? 'Le journal charge encore les runs Engine. Réessaie dans un instant.'
                    : 'Ajuste la portée dans le panneau gauche ou efface la recherche pour revenir au journal complet.'}
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
                <span>Niveau</span>
                <span>Date</span>
                <span>Evénement</span>
                <span>Contexte</span>
              </div>

              <div>
                {filteredEntries.map(entry => (
                  <AuditRow
                    key={entry.id}
                    entry={entry}
                    active={entry.id === selectedId}
                    onClick={() => setSelectedId(entry.id)}
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
