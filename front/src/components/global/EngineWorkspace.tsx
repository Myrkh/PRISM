import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Braces, Cpu, GitCompareArrows, History, Search, Sigma } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import {
  InspectorMetricRow,
  InspectorSection,
  InspectorSurface,
  RightPanelSection,
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { calcSIF, calcSIFEngine, formatPFD, formatRRF } from '@/core/math/pfdCalc'
import type { EngineRun, SIF } from '@/core/types'
import {
  analysisSettingsToMissionTimeHours,
  loadSIFAnalysisSettings,
} from '@/core/models/analysisSettings'
import {
  buildSILBackendRequest,
  computeSILWithBackend,
  type SILBackendChannelResult,
  type SILBackendRequest,
  type SILBackendResponse,
} from '@/lib/engineApi'
import { dbFetchEngineRuns, dbSaveEngineRun, dbUpdateEngineRun } from '@/lib/engineRuns'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EngineResult } from '@/engine/types/engine'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useEngineNavigation } from '@/components/engine/EngineNavigation'
import { getEngineStrings } from '@/i18n/engine'
import { useLocaleStrings } from '@/i18n/useLocale'

type BackendRunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; response: SILBackendResponse }
  | { status: 'error'; message: string }

interface ComparisonMetric {
  ts: number | null
  backend: number | null
  deltaAbs: number | null
  deltaPct: number | null
  withinTolerance: boolean
}

interface CompareSummary {
  pfd: ComparisonMetric
  pfh: ComparisonMetric
  rrf: ComparisonMetric
  tsSil: number | null
  backendSil: number | null
  silMatch: boolean
  verdict: 'aligned' | 'drift' | 'mismatch'
  notes: string[]
  routeSummary: string[]
  warningCount: number
}

type CompareRunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; response: SILBackendResponse; tsResult: EngineResult; summary: CompareSummary }
  | { status: 'error'; message: string }

type CompareSubsystemKey = 'sensors' | 'solver' | 'actuators'

type ProjectStandard = 'IEC61511' | 'IEC61508' | 'ISA84'

interface CandidateRow {
  id: string
  sif: SIF
  projectStandard?: ProjectStandard
  projectId: string
  projectName: string
  sifNumber: string
  title: string
  currentSil: number
  targetSil: number
  reason: string
  requestedMode: 'AUTO' | 'MARKOV'
  status: 'Published' | 'Working'
  tsPreview: EngineResult
  searchText: string
}

interface HistoryRow {
  run: EngineRun
  projectName: string
  sifNumber: string
  title: string
  verdict: CompareSummary['verdict'] | null
  searchText: string
}

interface ComponentTraceRow {
  key: string
  tagName: string
  instrumentType: string
  parentTagName?: string
  pfdavg: number | null
  level: 0 | 1
}

interface ChannelComponentTrace {
  channelId: string
  rows: ComponentTraceRow[]
}

const SUBSYSTEM_ORDER: CompareSubsystemKey[] = ['sensors', 'solver', 'actuators']
const SUBSYSTEM_TYPE_BY_KEY: Record<CompareSubsystemKey, 'sensor' | 'logic' | 'actuator'> = {
  sensors: 'sensor',
  solver: 'logic',
  actuators: 'actuator',
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null'
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableSerialize(entryValue)}`)

  return `{${entries.join(',')}}`
}

async function sha256Hex(input: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  const bytes = new TextEncoder().encode(input)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function buildRequestPayloadHash(payload: SILBackendRequest): Promise<string | null> {
  return sha256Hex(stableSerialize(payload))
}

function buildRunResultSummary(
  row: CandidateRow,
  response: SILBackendResponse,
  compareSummary?: CompareSummary | null,
): Record<string, unknown> {
  const route = Object.fromEntries(
    SUBSYSTEM_ORDER.map(key => [
      key,
      {
        requestedMode: response.backend.subsystems[key].requestedMode,
        effectiveArchitecture: response.backend.subsystems[key].effectiveArchitecture,
        pfdEngine: response.backend.subsystems[key].pfdEngine,
        markovTriggered: response.backend.subsystems[key].markovTriggered,
      },
    ]),
  )

  return {
    projectName: row.projectName,
    sifNumber: row.sifNumber,
    title: row.title,
    targetSil: row.targetSil,
    requestedMode: row.requestedMode,
    pfdavg: response.result.pfdavg,
    pfh: response.result.pfh,
    rrf: response.result.rrf,
    silAchieved: response.result.silAchieved,
    warningCount: response.result.warnings.length,
    route,
    compare: compareSummary
      ? {
          verdict: compareSummary.verdict,
          tsSil: compareSummary.tsSil,
          backendSil: compareSummary.backendSil,
          pfdDeltaPct: compareSummary.pfd.deltaPct,
          pfhDeltaPct: compareSummary.pfh.deltaPct,
          rrfDeltaPct: compareSummary.rrf.deltaPct,
          notes: compareSummary.notes,
        }
      : null,
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function asNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatDateTime(value: string | null, localeTag = 'fr-FR'): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function resolveEngineRunTimestamp(run: EngineRun): number {
  return Date.parse(run.startedAt ?? run.createdAt ?? run.updatedAt ?? '') || 0
}

function sortEngineRunsDesc(left: EngineRun, right: EngineRun): number {
  return resolveEngineRunTimestamp(right) - resolveEngineRunTimestamp(left)
}

function getEngineRunVerdict(run: EngineRun): CompareSummary['verdict'] | null {
  const compare = asObject(asObject(run.resultSummary)?.compare)
  const verdict = asStringValue(compare?.verdict)
  return verdict === 'aligned' || verdict === 'drift' || verdict === 'mismatch' ? verdict : null
}

function buildComponentTrace(
  sif: SIF,
  subsystemKey: CompareSubsystemKey,
  backendChannels: SILBackendChannelResult[],
): ChannelComponentTrace[] {
  const subsystem = sif.subsystems.find(item => item.type === SUBSYSTEM_TYPE_BY_KEY[subsystemKey])
  if (!subsystem) return []

  return subsystem.channels
    .map(channel => {
      const backendChannel = backendChannels.find(item => item.channelId === channel.id)
      const resultById = new Map((backendChannel?.componentResults ?? []).map(item => [item.componentId, item]))
      const seenIds = new Set<string>()
      const rows: ComponentTraceRow[] = []

      for (const component of channel.components) {
        const parentResult = resultById.get(component.id)
        seenIds.add(component.id)
        rows.push({
          key: `${channel.id}:${component.id}`,
          tagName: component.tagName,
          instrumentType: component.instrumentType || '—',
          pfdavg: parentResult?.pfdavg ?? null,
          level: 0,
        })

        for (const subComponent of component.subComponents ?? []) {
          const subResult = resultById.get(subComponent.id)
          seenIds.add(subComponent.id)
          rows.push({
            key: `${channel.id}:${component.id}:${subComponent.id}`,
            tagName: subComponent.tagName,
            instrumentType: subComponent.instrumentType || subComponent.label || '—',
            parentTagName: component.tagName,
            pfdavg: subResult?.pfdavg ?? null,
            level: 1,
          })
        }
      }

      for (const item of backendChannel?.componentResults ?? []) {
        if (seenIds.has(item.componentId)) continue
        rows.push({
          key: `${channel.id}:${item.componentId}`,
          tagName: item.componentId,
          instrumentType: item.parentComponentId ? 'Sub-component' : 'Component',
          parentTagName: item.parentComponentId ?? undefined,
          pfdavg: item.pfdavg,
          level: item.parentComponentId ? 1 : 0,
        })
      }

      return { channelId: channel.id, rows }
    })
    .filter(channel => channel.rows.length > 0)
}

function SectionHeader({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  const { BORDER, SHADOW_SOFT, TEAL } = usePrismTheme()
  return (
    <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <span
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border"
        style={{ color: TEAL, background: `${TEAL}10`, borderColor: `${TEAL}22`, boxShadow: SHADOW_SOFT }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: TEAL }}>{children}</span>
    </div>
  )
}

function WorkspaceCard({
  children,
  className = '',
  tone = 'card',
}: {
  children: ReactNode
  className?: string
  tone?: 'card' | 'page'
}) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL } = usePrismTheme()
  return (
    <div
      className={`shrink-0 rounded-xl border ${className}`.trim()}
      style={{
        borderColor: BORDER,
        background: tone === 'page' ? PAGE_BG : CARD_BG,
        boxShadow: SHADOW_PANEL,
      }}
    >
      {children}
    </div>
  )
}

function EngineSearchToolbar({
  query,
  onChange,
  projectFilter,
  onProjectChange,
  projectOptions,
  resultCount,
  totalCount,
  placeholder,
  totalLabel,
}: {
  query: string
  onChange: (value: string) => void
  projectFilter: string
  onProjectChange: (value: string) => void
  projectOptions: { id: string; name: string }[]
  resultCount: number
  totalCount: number
  placeholder?: string
  totalLabel?: string
}) {
  const strings = useLocaleStrings(getEngineStrings)
  const { BORDER, PAGE_BG, TEXT_DIM } = usePrismTheme()
  const hasQuery = query.trim().length > 0
  const resolvedPlaceholder = placeholder ?? strings.search.placeholderCandidates
  const resolvedTotalLabel = totalLabel ?? strings.search.totalCandidatesLabel

  return (
    <div className="border-y px-5 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-3 lg:max-w-[760px] lg:flex-row">
          <div className="relative w-full lg:max-w-[520px]">
            <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: TEXT_DIM }}
          />
            <Input
              type="search"
              value={query}
              onChange={event => onChange(event.target.value)}
              placeholder={resolvedPlaceholder}
              className="h-10 rounded-lg pl-9 text-sm"
            />
          </div>
          {projectOptions.length > 1 && (
            <Select value={projectFilter} onValueChange={onProjectChange}>
              <SelectTrigger className="h-10 w-full text-sm lg:max-w-[220px]">
                <SelectValue placeholder={strings.search.allProjects} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{strings.search.allProjects}</SelectItem>
                {projectOptions.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-[11px]" style={{ color: TEXT_DIM }}>
          {hasQuery
            ? strings.search.filtered(resultCount, totalCount)
            : strings.search.total(totalCount, resolvedTotalLabel)}
        </p>
      </div>
    </div>
  )
}

function JsonPreview({
  value,
  emptyLabel,
}: {
  value: unknown
  emptyLabel: string
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const pretty = useMemo(() => (value == null ? '' : JSON.stringify(value, null, 2)), [value])

  if (!pretty) {
    return (
      <div className="rounded-xl border px-3 py-3 text-xs leading-relaxed" style={{ borderColor: `${BORDER}99`, background: PAGE_BG, color: TEXT_DIM }}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: `${BORDER}99`, background: PAGE_BG }}>
      <pre className="overflow-x-auto px-3 py-3 text-[10px] leading-relaxed" style={{ color: TEXT, scrollbarGutter: 'stable' }}>
        <code>{pretty}</code>
      </pre>
    </div>
  )
}

function compareMetric(tsValue: number | null | undefined, backendValue: number | null | undefined, tolerancePct: number): ComparisonMetric {
  const ts = tsValue ?? null
  const backend = backendValue ?? null
  if (ts === null || backend === null || !Number.isFinite(ts) || !Number.isFinite(backend)) {
    return { ts, backend, deltaAbs: null, deltaPct: null, withinTolerance: false }
  }

  const deltaAbs = backend - ts
  const denominator = Math.abs(ts) > 1e-12 ? Math.abs(ts) : Math.abs(backend)
  const deltaPct = denominator > 1e-12 ? Math.abs(deltaAbs) / denominator * 100 : 0
  return {
    ts,
    backend,
    deltaAbs,
    deltaPct,
    withinTolerance: deltaPct <= tolerancePct,
  }
}

function formatDeltaPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}%`
}

