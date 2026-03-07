import { useMemo, useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, FileText, FlaskConical, Activity, Radio, Zap, Edit3, Save, X } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { ProofTestTab } from '@/components/prooftest/ProofTestTab'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { SILGauge } from '@/components/shared/SILGauge'
import { LoopEditorFlow } from '@/components/architecture/LoopEditorFlow'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { PFDChart } from '@/components/analysis/PFDChart'
import { AnalysisRightPanel } from '@/components/analysis/AnalysisRightPanel'
import { ComplianceTab } from '@/components/sif/ComplianceTab'
import { ComplianceRightPanel } from '@/components/sif/ComplianceRightPanel'
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
import type { SILLevel, SIFAssumption } from '@/core/types'
import { cn } from '@/lib/utils'
import { BORDER, TEXT_DIM } from '@/styles/tokens'

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

interface Props { projectId: string; sifId: string }

export function SIFDashboard({ projectId, sifId }: Props) {
  const view        = useAppStore(s => s.view)
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
    if (activeTab === 'analysis' && sif) {
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

  // HAZOP edit state (used in Overview)
  const [editingHazop, setEditingHazop] = useState(false)
  const [hazopDraft, setHazopDraft]     = useState<Record<string, any>>(sif?.hazopTrace ?? {
    hazopNode: '', scenarioId: '', deviationCause: '', initiatingEvent: '',
    lopaRef: '', tmel: 0.001, iplList: '', riskMatrix: '', hazopDate: '', lopaDate: '', hazopFacilitator: '',
  })
  const updateHAZOP = useAppStore(s => s.updateHAZOPTrace)

  if (!project || !sif || !result || !compliance) return null
  const contributionRows = useMemo<ContributionRow[]>(() => {
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

  // Architecture tab: fills the flex-col card from SIFWorkbenchLayout
  if (activeTab === 'architecture' && sif) {
    return <LoopEditorFlow sif={sif} projectId={projectId} />
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">

        {/* ════ OVERVIEW ════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="rounded-b-xl space-y-5">
            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-4">
              {/* Main SIF */}
              <div className={cn(
                'col-span-3 rounded-xl border p-5 flex items-center justify-between gap-4 bg-card dark:bg-[#23292F] dark:border-[#323A43]',
                result.meetsTarget
                  ? 'border-emerald-200 dark:border-emerald-900'
                  : 'border-red-200 dark:border-red-900',
              )}>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total SIF — PFD avg
                  </p>
                  <p className="text-3xl font-bold font-mono tracking-tight">
                    {formatPFD(result.PFD_avg)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    RRF = {formatRRF(result.RRF)} · {sif.subsystems.map(s => s.architecture).join(' + ')}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <SILBadge sil={result.SIL} size="md" />
                    {result.meetsTarget
                      ? <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 size={11}/> Meets SIL {sif.targetSIL} target</span>
                      : <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={11}/> Below SIL {sif.targetSIL} target</span>
                    }
                  </div>
                </div>
                <SILGauge pfd={result.PFD_avg} size={110} />
              </div>

              {/* Per-subsystem KPIs */}
              {result.subsystems.map((sub, i) => {
                const subsystem = sif.subsystems[i]
                const color = getSubsystemColor(sub.type)
                return (
                  <div key={sub.subsystemId} className="rounded-xl border bg-card p-4 space-y-1.5 dark:bg-[#23292F] dark:border-[#323A43]">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold" style={{ color }}>{subsystem?.label}</span>
                      <SILBadge sil={sub.SIL} size="sm" />
                    </div>
                    <p className="text-lg font-bold font-mono" style={{ color }}>
                      {formatPFD(sub.PFD_avg)}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {subsystem?.architecture} · SFF {formatPct(sub.SFF)}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      DC {formatPct(sub.DC)} · HFT {sub.HFT}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* SIF Chain diagram */}
            <div className="rounded-xl border bg-card p-5 dark:bg-[#23292F] dark:border-[#323A43]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Safety Chain</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Process demand → Sensor(s) → Logic → Actuator(s) → Safe state
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTab('architecture')} className="text-xs h-7">
                  Edit architecture →
                </Button>
              </div>
              {/* Chain summary — click to go to Loop Editor */}
              <div className="rounded-lg border p-4 text-center cursor-pointer hover:bg-muted/10 transition-colors" onClick={() => setTab('architecture')} style={{ borderColor: '#2A3138', background: '#1D232A' }}>
                <p className="text-xs text-muted-foreground mb-2">Diagramme de la chaîne de sécurité</p>
                <p className="text-sm font-semibold" style={{ color: '#009BA4' }}>Ouvrir l'éditeur Loop Editor →</p>
              </div>
            </div>
            </div>

            {/* Metadata */}
            <div className="rounded-xl border bg-card p-5 dark:bg-[#23292F] dark:border-[#323A43]">
              <h3 className="text-sm font-semibold mb-4">SIF Identification</h3>
              <div className="grid grid-cols-3 gap-x-8 gap-y-3">
                {[
                  ['P&ID', sif.pid],
                  ['Location', sif.location],
                  ['Process tag', sif.processTag],
                  ['Demand rate', sif.demandRate ? `${sif.demandRate} yr⁻¹` : ''],
                  ['Required RRF', sif.rrfRequired?.toString() ?? ''],
                  ['Hazardous event', sif.hazardousEvent],
                  ['Made by', sif.madeBy],
                  ['Verified by', sif.verifiedBy],
                  ['Approved by', sif.approvedBy],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm">{value || <span className="text-muted-foreground/40">—</span>}</p>
                  </div>
                ))}
              </div>
            </div>
          
          {/* ─ SIL Live ─ */}
          {(() => {
            const campaigns = (sif.testCampaigns ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
            const events = sif.operationalEvents ?? []
            const lastC = campaigns[0]
            const proc = sif.proofTestProcedure
            const periodicityMs = (proc?.periodicityMonths ?? 12) * 30.44 * 24 * 3600000
            const nextDue = lastC ? new Date(new Date(lastC.date).getTime() + periodicityMs) : null
            const isOverdue = nextDue ? nextDue < new Date() : false
            const bypassHours = events
              .filter(e => e.type === 'bypass' || e.type === 'inhibit' || e.type === 'override')
              .reduce((acc, e) => acc + (e.duration ?? 0), 0)
            const openFaults = events.filter(e => e.type === 'fault_detected' && !e.resolvedDate).length
            const failCount = campaigns.filter(c => c.verdict === 'fail').length
            const conditionalCount = campaigns.filter(c => c.verdict === 'conditional').length
            const score = Math.max(0, Math.min(100,
              100
              - (isOverdue ? 30 : 0)
              - failCount * 20
              - conditionalCount * 8
              - Math.min(20, openFaults * 10)
              - Math.min(15, Math.round(bypassHours / 8))
            ))

            const liveStatus = score >= 85 ? 'nominal' : score >= 65 ? 'watch' : score > 0 ? 'critical' : 'unknown'
            const statusMeta = {
              nominal: { label: 'Operational SIL confidence — Healthy', color: '#16A34A', bg: '#F0FDF4', borderColor: '#BBF7D0' },
              watch: { label: 'Operational SIL confidence — Watch list', color: '#D97706', bg: '#FFFBEB', borderColor: '#FDE68A' },
              critical: { label: 'Operational SIL confidence — Action required', color: '#DC2626', bg: '#FEF2F2', borderColor: '#FECACA' },
              unknown: { label: 'Operational SIL confidence — No data', color: '#6B7280', bg: '#F9FAFB', borderColor: '#E5E7EB' },
            }
            const sm = statusMeta[liveStatus]

            return (
              <div>
                <div className="flex items-baseline gap-2.5 mb-3">
                  <span className="text-xs font-mono font-bold text-primary/50">04</span>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">SIL Live — Operational Status</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Operational confidence score from proof tests + field events</p>
                  </div>
                </div>
                <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: sm.borderColor }}>
                  <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold" style={{ background: sm.bg, color: sm.color }}>
                    <Radio size={12} />
                    {sm.label}
                  </div>
                  <div className="grid grid-cols-4 gap-3 p-4 bg-card">
                    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Design SIL</p>
                      <p className="text-xl font-black font-mono text-blue-600">SIL {sif.targetSIL}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Operational confidence</p>
                      <p className="text-xl font-black font-mono" style={{ color: sm.color }}>{campaigns.length ? `${score}/100` : '—'}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bypass/inhibit exposure</p>
                      <p className="text-xl font-black font-mono">{bypassHours.toFixed(1)} h</p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Open faults</p>
                      <p className={cn('text-xl font-black font-mono', openFaults > 0 ? 'text-red-500' : 'text-emerald-500')}>
                        {openFaults}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 pb-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex gap-1 flex-wrap">
                      {campaigns.slice(0, 8).map(c => (
                        <span key={c.id} title={c.date} className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                          style={{
                            background: c.verdict === 'pass' ? '#F0FDF4' : c.verdict === 'fail' ? '#FEF2F2' : '#FFFBEB',
                            color: c.verdict === 'pass' ? '#16A34A' : c.verdict === 'fail' ? '#DC2626' : '#D97706',
                            border: `1px solid ${c.verdict === 'pass' ? '#BBF7D0' : c.verdict === 'fail' ? '#FECACA' : '#FDE68A'}`,
                          }}
                        >
                          {c.verdict === 'pass' ? '✓' : c.verdict === 'fail' ? '✗' : '!'}
                        </span>
                      ))}
                      {campaigns.length === 0 && <span>No campaigns recorded</span>}
                    </div>
                    {nextDue && (
                      <p>
                        Next due: <span className={isOverdue ? 'text-red-500 font-semibold' : 'font-semibold'}>{nextDue.toLocaleDateString()}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ─ HAZOP/LOPA Traceability ─ */}
          {(() => {
            const trace = sif.hazopTrace
            const fields = [trace?.hazopNode, trace?.scenarioId, trace?.lopaRef, trace?.initiatingEvent, trace?.iplList, trace?.hazopFacilitator]
            const tracePct = Math.round(fields.filter(Boolean).length / fields.length * 100)

            return (
              <div>
                <div className="flex items-end justify-between gap-4 mb-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-xs font-mono font-bold text-primary/50">05</span>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight">HAZOP / LOPA Traceability</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Causal chain: HAZOP scenario → LOPA → SIF justification</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${tracePct}%` }} />
                      </div>
                      <span className="text-xs font-mono font-semibold text-muted-foreground">{tracePct}%</span>
                    </div>
                    {editingHazop ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingHazop(false)}>
                          <X size={11} className="mr-1" /> Cancel
                        </Button>
                        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => { updateHAZOP(project.id, sif.id, hazopDraft as any); setEditingHazop(false) }}>
                          <Save size={11} /> Save
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => { setHazopDraft(sif.hazopTrace ?? hazopDraft); setEditingHazop(true) }}>
                        <Edit3 size={11} /> Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="grid grid-cols-3 divide-x divide-y">
                    {[
                      ['HAZOP Node',           editingHazop ? <input className="w-full bg-transparent text-sm outline-none border-b border-primary/30 pb-0.5" value={hazopDraft.hazopNode} onChange={e => setHazopDraft(d => ({ ...d, hazopNode: e.target.value }))} /> : (trace?.hazopNode || null)],
                      ['Scenario ID',          editingHazop ? <input className="w-full bg-transparent text-sm outline-none border-b border-primary/30 pb-0.5" value={hazopDraft.scenarioId} onChange={e => setHazopDraft(d => ({ ...d, scenarioId: e.target.value }))} /> : (trace?.scenarioId || null)],
                      ['Risk Matrix',          editingHazop ? <input className="w-full bg-transparent text-sm outline-none border-b border-primary/30 pb-0.5" placeholder="e.g. 4C" value={hazopDraft.riskMatrix} onChange={e => setHazopDraft(d => ({ ...d, riskMatrix: e.target.value }))} /> : (trace?.riskMatrix || null)],
                      ['LOPA Reference',       editingHazop ? <input className="w-full bg-transparent text-sm outline-none border-b border-primary/30 pb-0.5" value={hazopDraft.lopaRef} onChange={e => setHazopDraft(d => ({ ...d, lopaRef: e.target.value }))} /> : (trace?.lopaRef || null)],
                      ['Initiating Event',     editingHazop ? <input className="w-full bg-transparent text-sm outline-none border-b border-primary/30 pb-0.5" value={hazopDraft.initiatingEvent} onChange={e => setHazopDraft(d => ({ ...d, initiatingEvent: e.target.value }))} /> : (trace?.initiatingEvent || null)],
                      ['TMEL [yr⁻¹]',         editingHazop ? <input type="number" step="0.0001" className="w-full bg-transparent text-sm font-mono outline-none border-b border-primary/30 pb-0.5" value={hazopDraft.tmel} onChange={e => setHazopDraft(d => ({ ...d, tmel: +e.target.value }))} /> : (trace?.tmel?.toExponential(2) || null)],
                      ['Independent IPLs',     editingHazop ? <input className="w-full bg-transparent text-sm outline-none border-b border-primary/30 pb-0.5" placeholder="e.g. BPCS, PSV-101" value={hazopDraft.iplList} onChange={e => setHazopDraft(d => ({ ...d, iplList: e.target.value }))} /> : (trace?.iplList || null)],
                      ['HAZOP Facilitator',    editingHazop ? <input className="w-full bg-transparent text-sm outline-none border-b border-primary/30 pb-0.5" value={hazopDraft.hazopFacilitator} onChange={e => setHazopDraft(d => ({ ...d, hazopFacilitator: e.target.value }))} /> : (trace?.hazopFacilitator || null)],
                      ['HAZOP Date',           editingHazop ? <input type="date" className="w-full bg-transparent text-sm font-mono outline-none border-b border-primary/30 pb-0.5" value={hazopDraft.hazopDate} onChange={e => setHazopDraft(d => ({ ...d, hazopDate: e.target.value }))} /> : (trace?.hazopDate || null)],
                    ].map(([label, value]) => (
                      <div key={label as string} className="px-4 py-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">{label}</p>
                        {typeof value === 'string' || value === null
                          ? <p className="text-sm font-medium">{value || <span className="text-muted-foreground/30 font-normal">—</span>}</p>
                          : value
                        }
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
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
