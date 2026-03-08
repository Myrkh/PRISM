import { useMemo, useState, useEffect } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, FileWarning, Radio, ShieldCheck } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { ProofTestTab } from '@/components/prooftest/ProofTestTab'
import { Button } from '@/components/ui/button'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { SILGauge } from '@/components/shared/SILGauge'
import { LoopEditorFlow } from '@/components/architecture/LoopEditorFlow'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { PFDChart } from '@/components/analysis/PFDChart'
import { AnalysisRightPanel } from '@/components/analysis/AnalysisRightPanel'
import { ComplianceTab } from '@/components/sif/ComplianceTab'
import { ComplianceRightPanel } from '@/components/sif/ComplianceRightPanel'
import { OverviewRightPanel } from '@/components/sif/OverviewRightPanel'
import { SIFVerdictBanner } from '@/components/sif/SIFVerdictBanner'
import { SILReportStudio } from '@/components/report/SILReportStudio'
import { calcSIF, formatPFD, formatRRF, formatPct } from '@/core/math/pfdCalc'
import {
  DEFAULT_SIF_ANALYSIS_SETTINGS,
  analysisSettingsToMissionTimeHours,
  getAnalysisSubsystemColors,
  loadSIFAnalysisSettings,
  saveSIFAnalysisSettings,
} from '@/core/models/analysisSettings'
import { computeCompliance } from '@/components/sif/complianceCalc'
import { getOverviewMetrics } from '@/components/sif/overviewMetrics'
import type { SILLevel, SIFAssumption } from '@/core/types'
import { cn } from '@/lib/utils'
import { BORDER, CARD_BG, PAGE_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } from '@/styles/tokens'

interface ContributionRow {
  key: string
  label: string
  color: string
  pfd: number
  rrf: number
  sil: SILLevel
  contributionPct: number
}

function ContributionTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null

  const row = payload[0].payload as ContributionRow

  return (
    <div className="rounded-xl border bg-card shadow-xl px-4 py-3 text-xs">
      <p className="font-semibold mb-1">{row.label}</p>
      <p className="font-mono text-muted-foreground">PFD {formatPFD(row.pfd)}</p>
      <p className="font-mono text-muted-foreground">RRF {formatRRF(row.rrf)}</p>
      <p className="font-mono text-muted-foreground">{row.contributionPct.toFixed(1)}%</p>
    </div>
  )
}

const OVERVIEW_ACTION_CTA: Record<SIFTab, string> = {
  overview: 'Review below',
  architecture: 'Open Loop Editor',
  analysis: 'Open Calculations',
  compliance: 'Open Compliance',
  prooftest: 'Open Proof Test',
  report: 'Open Reports',
}

const OPERATIONAL_HEALTH_META = {
  healthy: {
    label: 'Healthy',
    color: semantic.success,
    bg: `${semantic.success}1A`,
    border: `${semantic.success}33`,
    Icon: CheckCircle2,
  },
  watch: {
    label: 'Watch list',
    color: semantic.warning,
    bg: `${semantic.warning}1A`,
    border: `${semantic.warning}33`,
    Icon: AlertTriangle,
  },
  critical: {
    label: 'Action required',
    color: semantic.error,
    bg: `${semantic.error}1A`,
    border: `${semantic.error}33`,
    Icon: AlertTriangle,
  },
  unknown: {
    label: 'No data',
    color: TEXT_DIM,
    bg: `${TEXT_DIM}12`,
    border: `${TEXT_DIM}22`,
    Icon: Radio,
  },
} as const

interface Props { projectId: string; sifId: string }

