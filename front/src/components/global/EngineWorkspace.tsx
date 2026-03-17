import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  Binary,
  Bot,
  Boxes,
  Braces,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  FlaskConical,
  Sigma,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { IntercalaireCard, IntercalaireTabBar, useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { calcSIF, calcSIFEngine, formatPFD, formatRRF } from '@/core/math/pfdCalc'
import {
  analysisSettingsToMissionTimeHours,
  loadSIFAnalysisSettings,
} from '@/core/models/analysisSettings'
import {
  buildSILBackendRequest,
  computeSILWithBackend,
  type SILBackendResponse,
} from '@/lib/engineApi'
import type { EngineResult } from '@/engine/types/engine'
import { usePrismTheme } from '@/styles/usePrismTheme'

type EngineTab = 'runs' | 'contracts' | 'artifacts' | 'compare'
type EngineRightTab = 'snapshot' | 'integration'
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

const COMPARE_TOLERANCE_PCT = 0.1
const SUBSYSTEM_ORDER: CompareSubsystemKey[] = ['sensors', 'solver', 'actuators']
const SUBSYSTEM_LABELS: Record<CompareSubsystemKey, string> = {
  sensors: 'Sensors',
  solver: 'Logic solver',
  actuators: 'Final elements',
}

const ENGINE_TABS = [
  { id: 'runs' as const, label: 'Runs', hint: 'Queue & candidates' },
  { id: 'contracts' as const, label: 'API / Modes', hint: 'Contract & job model' },
  { id: 'artifacts' as const, label: 'Outputs', hint: 'Artifacts & retention' },
  { id: 'compare' as const, label: 'Compare', hint: 'TS vs Python' },
]

const ENGINE_RIGHT_TABS = [
  { id: 'snapshot' as const, label: 'Snapshot', Icon: Activity },
  { id: 'integration' as const, label: 'Integration', Icon: Braces },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { TEAL } = usePrismTheme()
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
      {children}
    </p>
  )
}