function formatSignedScientific(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toExponential(2)}`
}

function formatSil(value: number | null): string {
  return value == null ? '—' : `SIL ${value}`
}

function buildCompareSummary(
  tsResult: EngineResult,
  backendResponse: SILBackendResponse,
  tolerancePct: number,
  strings?: ReturnType<typeof getEngineStrings>,
): CompareSummary {
  const localeStrings = strings ?? getEngineStrings('fr')
  const pfd = compareMetric(tsResult.pfdavg, backendResponse.result.pfdavg, tolerancePct)
  const pfh = compareMetric(tsResult.pfh, backendResponse.result.pfh, tolerancePct)
  const rrf = compareMetric(tsResult.rrf, backendResponse.result.rrf, tolerancePct)
  const tsSil = tsResult.silAchieved ?? null
  const backendSil = backendResponse.result.silAchieved ?? null
  const silMatch = tsSil === backendSil

  const routeSummary = Object.entries(backendResponse.backend.subsystems).map(([key, meta]) => {
    const typedKey = key as CompareSubsystemKey
    const mode = meta.markovTriggered ? localeStrings.routeBadges.markov : meta.pfdEngine ?? localeStrings.shared.backend
    return `${localeStrings.subsystems[typedKey]}: ${mode}${meta.thresholdUsed != null ? ` · threshold ${meta.thresholdUsed.toFixed(3)}` : ''}`
  })

  const notes: string[] = []
  if (!pfd.withinTolerance) notes.push(localeStrings.compareNotes.pfdDelta(formatDeltaPct(pfd.deltaPct), formatSignedScientific(pfd.deltaAbs)))
  if (!pfh.withinTolerance) notes.push(localeStrings.compareNotes.pfhDelta(formatDeltaPct(pfh.deltaPct), formatSignedScientific(pfh.deltaAbs)))
  if (!rrf.withinTolerance) notes.push(localeStrings.compareNotes.rrfDelta(formatDeltaPct(rrf.deltaPct)))
  if (!silMatch) notes.push(localeStrings.compareNotes.silMismatch(formatSil(tsSil), formatSil(backendSil)))
  const markovSubsystems = Object.entries(backendResponse.backend.subsystems)
    .filter(([, meta]) => meta.markovTriggered)
    .map(([key]) => localeStrings.subsystems[key as CompareSubsystemKey])
  if (markovSubsystems.length > 0) notes.push(localeStrings.compareNotes.markovTriggered(markovSubsystems.join(', ')))
  if (backendResponse.result.warnings.length > 0) notes.push(localeStrings.compareNotes.backendWarnings(backendResponse.result.warnings.length))

  let verdict: CompareSummary['verdict'] = 'aligned'
  if (!silMatch) {
    verdict = 'mismatch'
  } else if (!pfd.withinTolerance || !pfh.withinTolerance || !rrf.withinTolerance) {
    verdict = 'drift'
  }

  return {
    pfd,
    pfh,
    rrf,
    tsSil,
    backendSil,
    silMatch,
    verdict,
    notes,
    routeSummary,
    warningCount: backendResponse.result.warnings.length,
  }
}

function getSubsystemWarnings(response: SILBackendResponse, subsystem: CompareSubsystemKey) {
  return response.result.warnings.filter(item => {
    if (!item.affected) return false
    return item.affected === subsystem || item.affected.startsWith(`${subsystem}:`) || item.affected.includes(`:${subsystem}:`)
  })
}

function describeRoute(
  meta: SILBackendResponse['backend']['subsystems'][string],
  strings?: ReturnType<typeof getEngineStrings>,
): string[] {
  const localeStrings = strings ?? getEngineStrings('fr')
  const lines = [
    localeStrings.routeLines.requestedMode(meta.requestedMode),
    localeStrings.routeLines.effectiveArchitecture(meta.effectiveArchitecture, meta.architecture),
    localeStrings.routeLines.pfdEngine(meta.pfdEngine ?? null),
    localeStrings.routeLines.pfhEngine(meta.pfhEngine ?? null),
  ]

  if (meta.lambdaT1 != null && meta.thresholdUsed != null) {
    lines.push(localeStrings.routeLines.thresholdCheck(meta.lambdaT1.toFixed(3), meta.thresholdUsed.toFixed(3)))
  } else if (meta.lambdaT1 != null) {
    lines.push(localeStrings.routeLines.noThreshold(meta.lambdaT1.toFixed(3)))
  }

  lines.push(meta.markovTriggered ? localeStrings.routeLines.markovTriggered : localeStrings.routeLines.markovNotTriggered)

  if (meta.heterogeneousChannels) {
    lines.push(localeStrings.routeLines.heterogeneous)
  }

  return lines
}

function verdictMeta(
  verdict: CompareSummary['verdict'],
  strings?: ReturnType<typeof getEngineStrings>,
) {
  const localeStrings = strings ?? getEngineStrings('fr')
  if (verdict === 'aligned') return { label: localeStrings.verdicts.aligned, bg: '#DCFCE7', color: '#15803D' }
  if (verdict === 'drift') return { label: localeStrings.verdicts.drift, bg: '#FEF3C7', color: '#B45309' }
  return { label: localeStrings.verdicts.mismatch, bg: '#FEE2E2', color: '#B91C1C' }
}

function RouteInspector({
  row,
  state,
  tolerancePct,
}: {
  row: CandidateRow
  state: Extract<CompareRunState, { status: 'done' }>
  tolerancePct: number
}) {
  const strings = useLocaleStrings(getEngineStrings)
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const verdict = verdictMeta(state.summary.verdict, strings)

  return (
    <WorkspaceCard className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <SectionHeader icon={<ArrowRight size={12} />}>{strings.sectionHeaders.routeInspector}</SectionHeader>
          <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
            {row.sifNumber} · {row.projectName}
          </p>
          <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
            {row.title}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: verdict.bg, color: verdict.color }}>
            {verdict.label}
          </span>
          <p className="text-[10px]" style={{ color: TEXT_DIM }}>
            {strings.shared.target} {formatSil(row.targetSil)} · TS {formatSil(state.summary.tsSil)} · Python {formatSil(state.summary.backendSil)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 xl:grid-cols-3">
        <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.routeInspector.whyDifferent}</p>
          <div className="mt-3 space-y-2">
            {(state.summary.notes.length > 0 ? state.summary.notes : [strings.compare.noMaterialDelta]).map(note => (
              <div key={note} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT, boxShadow: SHADOW_SOFT }}>
                {note}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.routeInspector.globalDelta}</p>
          <div className="mt-3 space-y-2 text-xs" style={{ color: TEXT }}>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
              <p className="font-mono font-semibold" style={{ color: TEAL }}>PFD</p>
              <p className="mt-1">TS {formatPFD(state.tsResult.pfdavg)} · Python {formatPFD(state.response.result.pfdavg)}</p>
              <p className="mt-1" style={{ color: TEXT_DIM }}>Delta {formatDeltaPct(state.summary.pfd.deltaPct)} ({formatSignedScientific(state.summary.pfd.deltaAbs)})</p>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
              <p className="font-mono font-semibold" style={{ color: TEAL }}>PFH / RRF</p>
              <p className="mt-1">PFH delta {formatDeltaPct(state.summary.pfh.deltaPct)}</p>
              <p className="mt-1">RRF delta {formatDeltaPct(state.summary.rrf.deltaPct)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.routeInspector.backendSignals}</p>
          <div className="mt-3 space-y-2 text-xs" style={{ color: TEXT }}>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
              <p className="font-mono font-semibold" style={{ color: TEAL }}>{strings.routeInspector.requestedMode}</p>
              <p className="mt-1">{state.response.backend.requestedMode}</p>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
              <p className="font-mono font-semibold" style={{ color: TEAL }}>{strings.routeInspector.runtime}</p>
              <p className="mt-1">{state.response.backend.runtimeMs.toFixed(2)} ms</p>
              <p className="mt-1" style={{ color: TEXT_DIM }}>{strings.routeInspector.warningsSurfaced(state.summary.warningCount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-5 pb-5 xl:grid-cols-3">
        {SUBSYSTEM_ORDER.map(key => {
          const meta = state.response.backend.subsystems[key]
          const backend = state.response.result.contributions[key]
          const ts = state.tsResult.contributions[key]
          const warnings = getSubsystemWarnings(state.response, key)
          const componentTrace = buildComponentTrace(row.sif, key, backend.channelResults)
          const pfdDelta = compareMetric(ts?.pfdavg, backend?.pfdavg, tolerancePct)
          const pfhDelta = compareMetric(ts?.pfh, backend?.pfh, tolerancePct)
          const routeLines = describeRoute(meta, strings)
          const routeTone = meta.markovTriggered
            ? { bg: '#DBEAFE', color: '#1D4ED8', label: strings.routeBadges.markov }
            : meta.pfdEngine === 'MANUFACTURER_INPUT'
              ? { bg: '#EDE9FE', color: '#6D28D9', label: strings.routeBadges.manufacturerInput }
              : { bg: '#E0F2FE', color: '#0369A1', label: strings.routeBadges.analyticalIec }

          return (
            <div key={key} className="rounded-xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{strings.subsystems[key]}</p>
                  <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>{meta.effectiveArchitecture}</p>
                </div>
                <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: routeTone.bg, color: routeTone.color }}>
                  {routeTone.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
                  <p className="font-mono font-semibold" style={{ color: TEAL }}>PFD</p>
                  <p className="mt-1" style={{ color: TEXT }}>TS {formatPFD(ts?.pfdavg ?? Number.NaN)}</p>
                  <p className="mt-1" style={{ color: TEXT }}>Py {formatPFD(backend?.pfdavg ?? Number.NaN)}</p>
                  <p className="mt-1" style={{ color: TEXT_DIM }}>Delta {formatDeltaPct(pfdDelta.deltaPct)}</p>
                </div>
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
                  <p className="font-mono font-semibold" style={{ color: TEAL }}>PFH / SIL</p>
                  <p className="mt-1" style={{ color: TEXT }}>Delta PFH {formatDeltaPct(pfhDelta.deltaPct)}</p>
                  <p className="mt-1" style={{ color: TEXT }}>{formatSil(ts?.silFromPFD ?? null)} {'->'} {formatSil(backend?.silFromPFD ?? null)}</p>
                  <p className="mt-1" style={{ color: TEXT_DIM }}>HFT {backend?.hft ?? '—'} · SFF {(backend?.sff ?? 0).toFixed(3)}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {routeLines.map(line => (
                  <div key={line} className="rounded-lg border px-3 py-2 text-[10px]" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT, boxShadow: SHADOW_SOFT }}>
                    {line}
                  </div>
                ))}
              </div>

              {componentTrace.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>{strings.routeInspector.componentTrace}</p>
                  <div className="mt-2 space-y-2">
                    {componentTrace.map(channel => (
                      <div key={channel.channelId} className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
                        <p className="text-[10px] font-semibold" style={{ color: TEAL }}>{strings.routeInspector.channel(channel.channelId)}</p>
                        <div className="mt-2 space-y-1">
                          {channel.rows.map(trace => (
                            <div
                              key={trace.key}
                              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5"
                              style={{
                                background: trace.level === 1 ? PAGE_BG : 'transparent',
                                paddingLeft: trace.level === 1 ? 18 : 8,
                              }}
                            >
                              <div className="min-w-0">
                                <p className="truncate font-mono text-[10px] font-semibold" style={{ color: TEXT }}>{trace.tagName}</p>
                                <p className="mt-0.5 truncate text-[10px]" style={{ color: TEXT_DIM }}>
                                  {trace.level === 1 && trace.parentTagName
                                    ? strings.routeInspector.subComponentOf(trace.parentTagName, trace.instrumentType)
                                    : trace.instrumentType}
                                </p>
                              </div>
                              <p className="shrink-0 font-mono text-[10px] font-semibold" style={{ color: trace.level === 1 ? TEXT : TEAL }}>
                                {formatPFD(trace.pfdavg ?? Number.NaN)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {warnings.map(warning => (
                    <div
                      key={`${warning.code}-${warning.affected ?? ''}`}
                      className="rounded-lg border px-3 py-2 text-[10px]"
                      style={{ borderColor: `${semantic.warning}55`, background: `${semantic.warning}12`, color: semantic.warning, boxShadow: SHADOW_SOFT }}
                    >
                      <p className="font-semibold">{warning.code}</p>
                      <p className="mt-1">{warning.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </WorkspaceCard>
  )
}

function EngineRightPanel({
  row,
  payload,
  backendStatus,
  backendMessage,
  backendResponse,
  compareState,
}: {
  row: CandidateRow | null
  payload: SILBackendRequest | null
  backendStatus: BackendRunState['status']
  backendMessage: string | null
  backendResponse: SILBackendResponse | null
  compareState: Extract<CompareRunState, { status: 'done' }> | null
}) {
  const strings = useLocaleStrings(getEngineStrings)
  const { TEXT, TEXT_DIM, TEAL, BORDER, semantic } = usePrismTheme()

  const summaryLines = row
    ? [
        [strings.shared.project, row.projectName],
        [strings.shared.sif, row.sifNumber],
        [strings.shared.target, `SIL ${row.targetSil}`],
        [strings.shared.mode, row.requestedMode],
      ]
    : []

  return (
    <RightPanelShell>
      <RightPanelSection id="payload" label={strings.rightPanel.tabs.payload} Icon={Braces}>
        <div className="space-y-4">
          <InspectorSection title={strings.rightPanel.selectionTitle}>
            {row ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{row.sifNumber}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{row.projectName} · {row.title}</p>
                </div>
                <InspectorSurface className="space-y-0">
                  {summaryLines.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0"
                      style={{ borderColor: `${BORDER}99` }}
                    >
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</span>
                      <span
                        className="max-w-[170px] text-right text-[12px] font-semibold leading-relaxed"
                        style={{ color: label === strings.shared.mode ? TEAL : TEXT }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </InspectorSurface>
                <p className="text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {strings.rightPanel.selectionHint}
                </p>
              </div>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                {strings.rightPanel.selectionEmpty}
              </p>
            )}
          </InspectorSection>

          <InspectorSection title={strings.rightPanel.payloadTitle}>
            <JsonPreview value={payload} emptyLabel={strings.rightPanel.payloadEmpty} />
          </InspectorSection>
        </div>
      </RightPanelSection>

      <RightPanelSection id="backend" label={strings.rightPanel.tabs.backend} Icon={Sigma}>
        <div className="space-y-4">
          <InspectorSection title={strings.rightPanel.backendStateTitle}>
            {backendStatus === 'idle' && (
              <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                {strings.rightPanel.backendIdle}
              </p>
            )}
            {backendStatus === 'running' && (
              <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                {strings.rightPanel.backendRunning}
              </p>
            )}
            {backendStatus === 'error' && (
              <InspectorSurface background={`${semantic.error}10`} borderColor={`${semantic.error}33`}>
                <p className="text-xs font-semibold" style={{ color: semantic.error }}>{strings.rightPanel.backendErrorTitle}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{backendMessage ?? strings.rightPanel.backendUnknownError}</p>
              </InspectorSurface>
            )}
            {backendStatus === 'done' && backendResponse && (
              <InspectorSurface className="space-y-0">
                <InspectorMetricRow label="PFDavg" value={formatPFD(backendResponse.result.pfdavg)} color={TEXT} />
                <InspectorMetricRow label="PFH" value={formatPFD(backendResponse.result.pfh)} color={TEXT} />
                <InspectorMetricRow label="SIL" value={formatSil(backendResponse.result.silAchieved)} color={TEAL} />
                <InspectorMetricRow label="Runtime" value={backendResponse.backend.runtimeMs.toFixed(2)} suffix=" ms" color={TEXT} />
                <InspectorMetricRow label="Warnings" value={backendResponse.result.warnings.length} color={backendResponse.result.warnings.length > 0 ? semantic.warning : semantic.success} />
              </InspectorSurface>
            )}
          </InspectorSection>

          {compareState && (
            <InspectorSection title={strings.rightPanel.compareTitle}>
              <InspectorSurface className="space-y-0">
                <InspectorMetricRow label="Verdict" value={verdictMeta(compareState.summary.verdict, strings).label} color={verdictMeta(compareState.summary.verdict, strings).color} />
                <InspectorMetricRow label="Delta PFD" value={formatDeltaPct(compareState.summary.pfd.deltaPct)} color={TEXT} />
                <InspectorMetricRow label="Delta PFH" value={formatDeltaPct(compareState.summary.pfh.deltaPct)} color={TEXT} />
                <InspectorMetricRow label="Delta RRF" value={formatDeltaPct(compareState.summary.rrf.deltaPct)} color={TEXT} />
              </InspectorSurface>
            </InspectorSection>
          )}

          {backendResponse && (
            <InspectorSection title={strings.rightPanel.backendRouteTitle}>
              <div className="space-y-3">
                {SUBSYSTEM_ORDER.map(key => {
                  const meta = backendResponse.backend.subsystems[key]
                  return (
                    <InspectorSurface key={key} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold" style={{ color: TEXT }}>{strings.subsystems[key]}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: meta.markovTriggered ? semantic.warning : TEAL }}>
                          {meta.markovTriggered ? strings.routeBadges.markov : meta.pfdEngine ?? strings.shared.backend}
                        </span>
                      </div>
                      <div className="space-y-1 text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
                        {describeRoute(meta).slice(0, 3).map(line => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </InspectorSurface>
                  )
                })}
              </div>
            </InspectorSection>
          )}

          <InspectorSection title={strings.rightPanel.rawPreviewTitle}>
            <JsonPreview value={backendResponse} emptyLabel={strings.rightPanel.backendPreviewEmpty} />
          </InspectorSection>
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}

function EngineHistoryRightPanel({ row }: { row: HistoryRow | null }) {
  const strings = useLocaleStrings(getEngineStrings)
  const { TEXT, TEXT_DIM, TEAL, semantic } = usePrismTheme()

  const summary = row ? asObject(row.run.resultSummary) : null
  const compare = summary ? asObject(summary.compare) : null
  const verdict = row ? getEngineRunVerdict(row.run) : null
  const verdictTone = verdict ? verdictMeta(verdict, strings) : null
  const pfdavg = asNumberValue(summary?.pfdavg)
  const pfh = asNumberValue(summary?.pfh)
  const sil = asNumberValue(summary?.silAchieved)

  const summaryLines = row
    ? [
        [strings.shared.project, row.projectName],
        [strings.shared.sif, row.sifNumber],
        [strings.shared.trigger, row.run.triggerKind],
        [strings.shared.status, row.run.status],
      ]
    : []

  return (
    <RightPanelShell>
      <RightPanelSection id="payload" label={strings.rightPanel.tabs.payload} Icon={Braces}>
        <div className="space-y-4">
          <InspectorSection title={strings.rightPanel.historySelectionTitle}>
            {row ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{row.sifNumber}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{row.projectName} · {row.title}</p>
                </div>
                <InspectorSurface className="space-y-0">
                  {summaryLines.map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0">
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</span>
                      <span className="max-w-[170px] text-right text-[12px] font-semibold leading-relaxed" style={{ color: TEXT }}>{value}</span>
                    </div>
                  ))}
                </InspectorSurface>
                <p className="text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
                  {strings.rightPanel.historySelectionHint}
                </p>
              </div>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                {strings.rightPanel.historySelectionEmpty}
              </p>
            )}
          </InspectorSection>

          <InspectorSection title={strings.rightPanel.historyPayloadTitle}>
            <JsonPreview value={row?.run.requestPayload ?? null} emptyLabel={strings.rightPanel.historyPayloadEmpty} />
          </InspectorSection>
        </div>
      </RightPanelSection>

      <RightPanelSection id="backend" label={strings.rightPanel.tabs.backend} Icon={Sigma}>
        <div className="space-y-4">
          <InspectorSection title={strings.rightPanel.historyRunSummaryTitle}>
            {row ? (
              <InspectorSurface className="space-y-0">
                <InspectorMetricRow label={strings.shared.status} value={row.run.status} color={row.run.status === 'error' ? semantic.error : row.run.status === 'done' ? semantic.success : TEAL} />
                <InspectorMetricRow label={strings.shared.runtime} value={row.run.runtimeMs != null ? row.run.runtimeMs.toFixed(2) : '—'} suffix={row.run.runtimeMs != null ? ' ms' : ''} color={TEXT} />
                <InspectorMetricRow label={strings.shared.warnings} value={row.run.warningCount} color={row.run.warningCount > 0 ? semantic.warning : semantic.success} />
                <InspectorMetricRow label={strings.shared.backend} value={row.run.backendVersion ?? '—'} color={TEXT} />
                {pfdavg != null && <InspectorMetricRow label="PFDavg" value={formatPFD(pfdavg)} color={TEXT} />}
                {pfh != null && <InspectorMetricRow label="PFH" value={formatPFD(pfh)} color={TEXT} />}
                {sil != null && <InspectorMetricRow label="SIL" value={formatSil(sil)} color={TEAL} />}
              </InspectorSurface>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                {strings.rightPanel.historyRunSummaryEmpty}
              </p>
            )}
          </InspectorSection>

          {verdictTone && compare && (
            <InspectorSection title={strings.rightPanel.historyCompareTitle}>
              <InspectorSurface className="space-y-0">
                <InspectorMetricRow label="Verdict" value={verdictTone.label} color={verdictTone.color} />
                <InspectorMetricRow label="Delta PFD" value={formatDeltaPct(asNumberValue(compare.pfdDeltaPct))} color={TEXT} />
                <InspectorMetricRow label="Delta PFH" value={formatDeltaPct(asNumberValue(compare.pfhDeltaPct))} color={TEXT} />
                <InspectorMetricRow label="Delta RRF" value={formatDeltaPct(asNumberValue(compare.rrfDeltaPct))} color={TEXT} />
              </InspectorSurface>
            </InspectorSection>
          )}

          {row?.run.errorMessage && (
            <InspectorSection title={strings.rightPanel.historyBackendErrorTitle}>
              <InspectorSurface background={`${semantic.error}10`} borderColor={`${semantic.error}33`}>
                <p className="text-xs font-semibold" style={{ color: semantic.error }}>{strings.rightPanel.backendErrorTitle}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{row.run.errorMessage}</p>
              </InspectorSurface>
            </InspectorSection>
          )}

          <InspectorSection title={strings.rightPanel.historyBackendPayloadTitle}>
            <JsonPreview value={row?.run.responsePayload ?? null} emptyLabel={strings.rightPanel.historyBackendPayloadEmpty} />
          </InspectorSection>
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}

export function EngineWorkspace() {
  const strings = useLocaleStrings(getEngineStrings)
  const { BORDER, PAGE_BG, TEAL, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const compareTolerancePct = useAppStore(s => s.preferences.engineCompareTolerancePct)
  const projects = useAppStore(s => s.projects)
  const authUser = useAppStore(s => s.authUser)
  const profile = useAppStore(s => s.profile)
  const navigate = useAppStore(s => s.navigate)
  const setSyncError = useAppStore(s => s.setSyncError)
  const { setRightPanelOverride } = useLayout()
  const { activeSection } = useEngineNavigation()
  const [backendRuns, setBackendRuns] = useState<Record<string, BackendRunState>>({})
  const [compareRuns, setCompareRuns] = useState<Record<string, CompareRunState>>({})
  const [historyRuns, setHistoryRuns] = useState<EngineRun[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedEngineId, setSelectedEngineId] = useState<string | null>(null)
  const [selectedHistoryRunId, setSelectedHistoryRunId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')

  const stats = useMemo(() => {
    const allSifs = projects.flatMap(project => project.sifs)
    const criticalCandidates = allSifs.filter(sif => !calcSIF(sif).meetsTarget).length
    return {
      allSifs,
      totalSifs: allSifs.length,
      criticalCandidates,
    }
  }, [projects])

  function upsertHistoryRun(run: EngineRun) {
    setHistoryRuns(current => {
      const next = [run, ...current.filter(item => item.id !== run.id)]
      next.sort(sortEngineRunsDesc)
      return next
    })
    setSelectedHistoryRunId(run.id)
  }

  const candidateRows = useMemo<CandidateRow[]>(() => (
    stats.allSifs
      .map(sif => {
        const project = projects.find(entry => entry.id === sif.projectId)
        const result = calcSIF(sif)
        const analysisSettings = loadSIFAnalysisSettings(sif.id)
        const projectStandard = project?.standard as ProjectStandard | undefined
        const requestedMode: CandidateRow['requestedMode'] = result.meetsTarget ? 'AUTO' : 'MARKOV'
        const status: CandidateRow['status'] = sif.revisionLockedAt ? 'Published' : 'Working'
        const options = {
          projectStandard,
          missionTimeHours: analysisSettingsToMissionTimeHours(analysisSettings),
          curvePoints: analysisSettings.chart.curvePoints,
        }
        const tsPreview = calcSIFEngine(sif, options)
        const reason = !result.meetsTarget
          ? strings.reasons.targetGap
          : sif.revisionLockedAt
            ? strings.reasons.publishedBaseline
            : (sif.testCampaigns?.length ?? 0) > 0
              ? strings.reasons.operationalEvidence
              : strings.reasons.designCandidate
        const projectName = project?.name ?? strings.shared.unknownProject
        const title = sif.title || sif.description || strings.shared.untitledSif
        return {
          id: sif.id,
          sif,
          projectStandard,
          projectId: sif.projectId,
          projectName,
          sifNumber: sif.sifNumber,
          title,
          currentSil: tsPreview.silAchieved ?? result.SIL,
          targetSil: sif.targetSIL,
          reason,
          requestedMode,
          status,
          tsPreview,
          searchText: [projectName, sif.sifNumber, title].join(' ').toLowerCase(),
        }
      })
      .sort((left, right) => {
        const leftScore = left.currentSil < left.targetSil ? 0 : left.status === 'Published' ? 1 : 2
        const rightScore = right.currentSil < right.targetSil ? 0 : right.status === 'Published' ? 1 : 2
        return leftScore - rightScore || left.sifNumber.localeCompare(right.sifNumber)
      })
  ), [projects, stats.allSifs])

  useEffect(() => {
    if (!authUser && !profile) {
      setHistoryRuns([])
      setHistoryLoading(false)
      return
    }

    let active = true
    setHistoryLoading(true)

    dbFetchEngineRuns({ limit: 200 })
      .then(runs => {
        if (!active) return
        setHistoryRuns([...runs].sort(sortEngineRunsDesc))
      })
      .catch(error => {
        if (!active) return
        const message = error instanceof Error ? error.message : String(error)
        setSyncError(`Engine history failed: ${message}`)
      })
      .finally(() => {
        if (!active) return
        setHistoryLoading(false)
      })

    return () => {
      active = false
    }
  }, [authUser, profile, setSyncError])

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of candidateRows) {
      if (!seen.has(row.projectId)) seen.set(row.projectId, row.projectName)
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [candidateRows])

  const normalizedQuery = query.trim().toLowerCase()

  const projectScopedRows = useMemo(() => {
    if (projectFilter === 'all') return candidateRows
    return candidateRows.filter(row => row.projectId == projectFilter)
  }, [candidateRows, projectFilter])

  const filteredCandidateRows = useMemo(() => {
    if (!normalizedQuery) return projectScopedRows
    return projectScopedRows.filter(row => row.searchText.includes(normalizedQuery))
  }, [projectScopedRows, normalizedQuery])

  const projectScopedHistoryRows = useMemo<HistoryRow[]>(() => {
    const rows = historyRuns.map(run => {
      const project = projects.find(entry => entry.id === run.projectId)
      const sif = project?.sifs.find(entry => entry.id === run.sifId)
      const summary = asObject(run.resultSummary) ?? {}
      const projectName = project?.name ?? asStringValue(summary.projectName) ?? strings.shared.unknownProject
      const sifNumber = sif?.sifNumber ?? asStringValue(summary.sifNumber) ?? run.sifId
      const title = sif?.title || sif?.description || asStringValue(summary.title) || strings.shared.untitledSif
      const verdict = getEngineRunVerdict(run)

      return {
        run,
        projectName,
        sifNumber,
        title,
        verdict,
        searchText: [projectName, sifNumber, title, run.triggerKind, run.status, run.backendVersion ?? '', verdict ?? ''].join(' ').toLowerCase(),
      }
    })

    return projectFilter === 'all'
      ? rows
      : rows.filter(row => row.run.projectId === projectFilter)
  }, [historyRuns, projectFilter, projects])

  const historyRows = useMemo<HistoryRow[]>(() => {
    if (!normalizedQuery) return projectScopedHistoryRows
    return projectScopedHistoryRows.filter(row => row.searchText.includes(normalizedQuery))
  }, [normalizedQuery, projectScopedHistoryRows])

  const backendSummary = useMemo(() => {
    const states = Object.values(backendRuns)
    const running = states.filter(state => state.status === 'running').length
    const done = states.filter(state => state.status === 'done').length
    const failed = states.filter(state => state.status === 'error').length
    return { running, done, failed }
  }, [backendRuns])

  const compareSummary = useMemo(() => {
    const states = Object.values(compareRuns)
    const running = states.filter(state => state.status === 'running').length
    const doneStates = states.filter((state): state is Extract<CompareRunState, { status: 'done' }> => state.status === 'done')
    const aligned = doneStates.filter(state => state.summary.verdict === 'aligned').length
    const drift = doneStates.filter(state => state.summary.verdict === 'drift').length
    const mismatch = doneStates.filter(state => state.summary.verdict === 'mismatch').length
    const failed = states.filter(state => state.status === 'error').length
    return { running, aligned, drift, mismatch, failed, compared: doneStates.length }
  }, [compareRuns])

  const historySummary = useMemo(() => {
    const states = historyRows.map(row => row.run.status)
    const running = states.filter(state => state === 'running').length
    const done = states.filter(state => state === 'done').length
    const failed = states.filter(state => state === 'error').length
    return { running, done, failed }
  }, [historyRows])

  useEffect(() => {
    if (projectFilter != 'all' && !projectOptions.some(project => project.id == projectFilter)) {
      setProjectFilter('all')
    }
  }, [projectFilter, projectOptions])

  useEffect(() => {
    if (!filteredCandidateRows.length) {
      if (selectedEngineId !== null) setSelectedEngineId(null)
      return
    }
    if (!selectedEngineId || !filteredCandidateRows.some(row => row.id === selectedEngineId)) {
      setSelectedEngineId(filteredCandidateRows[0].id)
    }
  }, [filteredCandidateRows, selectedEngineId])

  const selectedRow = useMemo(
    () => filteredCandidateRows.find(row => row.id === selectedEngineId) ?? filteredCandidateRows[0] ?? null,
    [filteredCandidateRows, selectedEngineId],
  )

  useEffect(() => {
    if (!historyRows.length) {
      if (selectedHistoryRunId !== null) setSelectedHistoryRunId(null)
      return
    }
    if (!selectedHistoryRunId || !historyRows.some(row => row.run.id === selectedHistoryRunId)) {
      setSelectedHistoryRunId(historyRows[0].run.id)
    }
  }, [historyRows, selectedHistoryRunId])

  const selectedHistoryRow = useMemo(
    () => historyRows.find(row => row.run.id === selectedHistoryRunId) ?? historyRows[0] ?? null,
    [historyRows, selectedHistoryRunId],
  )

  function getRowCalcOptions(row: CandidateRow) {
    const analysisSettings = loadSIFAnalysisSettings(row.id)
    return {
      options: {
        projectStandard: row.projectStandard,
        missionTimeHours: analysisSettingsToMissionTimeHours(analysisSettings),
        curvePoints: analysisSettings.chart.curvePoints,
      },
      runtime: {
        calculationMode: row.requestedMode,
        includeCurve: false,
      },
    }
  }

  const selectedPayload = useMemo(() => {
    if (!selectedRow) return null
    const { options, runtime } = getRowCalcOptions(selectedRow)
    return buildSILBackendRequest(selectedRow.sif, options, runtime)
  }, [selectedRow])

  const selectedBackendState = selectedRow ? (backendRuns[selectedRow.id] ?? { status: 'idle' as const }) : { status: 'idle' as const }
  const selectedCompareState = selectedRow ? (compareRuns[selectedRow.id] ?? { status: 'idle' as const }) : { status: 'idle' as const }
  const selectedBackendResponse = selectedCompareState.status === 'done'
    ? selectedCompareState.response
    : selectedBackendState.status === 'done'
      ? selectedBackendState.response
      : null
  const selectedBackendStatus: BackendRunState['status'] =
    selectedCompareState.status === 'running' || selectedBackendState.status === 'running'
      ? 'running'
      : selectedBackendResponse
        ? 'done'
        : selectedCompareState.status === 'error' || selectedBackendState.status === 'error'
          ? 'error'
          : 'idle'
  const selectedBackendMessage = selectedCompareState.status === 'error'
    ? selectedCompareState.message
    : selectedBackendState.status === 'error'
      ? selectedBackendState.message
      : null

  async function persistRunStart(
    row: CandidateRow,
    triggerKind: 'manual' | 'compare',
    payload: SILBackendRequest,
    startedAt: string,
  ) {
    const createdBy = profile?.id ?? authUser?.id ?? null
    const payloadHash = await buildRequestPayloadHash(payload)

    if (!createdBy) {
      return { runId: null, payloadHash }
    }

    try {
      const run = await dbSaveEngineRun({
        projectId: row.projectId,
        sifId: row.id,
        createdBy,
        triggerKind,
        requestedMode: row.requestedMode,
        status: 'running',
        payloadHash,
        inputDigest: payloadHash ? { requestPayloadHash: payloadHash } : {},
        startedAt,
        requestPayload: payload as unknown as Record<string, unknown>,
      })
      upsertHistoryRun(run)
      return { runId: run.id, payloadHash }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSyncError(`Engine run persistence failed: ${message}`)
      return { runId: null, payloadHash }
    }
  }

  async function persistRunSuccess(
    runId: string | null,
    payloadHash: string | null,
    row: CandidateRow,
    payload: SILBackendRequest,
    response: SILBackendResponse,
    finishedAt: string,
    compareSummary?: CompareSummary | null,
  ) {
    if (!runId) return

    try {
      const run = await dbUpdateEngineRun(runId, {
        status: 'done',
        backendVersion: response.backend.serviceVersion,
        payloadHash,
        inputDigest: {
          requestPayloadHash: payloadHash,
          backendDigest: response.backend.inputDigest,
        },
        runtimeMs: response.backend.runtimeMs,
        finishedAt,
        warningCount: response.result.warnings.length,
        resultSummary: buildRunResultSummary(row, response, compareSummary),
        requestPayload: payload as unknown as Record<string, unknown>,
        responsePayload: response as unknown as Record<string, unknown>,
      })
      upsertHistoryRun(run)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSyncError(`Engine run persistence failed: ${message}`)
    }
  }

  async function persistRunError(
    runId: string | null,
    payloadHash: string | null,
    row: CandidateRow,
    payload: SILBackendRequest,
    errorMessage: string,
    startedPerf: number,
    finishedAt: string,
  ) {
    if (!runId) return

    try {
      const run = await dbUpdateEngineRun(runId, {
        status: 'error',
        payloadHash,
        inputDigest: payloadHash ? { requestPayloadHash: payloadHash } : {},
        runtimeMs: Number((performance.now() - startedPerf).toFixed(3)),
        finishedAt,
        errorMessage,
        resultSummary: {
          projectName: row.projectName,
          sifNumber: row.sifNumber,
          title: row.title,
          targetSil: row.targetSil,
          requestedMode: row.requestedMode,
        },
        requestPayload: payload as unknown as Record<string, unknown>,
        responsePayload: null,
      })
      upsertHistoryRun(run)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSyncError(`Engine run persistence failed: ${message}`)
    }
  }

  async function handleRunBackend(row: CandidateRow) {
    setSelectedEngineId(row.id)
    setBackendRuns(current => ({ ...current, [row.id]: { status: 'running' } }))
    const { options, runtime } = getRowCalcOptions(row)
    const payload = buildSILBackendRequest(row.sif, options, runtime)
    const startedAt = new Date().toISOString()
    const startedPerf = performance.now()
    const { runId, payloadHash } = await persistRunStart(row, 'manual', payload, startedAt)

    try {
      const response = await computeSILWithBackend(payload)
      setBackendRuns(current => ({ ...current, [row.id]: { status: 'done', response } }))
      await persistRunSuccess(runId, payloadHash, row, payload, response, new Date().toISOString())
    } catch (error) {
      const message = error instanceof Error ? error.message : strings.statuses.unknownBackendError
      setBackendRuns(current => ({ ...current, [row.id]: { status: 'error', message } }))
      await persistRunError(runId, payloadHash, row, payload, message, startedPerf, new Date().toISOString())
    }
  }

  async function handleCompare(row: CandidateRow) {
    setSelectedEngineId(row.id)
    setCompareRuns(current => ({ ...current, [row.id]: { status: 'running' } }))
    setBackendRuns(current => ({ ...current, [row.id]: { status: 'running' } }))
    const { options, runtime } = getRowCalcOptions(row)
    const payload = buildSILBackendRequest(row.sif, options, runtime)
    const startedAt = new Date().toISOString()
    const startedPerf = performance.now()
    const { runId, payloadHash } = await persistRunStart(row, 'compare', payload, startedAt)

    try {
      const tsResult = calcSIFEngine(row.sif, options)
      const response = await computeSILWithBackend(payload)
      const summary = buildCompareSummary(tsResult, response, compareTolerancePct, strings)
      setBackendRuns(current => ({ ...current, [row.id]: { status: 'done', response } }))
      setCompareRuns(current => ({ ...current, [row.id]: { status: 'done', response, tsResult, summary } }))
      await persistRunSuccess(runId, payloadHash, row, payload, response, new Date().toISOString(), summary)
    } catch (error) {
      const message = error instanceof Error ? error.message : strings.statuses.unknownBackendError
      setBackendRuns(current => ({ ...current, [row.id]: { status: 'error', message } }))
      setCompareRuns(current => ({ ...current, [row.id]: { status: 'error', message } }))
      await persistRunError(runId, payloadHash, row, payload, message, startedPerf, new Date().toISOString())
    }
  }

  useEffect(() => {
    setRightPanelOverride(
      activeSection === 'history'
        ? <EngineHistoryRightPanel row={selectedHistoryRow} />
        : <EngineRightPanel
            row={selectedRow}
            payload={selectedPayload}
            backendStatus={selectedBackendStatus}
            backendMessage={selectedBackendMessage}
            backendResponse={selectedBackendResponse}
            compareState={selectedCompareState.status === 'done' ? selectedCompareState : null}
          />,
    )
    return () => setRightPanelOverride(null)
  }, [
    activeSection,
    selectedBackendMessage,
    selectedBackendResponse,
    selectedBackendStatus,
    selectedCompareState,
    selectedHistoryRow,
    selectedPayload,
    selectedRow,
    setRightPanelOverride,
  ])

  const headerTitle = strings.header.titles[activeSection]
  const headerBody = strings.header.descriptions[activeSection]

  return (
    <div
      className="flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      style={{ background: PAGE_BG, scrollbarGutter: 'stable' }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-4 px-6 py-6">
        <WorkspaceCard className="shrink-0 px-6 py-5">
          <SectionHeader icon={<Cpu size={12} />}>{strings.sectionHeaders.engine}</SectionHeader>
          <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[26px] font-semibold tracking-tight" style={{ color: TEXT }}>
                {headerTitle}
              </p>
              <p className="mt-2 max-w-[860px] text-[14px] leading-[1.8]" style={{ color: TEXT_DIM }}>
                {headerBody}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEAL, borderColor: `${TEAL}28`, background: `${TEAL}10` }}>
                {strings.header.indexedSifs(stats.totalSifs)}
              </span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                {activeSection === 'runs'
                  ? strings.header.runsBadge(backendSummary.running, backendSummary.done, backendSummary.failed)
                  : activeSection === 'compare'
                    ? strings.header.comparesBadge(compareSummary.compared)
                    : strings.header.historyBadge(historyLoading, historyRows.length)}
              </span>
              {activeSection === 'compare' && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: compareSummary.mismatch > 0 ? semantic.error : compareSummary.drift > 0 ? semantic.warning : TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                  {strings.header.mismatchDrift(compareSummary.mismatch, compareSummary.drift)}
                </span>
              )}
              {activeSection === 'runs' && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: stats.criticalCandidates > 0 ? semantic.warning : TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                  {strings.header.belowTarget(stats.criticalCandidates)}
                </span>
              )}
              {activeSection === 'history' && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ color: historySummary.failed > 0 ? semantic.error : historySummary.running > 0 ? semantic.warning : TEXT_DIM, borderColor: `${BORDER}70`, background: PAGE_BG }}>
                  {strings.header.historySummary(historySummary.failed, historySummary.done)}
                </span>
              )}
            </div>
          </div>
        </WorkspaceCard>

        {candidateRows.length === 0 && activeSection !== 'history' ? (
          <WorkspaceCard className="px-6 py-6" tone="page">
            <SectionHeader icon={<Cpu size={12} />}>{strings.sectionHeaders.empty}</SectionHeader>
            <p className="mt-3 text-base font-semibold" style={{ color: TEXT }}>{strings.empty.noSifTitle}</p>
            <p className="mt-2 max-w-[720px] text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
              {strings.empty.noSifDescription}
            </p>
          </WorkspaceCard>
        ) : activeSection === 'runs' ? (
          <WorkspaceCard className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <SectionHeader icon={<Cpu size={12} />}>{strings.sectionHeaders.runs}</SectionHeader>
                <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>{strings.runs.subtitle}</p>
              </div>
              <p className="text-xs" style={{ color: TEXT_DIM }}>
                {backendSummary.running > 0
                  ? `${backendSummary.running} ${strings.statuses.running.toLowerCase()}`
                  : backendSummary.done > 0
                    ? strings.header.runsBadge(0, backendSummary.done, backendSummary.failed)
                    : strings.runs.selectionHint}
              </p>
            </div>

            <EngineSearchToolbar
              query={query}
              onChange={setQuery}
              projectFilter={projectFilter}
              onProjectChange={setProjectFilter}
              projectOptions={projectOptions}
              resultCount={filteredCandidateRows.length}
              totalCount={projectScopedRows.length}
            />

            {filteredCandidateRows.length === 0 ? (
              <div className="px-5 py-8">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{strings.runs.noResultsTitle}</p>
                <p className="mt-2 max-w-[720px] text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {strings.runs.noResultsDescription}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: PAGE_BG }}>
                    {strings.runs.tableHeaders.map(head => (
                      <th key={head} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidateRows.map(row => {
                    const backendState = backendRuns[row.id] ?? { status: 'idle' as const }
                    const isSelected = row.id === selectedRow?.id
                    return (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-t align-top transition-colors"
                        style={{ borderColor: BORDER, background: isSelected ? `${TEAL}08` : undefined }}
                        onClick={() => setSelectedEngineId(row.id)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold" style={{ color: TEXT }}>{row.sifNumber}</p>
                          <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.projectName}</p>
                          <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono" style={{ color: row.currentSil >= row.targetSil ? semantic.success : semantic.error }}>
                            SIL {row.currentSil} / SIL {row.targetSil}
                          </p>
                          <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>TS {formatPFD(row.tsPreview.pfdavg)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p style={{ color: TEXT }}>{row.reason}</p>
                          <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>{row.status === 'Published' ? strings.statuses.published : strings.statuses.working}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${TEAL}15`, color: TEAL }}>
                            {row.requestedMode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {backendState.status === 'running' && (
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${TEAL}18`, color: TEAL }}>
                              {strings.statuses.running}
                            </span>
                          )}
                          {backendState.status === 'error' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${semantic.error}12`, color: semantic.error }}>
                                {strings.statuses.error}
                              </span>
                              <p className="max-w-[180px] text-[10px]" style={{ color: TEXT_DIM }}>{backendState.message}</p>
                            </div>
                          )}
                          {backendState.status === 'done' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${semantic.success}12`, color: semantic.success }}>
                                SIL {backendState.response.result.silAchieved ?? '—'}
                              </span>
                              <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                                {formatPFD(backendState.response.result.pfdavg)} · {backendState.response.backend.runtimeMs.toFixed(2)} ms
                              </p>
                            </div>
                          )}
                          {backendState.status === 'idle' && (
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation()
                                void handleRunBackend(row)
                              }}
                              className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                              style={{ background: `${TEAL}15`, color: TEAL }}
                            >
                              {strings.runs.runPython}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation()
                              navigate({ type: 'sif-dashboard', projectId: row.projectId, sifId: row.id, tab: 'verification' })
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold"
                            style={{ color: TEAL }}
                          >
                            {strings.statuses.open}
                            <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                </table>
              </div>
            )}
          </WorkspaceCard>
        ) : activeSection === 'compare' ? (
          <div className="flex flex-col gap-4">
            <WorkspaceCard className="overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <SectionHeader icon={<GitCompareArrows size={12} />}>{strings.sectionHeaders.compare}</SectionHeader>
                  <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>{strings.compare.subtitle}</p>
                </div>
                <p className="text-xs" style={{ color: TEXT_DIM }}>
                  {compareSummary.running > 0
                    ? `${compareSummary.running} ${strings.compare.comparing.toLowerCase()}`
                    : compareSummary.compared > 0
                      ? `${strings.header.comparesBadge(compareSummary.compared)}${compareSummary.failed > 0 ? ` · ${compareSummary.failed} ${strings.statuses.error.toLowerCase()}` : ''}`
                      : strings.compare.selectionHint}
                </p>
              </div>

              <EngineSearchToolbar
                query={query}
                onChange={setQuery}
                projectFilter={projectFilter}
                onProjectChange={setProjectFilter}
                projectOptions={projectOptions}
                resultCount={filteredCandidateRows.length}
                totalCount={projectScopedRows.length}
              />

              {filteredCandidateRows.length === 0 ? (
                <div className="px-5 py-8">
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{strings.compare.noResultsTitle}</p>
                  <p className="mt-2 max-w-[720px] text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                    {strings.compare.noResultsDescription}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: PAGE_BG }}>
                      {strings.compare.tableHeaders.map(head => (
                        <th key={head} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidateRows.map(row => {
                      const compareState = compareRuns[row.id] ?? { status: 'idle' as const }
                      const isSelected = row.id === selectedRow?.id
                      return (
                        <tr
                          key={row.id}
                          className="cursor-pointer border-t align-top transition-colors"
                          style={{ borderColor: BORDER, background: isSelected ? `${TEAL}08` : undefined }}
                          onClick={() => setSelectedEngineId(row.id)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold" style={{ color: TEXT }}>{row.sifNumber}</p>
                            <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.projectName}</p>
                            <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1 text-[10px]" style={{ color: TEXT }}>
                              <p>PFD {formatPFD(row.tsPreview.pfdavg)}</p>
                              <p>PFH {formatPFD(row.tsPreview.pfh)}</p>
                              <p>{formatSil(row.tsPreview.silAchieved ?? null)} · RRF {formatRRF(row.tsPreview.rrf ?? 0)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {compareState.status === 'done' ? (
                              <div className="space-y-1 text-[10px]" style={{ color: TEXT }}>
                                <p>PFD {formatPFD(compareState.response.result.pfdavg)}</p>
                                <p>PFH {formatPFD(compareState.response.result.pfh)}</p>
                                <p>{formatSil(compareState.summary.backendSil)} · RRF {formatRRF(compareState.response.result.rrf ?? 0)}</p>
                              </div>
                            ) : compareState.status === 'error' ? (
                              <p className="max-w-[180px] text-[10px]" style={{ color: semantic.error }}>{compareState.message}</p>
                            ) : (
                              <p className="text-[10px]" style={{ color: TEXT_DIM }}>{strings.statuses.pythonNotComparedYet}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {compareState.status === 'done' ? (
                              <div className="space-y-1 text-[10px]" style={{ color: TEXT }}>
                                <p>{formatDeltaPct(compareState.summary.pfd.deltaPct)}</p>
                                <p style={{ color: TEXT_DIM }}>{formatSignedScientific(compareState.summary.pfd.deltaAbs)}</p>
                              </div>
                            ) : (
                              <p className="text-[10px]" style={{ color: TEXT_DIM }}>—</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {compareState.status === 'running' && (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${TEAL}18`, color: TEAL }}>
                                {strings.compare.comparing}
                              </span>
                            )}
                            {compareState.status === 'done' && (
                              <div className="space-y-1">
                                <span
                                  className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold"
                                  style={{
                                    background: compareState.summary.verdict === 'aligned'
                                      ? '#DCFCE7'
                                      : compareState.summary.verdict === 'drift'
                                        ? '#FEF3C7'
                                        : '#FEE2E2',
                                    color: compareState.summary.verdict === 'aligned'
                                      ? semantic.success
                                      : compareState.summary.verdict === 'drift'
                                        ? semantic.warning
                                        : semantic.error,
                                  }}
                                >
                                  {verdictMeta(compareState.summary.verdict, strings).label}
                                </span>
                                <p className="max-w-[220px] text-[10px]" style={{ color: TEXT_DIM }}>
                                  {compareState.summary.notes[0] ?? strings.compare.noMaterialDelta}
                                </p>
                              </div>
                            )}
                            {compareState.status === 'error' && (
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${semantic.error}12`, color: semantic.error }}>
                                {strings.statuses.compareFailed}
                              </span>
                            )}
                            {compareState.status === 'idle' && (
                              <p className="text-[10px]" style={{ color: TEXT_DIM }}>{strings.statuses.notComparedYet}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-2">
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation()
                                  void handleCompare(row)
                                }}
                                disabled={compareState.status === 'running'}
                                className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                                style={{ background: `${TEAL}15`, color: TEAL }}
                              >
                                {compareState.status === 'running' ? strings.compare.comparing : compareState.status === 'done' ? strings.compare.runAgain : strings.compare.compareAction}
                              </button>
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation()
                                  navigate({ type: 'sif-dashboard', projectId: row.projectId, sifId: row.id, tab: 'report' })
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold"
                                style={{ color: TEAL }}
                              >
                                {strings.compare.report}
                                <ArrowRight size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  </table>
                </div>
              )}
            </WorkspaceCard>

            {selectedCompareState.status === 'done' && selectedRow ? (
              <RouteInspector row={selectedRow} state={selectedCompareState} tolerancePct={compareTolerancePct} />
            ) : (
              <WorkspaceCard className="px-5 py-5" tone="page">
                <SectionHeader icon={<ArrowRight size={12} />}>{strings.sectionHeaders.routeInspector}</SectionHeader>
                <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>{strings.compare.noInspectedTitle}</p>
                <p className="mt-1 max-w-[720px] text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {strings.compare.noInspectedDescription}
                </p>
              </WorkspaceCard>
            )}
          </div>
        ) : (
          <WorkspaceCard className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <SectionHeader icon={<History size={12} />}>{strings.sectionHeaders.history}</SectionHeader>
                <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>{strings.history.subtitle}</p>
              </div>
              <p className="text-xs" style={{ color: TEXT_DIM }}>
                {historyLoading
                  ? strings.statuses.loading
                  : historySummary.running > 0
                    ? `${historySummary.running} ${strings.statuses.running.toLowerCase()}`
                    : historyRows.length > 0
                      ? strings.search.total(historyRows.length, strings.search.totalRunsLabel)
                      : strings.statuses.noHistory}
              </p>
            </div>

            <EngineSearchToolbar
              query={query}
              onChange={setQuery}
              projectFilter={projectFilter}
              onProjectChange={setProjectFilter}
              projectOptions={projectOptions}
              resultCount={historyRows.length}
              totalCount={projectScopedHistoryRows.length}
              placeholder={strings.search.placeholderHistory}
              totalLabel={strings.search.totalRunsLabel}
            />

            {historyLoading && historyRows.length === 0 ? (
              <div className="px-5 py-8">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{strings.history.loadingTitle}</p>
                <p className="mt-2 max-w-[720px] text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {strings.history.loadingDescription}
                </p>
              </div>
            ) : historyRows.length === 0 ? (
              <div className="px-5 py-8">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{strings.history.noResultsTitle}</p>
                <p className="mt-2 max-w-[720px] text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {strings.history.noResultsDescription}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: PAGE_BG }}>
                      {strings.history.tableHeaders.map(head => (
                        <th key={head} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map(row => {
                      const summary = asObject(row.run.resultSummary)
                      const pfdavg = asNumberValue(summary?.pfdavg)
                      const sil = asNumberValue(summary?.silAchieved)
                      const verdict = row.verdict
                      const verdictTone = verdict ? verdictMeta(verdict, strings) : null
                      const isSelected = row.run.id === selectedHistoryRow?.run.id

                      return (
                        <tr
                          key={row.run.id}
                          className="cursor-pointer border-t align-top transition-colors"
                          style={{ borderColor: BORDER, background: isSelected ? `${TEAL}08` : undefined }}
                          onClick={() => setSelectedHistoryRunId(row.run.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${TEAL}15`, color: TEAL }}>
                                {row.run.triggerKind}
                              </span>
                              <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: row.run.status === 'error' ? `${semantic.error}12` : row.run.status === 'done' ? `${semantic.success}12` : `${semantic.warning}12`, color: row.run.status === 'error' ? semantic.error : row.run.status === 'done' ? semantic.success : semantic.warning }}>
                                {row.run.status}
                              </span>
                              {verdictTone && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: verdictTone.bg, color: verdictTone.color }}>
                                  {verdictTone.label}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-[10px]" style={{ color: TEXT_DIM }}>
                              {row.run.backendVersion ? `Backend ${row.run.backendVersion}` : strings.statuses.backendVersionMissing}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold" style={{ color: TEXT }}>{row.sifNumber}</p>
                            <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.projectName}</p>
                            <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            {row.run.status === 'error' ? (
                              <p className="max-w-[240px] text-[10px] leading-relaxed" style={{ color: semantic.error }}>{row.run.errorMessage ?? strings.statuses.unknownBackendError}</p>
                            ) : (
                              <div className="space-y-1 text-[10px]" style={{ color: TEXT }}>
                                <p>{pfdavg != null ? `PFD ${formatPFD(pfdavg)}` : 'PFD —'}</p>
                                <p>{sil != null ? formatSil(sil) : 'SIL —'}</p>
                                <p style={{ color: TEXT_DIM }}>{strings.routeInspector.warningsSurfaced(row.run.warningCount)}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1 text-[10px]" style={{ color: TEXT }}>
                              <p>{row.run.runtimeMs != null ? `${row.run.runtimeMs.toFixed(2)} ms` : '—'}</p>
                              <p style={{ color: TEXT_DIM }}>{row.run.requestedMode}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[10px]" style={{ color: TEXT }}>{formatDateTime(row.run.startedAt ?? row.run.createdAt, strings.localeTag)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation()
                                navigate({ type: 'sif-dashboard', projectId: row.run.projectId, sifId: row.run.sifId, tab: 'verification' })
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold"
                              style={{ color: TEAL }}
                            >
                              {strings.statuses.open}
                              <ArrowRight size={11} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </WorkspaceCard>
        )}
      </div>
    </div>
  )
}