export function SIFDashboard({ projectId, sifId }: Props) {
  const view        = useAppStore(s => s.view)
  const navigate    = useAppStore(s => s.navigate)
  const setTab      = useAppStore(s => s.setTab)
  const updateSIF   = useAppStore(s => s.updateSIF)
  const { setRightPanelOverride } = useLayout()
  const project     = useAppStore(s => s.projects.find(p => p.id === projectId))
  const sif         = project?.sifs.find(s => s.id === sifId)

  const activeTab = view.type === 'sif-dashboard' ? view.tab : 'overview'
  const [analysisSettings, setAnalysisSettings] = useState(() =>
    sif ? loadSIFAnalysisSettings(sif.id) : DEFAULT_SIF_ANALYSIS_SETTINGS
  )
  const [selectedComplianceGapId, setSelectedComplianceGapId] = useState<string | null>(null)
  const [selectedComplianceEvidenceId, setSelectedComplianceEvidenceId] = useState<string | null>(null)

  useEffect(() => {
    if (!sif) return
    setAnalysisSettings(loadSIFAnalysisSettings(sif.id))
  }, [activeTab, sif?.id])

  useEffect(() => {
    setSelectedComplianceGapId(null)
    setSelectedComplianceEvidenceId(null)
  }, [activeTab, sif?.id])

  useEffect(() => {
    if (!sif) return
    saveSIFAnalysisSettings(sif.id, analysisSettings)
  }, [analysisSettings, sif])

  const subsystemColors = useMemo(() => getAnalysisSubsystemColors(analysisSettings), [analysisSettings])
  const getSubsystemColor = (type: string) =>
    type === 'sensor' || type === 'logic' || type === 'actuator'
      ? subsystemColors[type]
      : '#6B7280'
  const result = useMemo(() => {
    if (!sif) return null
    return calcSIF(sif, {
      projectStandard: project?.standard,
      missionTimeHours: analysisSettingsToMissionTimeHours(analysisSettings),
      curvePoints: analysisSettings.chart.curvePoints,
    })
  }, [analysisSettings, project?.standard, sif])
  const compliance = useMemo(
    () => (sif && result ? computeCompliance(sif, result) : null),
    [result, sif],
  )

  // Tabs with their own contextual right panels are responsible for mounting them.
  // This dashboard effect only manages the panels it owns directly.
  useEffect(() => {
    if (activeTab === 'overview' && sif && result && compliance) {
      setRightPanelOverride(
        <OverviewRightPanel
          sif={sif}
          result={result}
          compliance={compliance}
          onSelectTab={setTab}
        />,
      )
      return () => setRightPanelOverride(null)
    } else if (activeTab === 'analysis' && sif) {
      setRightPanelOverride(
        <AnalysisRightPanel
          settings={analysisSettings}
          onChange={setAnalysisSettings}
          onReset={() => setAnalysisSettings(DEFAULT_SIF_ANALYSIS_SETTINGS)}
        />,
      )
      return () => setRightPanelOverride(null)
    } else if (activeTab === 'compliance' && sif && result && compliance) {
      setRightPanelOverride(
        <ComplianceRightPanel
          sif={sif}
          result={result}
          compliance={compliance}
          selectedGapId={selectedComplianceGapId}
          selectedEvidenceId={selectedComplianceEvidenceId}
          onSelectTab={setTab}
          onUpdateAssumptions={(assumptions: SIFAssumption[]) => updateSIF(projectId, sif.id, { assumptions })}
        />,
      )
      return () => setRightPanelOverride(null)
    } else if (activeTab !== 'architecture' && activeTab !== 'prooftest' && activeTab !== 'report') {
      setRightPanelOverride(null)
    }
  }, [
    activeTab,
    analysisSettings,
    compliance,
    projectId,
    result,
    selectedComplianceEvidenceId,
    selectedComplianceGapId,
    setRightPanelOverride,
    setTab,
    sif,
    updateSIF,
  ])

  const overviewMetrics = useMemo(
    () => (sif && result && compliance ? getOverviewMetrics(sif, result, compliance) : null),
    [compliance, result, sif],
  )

  const contributionRows = useMemo<ContributionRow[]>(() => {
    if (!result || !sif) return []

    const totalPFD = Number.isFinite(result.PFD_avg) && result.PFD_avg > 0 ? result.PFD_avg : 0

    return result.subsystems.map((sub, index) => ({
      key: sub.subsystemId,
      label: sif.subsystems[index]?.label ?? sub.type,
      color: getSubsystemColor(sub.type),
      pfd: sub.PFD_avg,
      rrf: sub.RRF,
      sil: sub.SIL,
      contributionPct: totalPFD > 0 && Number.isFinite(sub.PFD_avg)
        ? (sub.PFD_avg / totalPFD) * 100
        : 0,
    }))
  }, [getSubsystemColor, result, sif])

  if (!project || !sif || !result || !compliance || !overviewMetrics) return null

  const contributionTableRows: ContributionRow[] = [
    ...contributionRows,
    {
      key: 'sif-total',
      label: 'SIF',
      color: '#DFE8F1',
      pfd: result.PFD_avg,
      rrf: result.RRF,
      sil: result.SIL,
      contributionPct: 100,
    },
  ]
  const contributionPieRows = contributionRows.filter(row => row.contributionPct > 0)
  const operationalHealth = OPERATIONAL_HEALTH_META[overviewMetrics.operationalHealth]

  // Architecture tab: fills the flex-col card from SIFWorkbenchLayout
  if (activeTab === 'architecture' && sif) {
    return <LoopEditorFlow sif={sif} projectId={projectId} />
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">

        {/* ════ OVERVIEW ════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
              <div className="rounded-xl border p-5" style={{ borderColor: BORDER, background: CARD_BG }}>
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                        Design status
                      </p>
                      <h2 className="text-2xl font-black tracking-tight" style={{ color: TEXT }}>
                        {sif.sifNumber} · {sif.title || 'Untitled SIF'}
                      </h2>
                      <p className="text-sm leading-relaxed" style={{ color: TEXT_DIM }}>
                        {sif.hazardousEvent || 'No hazardous event has been documented yet.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <SILBadge sil={result.SIL} size="md" />
                      <span
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
                        style={{
                          color: result.meetsTarget ? semantic.success : semantic.error,
                          background: result.meetsTarget ? `${semantic.success}14` : `${semantic.error}14`,
                          borderColor: result.meetsTarget ? `${semantic.success}2E` : `${semantic.error}2E`,
                        }}
                      >
                        {result.meetsTarget ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                        {result.meetsTarget ? `Meets SIL ${sif.targetSIL}` : `Below SIL ${sif.targetSIL}`}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { label: 'PFDavg', value: formatPFD(result.PFD_avg), tone: TEXT },
                        { label: 'RRF', value: formatRRF(result.RRF), tone: TEXT },
                        { label: 'Architectures', value: sif.subsystems.map(subsystem => subsystem.architecture).join(' + '), tone: TEAL_DIM, mono: false },
                      ].map(item => (
                        <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_DIM }}>{item.label}</p>
                          <p className={cn('text-sm font-bold', item.mono !== false && 'font-mono')} style={{ color: item.tone }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="hidden shrink-0 xl:block">
                    <SILGauge pfd={result.PFD_avg} size={118} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: BORDER, background: CARD_BG }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                    Attention required
                  </p>
                  <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
                    Priority queue for this SIF
                  </h3>
                </div>

                <div className="space-y-2">
                  {overviewMetrics.actions.slice(0, 3).map((action, index) => (
                    <div key={action.id} className="rounded-lg border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold" style={{ borderColor: BORDER, background: CARD_BG, color: TEAL_DIM }}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold" style={{ color: TEXT }}>{action.title}</p>
                          <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{action.hint}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTab(action.tab)}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                        style={{ borderColor: `${TEAL}55`, background: `${TEAL}12`, color: TEAL_DIM }}
                      >
                        {OVERVIEW_ACTION_CTA[action.tab]}
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {result.subsystems.map((sub, i) => {
                const subsystem = sif.subsystems[i]
                const color = getSubsystemColor(sub.type)

                return (
                  <div key={sub.subsystemId} className="rounded-xl border p-4 space-y-2" style={{ borderColor: BORDER, background: CARD_BG }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold" style={{ color }}>{subsystem?.label}</p>
                        <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{sub.type}</p>
                      </div>
                      <SILBadge sil={sub.SIL} size="sm" />
                    </div>

                    <p className="text-lg font-bold font-mono" style={{ color }}>{formatPFD(sub.PFD_avg)}</p>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      {[
                        { label: 'Arch', value: subsystem?.architecture || '—' },
                        { label: 'SFF', value: formatPct(sub.SFF) },
                        { label: 'DC', value: formatPct(sub.DC) },
                      ].map(item => (
                        <div key={item.label} className="rounded-md border px-2 py-1.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                          <p className="text-[9px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                          <p className="mt-0.5 font-mono font-semibold" style={{ color: TEXT }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] font-mono" style={{ color: TEXT_DIM }}>HFT {sub.HFT} · RRF {formatRRF(sub.RRF)}</p>
                  </div>
                )
              })}
            </div>

            <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: BORDER, background: CARD_BG }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                    Design path
                  </p>
                  <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
                    Safety chain
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                    Process demand to safe state, using the current subsystem sequence.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTab('architecture')} className="h-7 text-xs">
                  Open Loop Editor
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}>
                  Process demand
                </div>
                {sif.subsystems.map((subsystem, index) => (
                  <div key={subsystem.id} className="contents">
                    <ArrowRight size={14} style={{ color: TEXT_DIM }} />
                    <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: PAGE_BG }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{subsystem.type}</p>
                      <p className="text-xs font-semibold" style={{ color: getSubsystemColor(subsystem.type) }}>{subsystem.label || `Subsystem ${index + 1}`}</p>
                      <p className="text-[11px] font-mono" style={{ color: TEXT_DIM }}>{subsystem.architecture}</p>
                    </div>
                  </div>
                ))}
                <ArrowRight size={14} style={{ color: TEXT_DIM }} />
                <div className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: BORDER, background: PAGE_BG, color: TEAL_DIM }}>
                  Safe state
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: BORDER, background: CARD_BG }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                    Operational status
                  </p>
                  <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
                    SIL Live
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                    Current confidence signal from proof test evidence and operational events.
                  </p>
                </div>

                <span
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
                  style={{ color: operationalHealth.color, background: operationalHealth.bg, borderColor: operationalHealth.border }}
                >
                  <operationalHealth.Icon size={11} />
                  {operationalHealth.label}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: 'Operational confidence', value: overviewMetrics.recentCampaigns.length || sif.operationalEvents.length ? `${overviewMetrics.operationalScore}/100` : '—', tone: operationalHealth.color },
                  { label: 'Next proof test', value: overviewMetrics.nextDue ? overviewMetrics.nextDue.toLocaleDateString() : 'Not scheduled', tone: overviewMetrics.isOverdue ? semantic.error : TEXT },
                  { label: 'Bypass / inhibit', value: `${overviewMetrics.bypassHours.toFixed(1)} h`, tone: TEXT },
                  { label: 'Open faults', value: String(overviewMetrics.openFaults), tone: overviewMetrics.openFaults > 0 ? semantic.error : semantic.success },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                    <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: TEXT_DIM }}>{item.label}</p>
                    <p className="mt-1 text-xl font-black font-mono" style={{ color: item.tone }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {overviewMetrics.recentCampaigns.slice(0, 8).map(campaign => {
                    const verdictMeta = campaign.verdict === 'pass'
                      ? { label: 'Pass', color: semantic.success, bg: `${semantic.success}1A` }
                      : campaign.verdict === 'fail'
                        ? { label: 'Fail', color: semantic.error, bg: `${semantic.error}1A` }
                        : { label: 'Conditional', color: semantic.warning, bg: `${semantic.warning}1A` }

                    return (
                      <span
                        key={campaign.id}
                        title={campaign.date}
                        className="inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-bold"
                        style={{ color: verdictMeta.color, borderColor: `${verdictMeta.color}33`, background: verdictMeta.bg }}
                      >
                        {verdictMeta.label}
                      </span>
                    )
                  })}
                  {overviewMetrics.recentCampaigns.length === 0 && (
                    <span className="text-xs" style={{ color: TEXT_DIM }}>No campaigns recorded yet.</span>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={() => setTab('prooftest')} className="h-7 text-xs">
                  Open Proof Test
                </Button>
              </div>
            </div>

            <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: BORDER, background: CARD_BG }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
                    Governance status
                  </p>
                  <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
                    HAZOP / LOPA traceability
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>
                    Audit readiness across context, evidence, assumptions, and HAZOP linkage.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: PAGE_BG }}>
                      <div className="h-full rounded-full" style={{ width: `${overviewMetrics.tracePct}%`, background: TEAL }} />
                    </div>
                    <span className="text-xs font-mono font-semibold" style={{ color: TEXT_DIM }}>{overviewMetrics.tracePct}%</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate({ type: 'hazop' })}>
                    Open HAZOP / LOPA
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: 'Metadata ready', value: `${overviewMetrics.metadataPct}%`, detail: compliance.missingMetadata.length ? `${compliance.missingMetadata.length} fields still missing` : 'All core fields documented', Icon: ClipboardCheck },
                  { label: 'Evidence package', value: `${overviewMetrics.evidenceCompleteCount}/${overviewMetrics.evidenceTotalCount}`, detail: 'Completed evidence items', Icon: ShieldCheck },
                  { label: 'Assumptions to review', value: String(overviewMetrics.pendingAssumptions), detail: `${overviewMetrics.reviewedAssumptions} already validated`, Icon: FileWarning },
                  { label: 'Approval chain', value: `${overviewMetrics.approvalFilledCount}/3`, detail: 'Made / Verified / Approved', Icon: CheckCircle2 },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: TEXT_DIM }}>{item.label}</p>
                        <p className="mt-1 text-xl font-black font-mono" style={{ color: TEAL_DIM }}>{item.value}</p>
                      </div>
                      <item.Icon size={14} style={{ color: TEAL_DIM, flexShrink: 0 }} />
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0" style={{ borderColor: BORDER }}>
                  {[
                    ['HAZOP Node', sif.hazopTrace?.hazopNode || null],
                    ['Scenario ID', sif.hazopTrace?.scenarioId || null],
                    ['Risk Matrix', sif.hazopTrace?.riskMatrix || null],
                    ['LOPA Reference', sif.hazopTrace?.lopaRef || null],
                    ['Initiating Event', sif.hazopTrace?.initiatingEvent || null],
                    ['TMEL [yr⁻¹]', sif.hazopTrace?.tmel ? sif.hazopTrace.tmel.toExponential(2) : null],
                    ['Independent IPLs', sif.hazopTrace?.iplList || null],
                    ['HAZOP Facilitator', sif.hazopTrace?.hazopFacilitator || null],
                    ['HAZOP Date', sif.hazopTrace?.hazopDate || null],
                  ].map(([label, value]) => (
                    <div key={label as string} className="px-4 py-3.5">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: TEXT_DIM }}>{label}</p>
                      {typeof value === 'string' || value === null
                        ? <p className="text-sm font-medium" style={{ color: TEXT }}>{value || <span style={{ color: `${TEXT_DIM}66` }}>—</span>}</p>
                        : value
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ ARCHITECTURE (Loop Editor) ════ */}
        {/* architecture tab handled by early return above */}

        {/* ════ ANALYSIS ════ */}
        {activeTab === 'analysis' && (
          <div className="space-y-5">
            <PFDChart sif={sif} chartData={result.chartData} settings={analysisSettings.chart} />

            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">Subsystem Breakdown</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    {['Subsystem', 'Architecture', 'PFD avg', 'RRF', 'SFF', 'DC', 'HFT', 'SIL'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.subsystems.map((sub, i) => {
                    const subsystem = sif.subsystems[i]
                    const color = getSubsystemColor(sub.type)
                    return (
                      <tr key={sub.subsystemId} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-xs" style={{ color }}>{subsystem?.label}</td>
                        <td className="px-4 py-3 font-mono text-xs">{subsystem?.architecture}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{formatPFD(sub.PFD_avg)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatRRF(sub.RRF)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatPct(sub.SFF)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatPct(sub.DC)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{sub.HFT}</td>
                        <td className="px-4 py-3"><SILBadge sil={sub.SIL} size="sm" /></td>
                      </tr>
                    )
                  })}
                  <tr className="bg-muted/30 font-semibold">
                    <td className="px-4 py-3 text-xs" colSpan={2}>Total SIF (series)</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatPFD(result.PFD_avg)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatRRF(result.RRF)}</td>
                    <td colSpan={3} />
                    <td className="px-4 py-3"><SILBadge sil={result.SIL} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">{analysisSettings.pie.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {analysisSettings.pie.subtitle}
                </p>
              </div>
              <div className="p-5">
                {contributionPieRows.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={contributionPieRows}
                          dataKey="contributionPct"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={analysisSettings.pie.innerRadius}
                          outerRadius={analysisSettings.pie.outerRadius}
                          paddingAngle={2}
                          label={analysisSettings.pie.showLabels
                            ? ({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`
                            : false}
                          labelLine={false}
                        >
                          {contributionPieRows.map(row => (
                            <Cell key={row.key} fill={row.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<ContributionTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {contributionPieRows.map(row => (
                        <div key={row.key} className="rounded-lg border px-3 py-2.5 bg-muted/20">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                            <span className="text-sm font-medium">{row.label}</span>
                          </div>
                          <p className="text-xs font-mono mt-1 text-muted-foreground">
                            {row.contributionPct.toFixed(1)}% · PFD {formatPFD(row.pfd)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    No contribution data available.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold">Contribution Summary</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    {['Element', 'AVG PFD', 'RRF', 'Computed SIL', 'Contribution %'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contributionTableRows.map(row => (
                    <tr key={row.key} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.key !== 'sif-total' && (
                            <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                          )}
                          <span className="font-semibold text-xs">{row.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{formatPFD(row.pfd)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatRRF(row.rrf)}</td>
                      <td className="px-4 py-3"><SILBadge sil={row.sil} size="sm" /></td>
                      <td className="px-4 py-3 font-mono text-xs">{row.contributionPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SIFVerdictBanner sif={sif} result={result} />
          </div>
        )}

        {/* ════ COMPLIANCE ════ */}
        {activeTab === 'compliance' && (
          <ComplianceTab
            sif={sif}
            result={result}
            compliance={compliance}
            onSelectTab={setTab}
            onSelectGap={gapId => {
              setSelectedComplianceEvidenceId(null)
              setSelectedComplianceGapId(gapId)
            }}
            onSelectEvidence={evidenceId => {
              setSelectedComplianceGapId(null)
              setSelectedComplianceEvidenceId(evidenceId)
            }}
          />
        )}

        {/* ════ PROOF TEST ════ */}
        {activeTab === 'prooftest' && (
          <ProofTestTab project={project} sif={sif} />
        )}

        {/* ════ REPORT ════ */}
        {activeTab === 'report' && (
          <SILReportStudio project={project} sif={sif} result={result} />
        )}
    </div>
  )
}