function StatCard({ label, value, hint, color }: { label: string; value: string; hint: string; color?: string }) {
  const { BORDER, CARD_BG, SHADOW_PANEL, TEXT, TEXT_DIM } = usePrismTheme()
  const resolvedColor = color ?? TEXT
  return (
    <div className="rounded-2xl border px-5 py-4" style={{ background: CARD_BG, borderColor: BORDER, boxShadow: SHADOW_PANEL }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-2xl font-black font-mono" style={{ color: resolvedColor }}>{value}</p>
      <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>{hint}</p>
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

function buildCompareSummary(tsResult: EngineResult, backendResponse: SILBackendResponse, tolerancePct: number): CompareSummary {
  const pfd = compareMetric(tsResult.pfdavg, backendResponse.result.pfdavg, tolerancePct)
  const pfh = compareMetric(tsResult.pfh, backendResponse.result.pfh, tolerancePct)
  const rrf = compareMetric(tsResult.rrf, backendResponse.result.rrf, tolerancePct)
  const tsSil = tsResult.silAchieved ?? null
  const backendSil = backendResponse.result.silAchieved ?? null
  const silMatch = tsSil === backendSil

  const routeSummary = Object.entries(backendResponse.backend.subsystems).map(([key, meta]) => {
    const mode = meta.markovTriggered ? 'Markov' : meta.pfdEngine ?? 'backend'
    return `${key}: ${mode}${meta.thresholdUsed != null ? ` · threshold ${meta.thresholdUsed.toFixed(3)}` : ''}`
  })

  const notes: string[] = []
  if (!pfd.withinTolerance) notes.push(`PFD delta ${formatDeltaPct(pfd.deltaPct)} (${formatSignedScientific(pfd.deltaAbs)})`)
  if (!pfh.withinTolerance) notes.push(`PFH delta ${formatDeltaPct(pfh.deltaPct)} (${formatSignedScientific(pfh.deltaAbs)})`)
  if (!rrf.withinTolerance) notes.push(`RRF delta ${formatDeltaPct(rrf.deltaPct)}`)
  if (!silMatch) notes.push(`SIL mismatch: TS ${formatSil(tsSil)} vs Python ${formatSil(backendSil)}`)
  const markovSubsystems = Object.entries(backendResponse.backend.subsystems)
    .filter(([, meta]) => meta.markovTriggered)
    .map(([key]) => key)
  if (markovSubsystems.length > 0) notes.push(`Backend Markov triggered on ${markovSubsystems.join(', ')}`)
  if (backendResponse.result.warnings.length > 0) notes.push(`${backendResponse.result.warnings.length} backend warning(s) returned`)

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

function describeRoute(meta: SILBackendResponse['backend']['subsystems'][string]): string[] {
  const lines = [
    `Requested mode: ${meta.requestedMode}`,
    `Effective architecture: ${meta.effectiveArchitecture}${meta.architecture !== meta.effectiveArchitecture ? ` (input ${meta.architecture})` : ''}`,
    `PFD engine: ${meta.pfdEngine ?? '—'}`,
    `PFH engine: ${meta.pfhEngine ?? '—'}`,
  ]

  if (meta.lambdaT1 != null && meta.thresholdUsed != null) {
    lines.push(`Routing threshold check: lambdaD×T1 = ${meta.lambdaT1.toFixed(3)} vs threshold ${meta.thresholdUsed.toFixed(3)}`)
  } else if (meta.lambdaT1 != null) {
    lines.push(`lambdaD×T1 = ${meta.lambdaT1.toFixed(3)} (no calibrated threshold exposed)`)
  }

  lines.push(meta.markovTriggered ? 'Markov path was triggered by the backend.' : 'Markov path was not triggered by the backend.')

  if (meta.heterogeneousChannels) {
    lines.push('Non-identical channels were reduced to an equivalent subsystem before solving.')
  }

  return lines
}

function verdictMeta(verdict: CompareSummary['verdict']) {
  if (verdict === 'aligned') return { label: 'Aligned', bg: '#DCFCE7', color: '#15803D' }
  if (verdict === 'drift') return { label: 'Drift', bg: '#FEF3C7', color: '#B45309' }
  return { label: 'Mismatch', bg: '#FEE2E2', color: '#B91C1C' }
}

function RouteInspector({
  row,
  state,
}: {
  row: {
    id: string
    projectId: string
    projectName: string
    sifNumber: string
    title: string
    targetSil: number
  }
  state: Extract<CompareRunState, { status: 'done' }>
}) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_PANEL, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const verdict = verdictMeta(state.summary.verdict)

  return (
    <div className="rounded-2xl border" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: BORDER, background: PAGE_BG }}>
        <div>
          <SectionLabel>Route Inspector</SectionLabel>
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
            Target {formatSil(row.targetSil)} · TS {formatSil(state.summary.tsSil)} · Python {formatSil(state.summary.backendSil)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 px-5 py-4">
        <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Why Different</p>
          <div className="mt-3 space-y-2">
            {(state.summary.notes.length > 0 ? state.summary.notes : ['No material delta detected between TypeScript and Python on this payload.']).map(note => (
              <div key={note} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT, boxShadow: SHADOW_SOFT }}>
                {note}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Global Delta</p>
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
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Backend Signals</p>
          <div className="mt-3 space-y-2 text-xs" style={{ color: TEXT }}>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
              <p className="font-mono font-semibold" style={{ color: TEAL }}>Requested mode</p>
              <p className="mt-1">{state.response.backend.requestedMode}</p>
            </div>
            <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
              <p className="font-mono font-semibold" style={{ color: TEAL }}>Runtime</p>
              <p className="mt-1">{state.response.backend.runtimeMs.toFixed(2)} ms</p>
              <p className="mt-1" style={{ color: TEXT_DIM }}>{state.summary.warningCount} warning(s) surfaced by backend</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 px-5 pb-5">
        {SUBSYSTEM_ORDER.map(key => {
          const meta = state.response.backend.subsystems[key]
          const backend = state.response.result.contributions[key]
          const ts = state.tsResult.contributions[key]
          const warnings = getSubsystemWarnings(state.response, key)
          const pfdDelta = compareMetric(ts?.pfdavg, backend?.pfdavg, COMPARE_TOLERANCE_PCT)
          const pfhDelta = compareMetric(ts?.pfh, backend?.pfh, COMPARE_TOLERANCE_PCT)
          const routeLines = describeRoute(meta)
          const routeTone = meta.markovTriggered
            ? { bg: '#DBEAFE', color: '#1D4ED8', label: 'Markov' }
            : meta.pfdEngine === 'MANUFACTURER_INPUT'
              ? { bg: '#EDE9FE', color: '#6D28D9', label: 'Manufacturer input' }
              : { bg: '#E0F2FE', color: '#0369A1', label: 'Analytical / IEC' }

          return (
            <div key={key} className="rounded-xl border p-4" style={{ borderColor: BORDER, background: PAGE_BG }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{SUBSYSTEM_LABELS[key]}</p>
                  <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>{meta.effectiveArchitecture}</p>
                </div>
                <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: routeTone.bg, color: routeTone.color }}>
                  {routeTone.label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_SOFT }}>
                  <p className="font-mono font-semibold" style={{ color: TEAL }}>PFD</p>
                  <p className="mt-1" style={{ color: TEXT }}>TS {formatPFD(ts?.pfdavg ?? NaN)}</p>
                  <p className="mt-1" style={{ color: TEXT }}>Py {formatPFD(backend?.pfdavg ?? NaN)}</p>
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
    </div>
  )
}

function EngineRightPanel({
  totalSifs,
  criticalCandidates,
  totalCampaigns,
}: {
  totalSifs: number
  criticalCandidates: number
  totalCampaigns: number
}) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_PANEL, SHADOW_SOFT, TEXT, TEXT_DIM, TEAL, semantic } = usePrismTheme()
  const [activeTab, setActiveTab] = useState<EngineRightTab>('snapshot')
  const activeIdx = ENGINE_RIGHT_TABS.findIndex(tab => tab.id === activeTab)

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: PANEL_BG }}>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <div className="sticky top-0 z-10 px-3 pt-3" style={{ background: PANEL_BG }}>
          <IntercalaireTabBar tabs={ENGINE_RIGHT_TABS} active={activeTab} onSelect={setActiveTab} cardBg={CARD_BG} />
        </div>
        <div className="px-3 pb-3">
          <IntercalaireCard
            tabCount={ENGINE_RIGHT_TABS.length}
            activeIdx={activeIdx}
            className="space-y-3 p-3"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: SHADOW_PANEL }}
          >
          {activeTab === 'snapshot' && (
            <>
              <div>
                <SectionLabel>Engine Snapshot</SectionLabel>
                <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>Hybrid compute model ready</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  TypeScript remains the live calculation layer. The Engine workspace is ready to dispatch advanced Python jobs when the backend is connected.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Tracked SIFs</p>
                  <p className="mt-1 text-lg font-black font-mono" style={{ color: TEXT }}>{totalSifs}</p>
                </div>
                <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>Proof campaigns</p>
                  <p className="mt-1 text-lg font-black font-mono" style={{ color: TEXT }}>{totalCampaigns}</p>
                </div>
              </div>

              <div className="rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>High-value candidates</p>
                <p className="mt-1 text-lg font-black font-mono" style={{ color: criticalCandidates > 0 ? semantic.error : semantic.success }}>
                  {criticalCandidates}
                </p>
                <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                  SIFs that currently miss target SIL and would benefit first from a backend Markov or Monte Carlo run.
                </p>
              </div>
            </>
          )}

          {activeTab === 'integration' && (
            <>
              <div>
                <SectionLabel>Integration Path</SectionLabel>
                <div className="mt-2 space-y-2">
                  {[
                    'POST /engine/runs submits a frozen payload to Python',
                    'GET /engine/runs/:id returns status, results, logs, and outputs',
                    'Outputs stay separate from revision PDFs and proof-test archives',
                    'Compare tab reconciles live TS estimates against authoritative Python runs',
                  ].map(item => (
                    <div key={item} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT, boxShadow: SHADOW_SOFT }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          </IntercalaireCard>
        </div>
      </div>
    </div>
  )
}

export function EngineWorkspace() {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_PANEL, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const projects = useAppStore(s => s.projects)
  const navigate = useAppStore(s => s.navigate)
  const { setRightPanelOverride } = useLayout()
  const [activeTab, setActiveTab] = useState<EngineTab>('runs')
  const [backendRuns, setBackendRuns] = useState<Record<string, BackendRunState>>({})
  const [compareRuns, setCompareRuns] = useState<Record<string, CompareRunState>>({})
  const [selectedCompareId, setSelectedCompareId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const allSifs = projects.flatMap(project => project.sifs)
    const totalCampaigns = allSifs.reduce((acc, sif) => acc + (sif.testCampaigns?.length ?? 0), 0)
    const criticalCandidates = allSifs.filter(sif => !calcSIF(sif).meetsTarget).length
    const publishedSifs = allSifs.filter(sif => Boolean(sif.revisionLockedAt)).length
    const readyProcedures = allSifs.filter(sif => sif.proofTestProcedure?.status === 'approved').length
    return {
      allSifs,
      totalSifs: allSifs.length,
      totalCampaigns,
      criticalCandidates,
      publishedSifs,
      readyProcedures,
    }
  }, [projects])

  const candidateRows = useMemo(() => (
    stats.allSifs
      .map(sif => {
        const project = projects.find(entry => entry.id === sif.projectId)
        const result = calcSIF(sif)
        const reason = !result.meetsTarget
          ? 'Target gap'
          : sif.revisionLockedAt
            ? 'Published baseline'
            : (sif.testCampaigns?.length ?? 0) > 0
              ? 'Operational evidence available'
              : 'Design candidate'
        return {
          id: sif.id,
          sif,
          projectStandard: project?.standard,
          projectId: sif.projectId,
          projectName: project?.name ?? 'Unknown project',
          sifNumber: sif.sifNumber,
          title: sif.title || sif.description || 'Untitled SIF',
          currentSil: result.SIL,
          targetSil: sif.targetSIL,
          reason,
          recommendation: !result.meetsTarget ? 'Markov baseline' : 'Monte Carlo stress',
          status: sif.revisionLockedAt ? 'Published' : 'Working',
        }
      })
      .sort((left, right) => {
        const leftScore = left.currentSil < left.targetSil ? 0 : left.status === 'Published' ? 1 : 2
        const rightScore = right.currentSil < right.targetSil ? 0 : right.status === 'Published' ? 1 : 2
        return leftScore - rightScore || left.sifNumber.localeCompare(right.sifNumber)
      })
  ), [projects, stats.allSifs])

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

  const selectedCompareEntry = useMemo(() => {
    const preferredIds = selectedCompareId
      ? [selectedCompareId, ...candidateRows.map(row => row.id).filter(id => id !== selectedCompareId)]
      : candidateRows.map(row => row.id)

    for (const id of preferredIds) {
      const state = compareRuns[id]
      if (state?.status === 'done') {
        const row = candidateRows.find(item => item.id === id)
        if (row) return { row, state }
      }
    }

    return null
  }, [candidateRows, compareRuns, selectedCompareId])

  function getRowCalcOptions(row: (typeof candidateRows)[number]) {
    const analysisSettings = loadSIFAnalysisSettings(row.id)
    return {
      options: {
        projectStandard: row.projectStandard,
        missionTimeHours: analysisSettingsToMissionTimeHours(analysisSettings),
        curvePoints: analysisSettings.chart.curvePoints,
      },
      runtime: {
        calculationMode: row.currentSil < row.targetSil ? 'MARKOV' as const : 'AUTO' as const,
        includeCurve: false,
      },
    }
  }

  async function executeBackendRun(row: (typeof candidateRows)[number]) {
    const { options, runtime } = getRowCalcOptions(row)
    return computeSILWithBackend(buildSILBackendRequest(row.sif, options, runtime))
  }

  async function handleRunBackend(row: (typeof candidateRows)[number]) {
    setBackendRuns(current => ({ ...current, [row.id]: { status: 'running' } }))

    try {
      const response = await executeBackendRun(row)
      setBackendRuns(current => ({ ...current, [row.id]: { status: 'done', response } }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown backend error'
      setBackendRuns(current => ({ ...current, [row.id]: { status: 'error', message } }))
    }
  }

  async function handleCompare(row: (typeof candidateRows)[number]) {
    setCompareRuns(current => ({ ...current, [row.id]: { status: 'running' } }))
    setBackendRuns(current => ({ ...current, [row.id]: { status: 'running' } }))

    try {
      const { options } = getRowCalcOptions(row)
      const tsResult = calcSIFEngine(row.sif, options)
      const response = await executeBackendRun(row)
      const summary = buildCompareSummary(tsResult, response, COMPARE_TOLERANCE_PCT)
      setBackendRuns(current => ({ ...current, [row.id]: { status: 'done', response } }))
      setCompareRuns(current => ({ ...current, [row.id]: { status: 'done', response, tsResult, summary } }))
      setSelectedCompareId(row.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown comparison error'
      setBackendRuns(current => ({ ...current, [row.id]: { status: 'error', message } }))
      setCompareRuns(current => ({ ...current, [row.id]: { status: 'error', message } }))
    }
  }

  useEffect(() => {
    setRightPanelOverride(
      <EngineRightPanel
        totalSifs={stats.totalSifs}
        criticalCandidates={stats.criticalCandidates}
        totalCampaigns={stats.totalCampaigns}
      />,
    )
    return () => setRightPanelOverride(null)
  }, [setRightPanelOverride, stats.criticalCandidates, stats.totalCampaigns, stats.totalSifs])

  const activeIdx = ENGINE_TABS.findIndex(tab => tab.id === activeTab)
  const runPayloadFields = [
    ['mode', 'markov | monte_carlo | sensitivity | batch_compare'],
    ['scope', 'working_snapshot | published_revision'],
    ['projectId', 'uuid'],
    ['sifId', 'uuid'],
    ['revisionId', 'uuid | null'],
    ['analysis', 'missionTimeHours, demandMode, proofTestIntervalHours'],
    ['options', 'seed?, samples?, solver?, tolerances?'],
  ] as const
  const jobLifecycle = [
    ['queued', 'Accepted by the backend and waiting for worker capacity'],
    ['running', 'Solver executing with live progress and logs'],
    ['succeeded', 'Final result and outputs persisted'],
    ['failed', 'Run stopped with an explicit error payload'],
    ['cancelled', 'User or system interrupted the run before completion'],
  ] as const
  const resultShape = [
    ['summary', 'pfdavg, sil, rrf, pass/fail, warnings'],
    ['backend', 'engineVersion, mode, runtimeMs, seed, samples'],
    ['series', 'trace-ready arrays for plots and convergence'],
    ['comparison', 'optional TS vs Python deltas'],
  ] as const
  const expectedOutputs = [
    ['manifest.json', 'Immutable run metadata and input digest'],
    ['result.json', 'Primary result payload returned by Python'],
    ['traces.json', 'Convergence, occupancy, or simulation traces'],
    ['plots/*', 'PNG/SVG charts generated by the backend'],
  ] as const
  const comparisonSignals = [
    ['PFDavg', 'Absolute and percentage delta between TS and Python'],
    ['SIL', 'Target/achieved classification agreement or mismatch'],
    ['RRF', 'Decision-grade delta for quick engineering review'],
    ['Warnings', 'Validation or modeling warnings emitted by either engine'],
  ] as const

  return (
    <div
      className="flex flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden px-5 py-5"
      style={{ background: PAGE_BG, scrollbarGutter: 'stable' }}
    >
      <div className="grid grid-cols-4 gap-4 shrink-0">
        <StatCard label="Tracked SIFs" value={String(stats.totalSifs)} hint="Current PRISM estate visible to the engine" />
        <StatCard label="Published Baselines" value={String(stats.publishedSifs)} hint="Frozen revisions ready for authoritative runs" color="#60A5FA" />
        <StatCard label="Approved Procedures" value={String(stats.readyProcedures)} hint="Proof-test procedures with stable execution baselines" color="#4ADE80" />
        <StatCard label="Campaign Records" value={String(stats.totalCampaigns)} hint="Operational evidence already available for calibration" color={TEAL} />
      </div>

      <div className="mt-4 shrink-0">
        <IntercalaireTabBar tabs={ENGINE_TABS} active={activeTab} onSelect={setActiveTab} cardBg={CARD_BG} />
      </div>

      <div className="pt-0">
        <IntercalaireCard tabCount={ENGINE_TABS.length} activeIdx={activeIdx} className="p-5">
          {activeTab === 'runs' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <div className="flex items-center gap-2">
                    <Cpu size={14} style={{ color: TEAL }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>Direct backend runs ready</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                    Engine can now send a full SIL payload to the Python backend. Queueing and persisted artifacts can come later without changing the contract.
                  </p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <div className="flex items-center gap-2">
                    <Sigma size={14} style={{ color: '#60A5FA' }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>Target solver modes</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                    Markov chains, stiff solvers, Monte Carlo, sensitivity sweeps, and batch comparison between TS preview and backend results.
                  </p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: semantic.success }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>Frontend already ready</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                    Navigation, right panel, and candidate targeting are in place, so you can plug job creation as soon as your backend contract is fixed.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div>
                    <SectionLabel>Run Candidates</SectionLabel>
                    <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>Best starting points for backend runs</p>
                  </div>
                  <div className="text-xs" style={{ color: TEXT_DIM }}>
                    {backendSummary.running > 0
                      ? `${backendSummary.running} running`
                      : backendSummary.done > 0
                        ? `${backendSummary.done} completed${backendSummary.failed > 0 ? ` · ${backendSummary.failed} failed` : ''}`
                        : 'No backend run yet'}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: PAGE_BG }}>
                        {['SIF', 'Project', 'Current / Target', 'Recommendation', 'Reason', 'Python', 'Open'].map(head => (
                          <th key={head} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {candidateRows.map(row => (
                        <tr key={row.id} className="border-t" style={{ borderColor: BORDER }}>
                          <td className="px-4 py-3">
                            <p className="font-semibold" style={{ color: TEXT }}>{row.sifNumber}</p>
                            <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.title}</p>
                          </td>
                          <td className="px-4 py-3" style={{ color: TEXT }}>{row.projectName}</td>
                          <td className="px-4 py-3 font-mono" style={{ color: row.currentSil >= row.targetSil ? '#4ADE80' : '#F87171' }}>
                            SIL {row.currentSil} / SIL {row.targetSil}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${TEAL}15`, color: TEAL }}>
                              {row.recommendation}
                            </span>
                          </td>
                          <td className="px-4 py-3" style={{ color: TEXT_DIM }}>{row.reason}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const backendState = backendRuns[row.id] ?? { status: 'idle' as const }
                              if (backendState.status === 'running') {
                                return (
                                  <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${TEAL}18`, color: TEAL }}>
                                    Running...
                                  </span>
                                )
                              }
                              if (backendState.status === 'error') {
                                return (
                                  <div className="space-y-1">
                                  <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${semantic.error}12`, color: semantic.error }}>
                                    Error
                                  </span>
                                    <p className="max-w-[180px] text-[10px]" style={{ color: TEXT_DIM }}>{backendState.message}</p>
                                  </div>
                                )
                              }
                              if (backendState.status === 'done') {
                                return (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${semantic.success}12`, color: semantic.success }}>
                                      SIL {backendState.response.result.silAchieved ?? '—'}
                                    </span>
                                    <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                                      {formatPFD(backendState.response.result.pfdavg)} · {backendState.response.backend.subsystems.sensors.pfdEngine ?? 'backend'}
                                    </p>
                                  </div>
                                )
                              }
                              return (
                                <button
                                  type="button"
                                  onClick={() => { void handleRunBackend(row) }}
                                  className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                                  style={{ background: `${TEAL}15`, color: TEAL }}
                                >
                                  Run Python
                                </button>
                              )
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => navigate({ type: 'sif-dashboard', projectId: row.projectId, sifId: row.id, tab: 'verification' })}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold"
                              style={{ color: TEAL }}
                            >
                              Open
                              <ArrowRight size={11} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                <div className="flex items-center gap-2">
                  <Boxes size={14} style={{ color: '#60A5FA' }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Run payload</p>
                </div>
                <div className="mt-3 space-y-2">
                  {runPayloadFields.map(([field, desc]) => (
                    <div key={field} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{field}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                <div className="flex items-center gap-2">
                  <Bot size={14} style={{ color: TEAL }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Job lifecycle</p>
                </div>
                <div className="mt-3 space-y-2">
                  {jobLifecycle.map(([status, desc]) => (
                    <div key={status} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{status}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                <div className="flex items-center gap-2">
                  <Sigma size={14} style={{ color: '#4ADE80' }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Result structure</p>
                </div>
                <div className="mt-3 space-y-2">
                  {resultShape.map(([field, desc]) => (
                    <div key={field} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{field}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                <div className="flex items-center gap-2">
                  <Database size={14} style={{ color: '#60A5FA' }} />
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>Expected outputs</p>
                </div>
                <div className="mt-3 space-y-2">
                  {expectedOutputs.map(([field, desc]) => (
                    <div key={field} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: BORDER, background: PAGE_BG, boxShadow: SHADOW_SOFT }}>
                      <p className="font-mono font-semibold" style={{ color: TEAL }}>{field}</p>
                      <p className="mt-1" style={{ color: TEXT }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'artifacts' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  title: 'Run manifest',
                  icon: Binary,
                  desc: 'Immutable record of solver mode, version, inputs, and timestamps for each backend run.',
                },
                {
                  title: 'Trace plots',
                  icon: Activity,
                  desc: 'Convergence plots, state occupancy charts, and simulation traces returned by Python.',
                },
                {
                  title: 'Calibration pack',
                  icon: FlaskConical,
                  desc: 'Structured package to retain TS baseline, Python run outputs, and comparison evidence together.',
                },
                {
                  title: 'Retention policy',
                  icon: Clock3,
                  desc: 'Keep raw runs separable from SIF revision PDFs, so regulatory snapshots stay clean while engine research can evolve.',
                },
              ].map(item => (
                <div key={item.title} className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <div className="flex items-center gap-2">
                    <item.icon size={14} style={{ color: TEAL }} />
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{item.title}</p>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Tolerance</p>
                  <p className="mt-1 text-2xl font-black font-mono" style={{ color: TEXT }}>{COMPARE_TOLERANCE_PCT.toFixed(2)}%</p>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>Default compare threshold until validation settings are persisted globally.</p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Aligned</p>
                  <p className="mt-1 text-2xl font-black font-mono" style={{ color: '#15803D' }}>{compareSummary.aligned}</p>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>PFD, PFH, RRF and SIL all within tolerance.</p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Drift</p>
                  <p className="mt-1 text-2xl font-black font-mono" style={{ color: '#D97706' }}>{compareSummary.drift}</p>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>Same SIL but at least one numerical delta exceeds tolerance.</p>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Mismatch</p>
                  <p className="mt-1 text-2xl font-black font-mono" style={{ color: '#DC2626' }}>{compareSummary.mismatch}</p>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>SIL differs between TS and Python or the compare run failed.</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <div>
                    <SectionLabel>Front / Backend Compare</SectionLabel>
                    <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>Same payload, two engines, explicit deltas</p>
                  </div>
                  <div className="text-xs" style={{ color: TEXT_DIM }}>
                    {compareSummary.running > 0
                      ? `${compareSummary.running} comparing`
                      : compareSummary.compared > 0
                        ? `${compareSummary.compared} compared${compareSummary.failed > 0 ? ` · ${compareSummary.failed} failed` : ''}`
                        : 'No comparison yet'}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: PAGE_BG }}>
                        {['SIF', 'TypeScript', 'Python', 'Delta', 'Verdict', 'Routing', 'Action'].map(head => (
                          <th key={head} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {candidateRows.map(row => {
                        const compareState = compareRuns[row.id] ?? { status: 'idle' as const }
                        const isSelected = selectedCompareEntry?.row.id === row.id
                        return (
                          <tr key={row.id} className="border-t align-top" style={{ borderColor: BORDER, background: isSelected ? `${TEAL}08` : undefined }}>
                            <td className="px-4 py-3">
                              <p className="font-semibold" style={{ color: TEXT }}>{row.sifNumber}</p>
                              <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.projectName}</p>
                              <p className="text-[10px]" style={{ color: TEXT_DIM }}>{row.title}</p>
                            </td>
                            <td className="px-4 py-3">
                              {compareState.status === 'done' ? (
                                <div className="space-y-1 text-[10px]" style={{ color: TEXT }}>
                                  <p>PFD {formatPFD(compareState.tsResult.pfdavg)}</p>
                                  <p>PFH {formatPFD(compareState.tsResult.pfh)}</p>
                                  <p>{formatSil(compareState.summary.tsSil)} · RRF {formatRRF(compareState.tsResult.rrf)}</p>
                                </div>
                              ) : (
                                <p className="text-[10px]" style={{ color: TEXT_DIM }}>Run compare to snapshot TS values.</p>
                              )}
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
                                <p className="text-[10px]" style={{ color: TEXT_DIM }}>Python not compared yet.</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {compareState.status === 'done' ? (
                                <div className="space-y-1 text-[10px]" style={{ color: TEXT }}>
                                  <p>PFD {formatDeltaPct(compareState.summary.pfd.deltaPct)}</p>
                                  <p>PFH {formatDeltaPct(compareState.summary.pfh.deltaPct)}</p>
                                  <p>RRF {formatDeltaPct(compareState.summary.rrf.deltaPct)}</p>
                                </div>
                              ) : (
                                <p className="text-[10px]" style={{ color: TEXT_DIM }}>—</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {compareState.status === 'running' && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${TEAL}18`, color: TEAL }}>
                                  Comparing...
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
                                    {compareState.summary.verdict === 'aligned'
                                      ? 'Aligned'
                                      : compareState.summary.verdict === 'drift'
                                        ? 'Drift'
                                        : 'Mismatch'}
                                  </span>
                                  <p className="max-w-[220px] text-[10px]" style={{ color: TEXT_DIM }}>
                                    {compareState.summary.notes[0] ?? 'No material delta detected.'}
                                  </p>
                                </div>
                              )}
                              {compareState.status === 'error' && (
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `${semantic.error}12`, color: semantic.error }}>
                                  Compare failed
                                </span>
                              )}
                              {compareState.status === 'idle' && (
                                <p className="text-[10px]" style={{ color: TEXT_DIM }}>Not compared yet.</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {compareState.status === 'done' ? (
                                <div className="space-y-1">
                                  {compareState.summary.routeSummary.slice(0, 3).map(item => (
                                    <p key={item} className="text-[10px]" style={{ color: TEXT_DIM }}>{item}</p>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {comparisonSignals.slice(0, 2).map(([metric, desc]) => (
                                    <p key={metric} className="text-[10px]" style={{ color: TEXT_DIM }}>{metric}: {desc}</p>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-start gap-2">
                                <button
                                  type="button"
                                  onClick={() => { void handleCompare(row) }}
                                  disabled={compareState.status === 'running'}
                                  className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                                  style={{ background: `${TEAL}15`, color: TEAL }}
                                >
                                  {compareState.status === 'running' ? 'Comparing...' : compareState.status === 'done' ? 'Run again' : 'Compare'}
                                </button>
                                {compareState.status === 'done' && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCompareId(row.id)}
                                    className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
                                    style={{ background: isSelected ? `${TEAL}18` : PAGE_BG, color: TEAL, border: `1px solid ${BORDER}` }}
                                  >
                                    Inspect
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => navigate({ type: 'sif-dashboard', projectId: row.projectId, sifId: row.id, tab: 'report' })}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold"
                                  style={{ color: TEAL }}
                                >
                                  Report
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
              </div>

              {selectedCompareEntry ? (
                <RouteInspector row={selectedCompareEntry.row} state={selectedCompareEntry.state} />
              ) : (
                <div className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: CARD_BG, boxShadow: SHADOW_PANEL }}>
                  <SectionLabel>Route Inspector</SectionLabel>
                  <p className="mt-2 text-sm font-semibold" style={{ color: TEXT }}>No inspected run yet</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                    Launch a compare on any SIF, then inspect the backend route per subsystem to understand why Python stayed analytical or switched to Markov.
                  </p>
                </div>
              )}
            </div>
          )}
        </IntercalaireCard>
      </div>
    </div>
  )
}
