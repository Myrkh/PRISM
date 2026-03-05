import { useMemo, useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, LayoutDashboard, Network, BarChart3, Shield, Gauge, Sparkles, ArrowRight, FileText, FlaskConical, Activity, Radio, Zap, Clock, Edit3, Save, X, Plus, Minus } from 'lucide-react'
import { ProofTestTab } from '@/components/prooftest/ProofTestTab'
import { Button } from '@/components/ui/button'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { SILGauge } from '@/components/shared/SILGauge'
import { LoopEditorFlow } from '@/components/architecture/LoopEditorFlow'
import { LoopEditorRightPanel } from '@/components/architecture/LoopEditorRightPanel'
import { useLayout } from '@/components/layout/SIFWorkbenchLayout'
import { PFDChart } from '@/components/analysis/PFDChart'
import { SILReportStudio } from '@/components/report/SILReportStudio'
import { calcSIF, formatPFD, formatRRF, formatPct } from '@/core/math/pfdCalc'
import { cn } from '@/lib/utils'

const SUB_COLORS: Record<string, string> = {
  sensor: '#0891B2', logic: '#6366F1', actuator: '#EA580C',
}

interface Props { projectId: string; sifId: string }

export function SIFDashboard({ projectId, sifId }: Props) {
  const view        = useAppStore(s => s.view)
  const setTab      = useAppStore(s => s.setTab)
  const { setRightPanelOverride } = useLayout()
  const project     = useAppStore(s => s.projects.find(p => p.id === projectId))
  const sif         = project?.sifs.find(s => s.id === sifId)

  const activeTab = view.type === 'sif-dashboard' ? view.tab : 'overview'

  // When architecture tab is active → mount LoopEditorRightPanel in the right panel
  useEffect(() => {
    if (activeTab === 'architecture' && sif) {
      setRightPanelOverride(
        <LoopEditorRightPanel sif={sif} projectId={projectId} />
      )
    } else {
      setRightPanelOverride(null)
    }
    return () => { setRightPanelOverride(null) }
  }, [activeTab, sif?.id, projectId])
  const result    = useMemo(() => sif ? calcSIF(sif) : null, [sif])

  // HAZOP edit state (used in Overview)
  const [editingHazop, setEditingHazop] = useState(false)
  const [hazopDraft, setHazopDraft]     = useState<Record<string, any>>(sif?.hazopTrace ?? {
    hazopNode: '', scenarioId: '', deviationCause: '', initiatingEvent: '',
    lopaRef: '', tmel: 0.001, iplList: '', riskMatrix: '', hazopDate: '', lopaDate: '', hazopFacilitator: '',
  })
  const updateHAZOP = useAppStore(s => s.updateHAZOPTrace)

  if (!project || !sif || !result) return null

  const compliance = useMemo(() => {
    const subsystemChecks = result.subsystems.map((sub, i) => {
      const subsystem = sif.subsystems[i]
      const sffReq = sub.HFT === 0 ? 0.6 : 0.9

      const checks = [
        { label: `SFF ≥ ${formatPct(sffReq)}`, value: formatPct(sub.SFF), ok: sub.SFF >= sffReq },
        { label: `HFT ≥ ${sub.SIL >= 2 ? 1 : 0}`, value: String(sub.HFT), ok: sub.HFT >= (sub.SIL >= 2 ? 1 : 0) },
        { label: 'DC ≥ 60 %', value: formatPct(sub.DC), ok: sub.DC >= 0.6 },
        { label: 'Architecture', value: subsystem?.architecture ?? '—', ok: true },
      ]

      return {
        id: sub.subsystemId,
        label: subsystem?.label ?? 'Subsystem',
        type: sub.type,
        sil: sub.SIL,
        checks,
        allOk: checks.every(c => c.ok),
      }
    })

    const totalChecks = subsystemChecks.reduce((acc, sub) => acc + sub.checks.length, 0)
    const passedChecks = subsystemChecks.reduce((acc, sub) => acc + sub.checks.filter(c => c.ok).length, 0)
    const subsystemPassRate = totalChecks ? passedChecks / totalChecks : 0

    const metadataFields = [
      sif.pid,
      sif.location,
      sif.processTag,
      sif.hazardousEvent,
      sif.madeBy,
      sif.verifiedBy,
      sif.approvedBy,
    ]
    const metadataCompletion = metadataFields.filter(Boolean).length / metadataFields.length

    const targetScore = result.meetsTarget ? 1 : 0
    const score = Math.round((targetScore * 45 + subsystemPassRate * 40 + metadataCompletion * 15) * 100) / 100

    const actions: { title: string; hint: string; tab: SIFTab }[] = []

    if (!result.meetsTarget) {
      actions.push({
        title: 'Increase architectural robustness',
        hint: 'Adjust MooN architecture, diagnostics, and proof test interval to reach target SIL.',
        tab: 'architecture',
      })
    }

    if (subsystemChecks.some(sub => sub.checks.some(check => check.label.startsWith('DC') && !check.ok))) {
      actions.push({
        title: 'Improve diagnostic coverage',
        hint: 'Review DC assumptions and improve test strategy in component parameters.',
        tab: 'analysis',
      })
    }

    if (metadataCompletion < 1) {
      actions.push({
        title: 'Complete traceability fields',
        hint: 'Fill P&ID, hazard description, and approver fields for audit readiness.',
        tab: 'overview',
      })
    }

    if (!actions.length) {
      actions.push({
        title: 'Compliance baseline looks solid',
        hint: 'Proceed with independent review and export a report package.',
        tab: 'compliance',
      })
    }

    return {
      subsystemChecks,
      score,
      passedChecks,
      totalChecks,
      metadataCompletion,
      actions: actions.slice(0, 3),
    }
  }, [result, sif])

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
                const color = SUB_COLORS[sub.type] ?? '#6B7280'
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
            <PFDChart sif={sif} chartData={result.chartData} />

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
                    const color = SUB_COLORS[sub.type] ?? '#6B7280'
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
          </div>
        )}

        {/* ════ COMPLIANCE ════ */}
        {activeTab === 'compliance' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
            <div className="rounded-xl border bg-card p-5 dark:bg-[#23292F] dark:border-[#323A43]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Compliance Score</p>
                    <p className="text-3xl font-bold tracking-tight mt-1">{compliance.score}<span className="text-base text-muted-foreground">/100</span></p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {compliance.passedChecks}/{compliance.totalChecks} technical checks passed ·
                      {' '}traceability {Math.round(compliance.metadataCompletion * 100)}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
                    <Gauge className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      compliance.score >= 80 ? 'bg-emerald-500' : compliance.score >= 60 ? 'bg-amber-500' : 'bg-red-500',
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, compliance.score))}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 dark:bg-[#23292F] dark:border-[#323A43]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Next best actions</p>
                </div>
                <div className="space-y-2">
                  {compliance.actions.map(action => (
                    <button
                      key={action.title}
                      type="button"
                      onClick={() => setTab(action.tab)}
                      className="w-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <p className="text-sm font-medium flex items-center justify-between gap-2">
                        {action.title}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {compliance.subsystemChecks.map(sub => {
                const color = SUB_COLORS[sub.type] ?? '#6B7280'
                return (
                  <div key={sub.id}
                    className={cn(
                      'rounded-xl border bg-card overflow-hidden',
                      sub.allOk ? 'border-emerald-200 dark:border-emerald-900' : 'border-red-200 dark:border-red-900',
                    )}
                  >
                    <div className="flex justify-between items-center px-4 py-3 border-b bg-muted/30">
                      <span className="text-sm font-semibold" style={{ color }}>{sub.label}</span>
                      <div className="flex items-center gap-2">
                        <SILBadge sil={sub.sil} size="sm" />
                        {sub.allOk
                          ? <CheckCircle2 size={14} className="text-emerald-500" />
                          : <AlertTriangle size={14} className="text-red-500" />
                        }
                      </div>
                    </div>
                    <div className="divide-y">
                      {sub.checks.map(c => (
                        <div key={c.label} className="flex justify-between items-center px-4 py-2.5">
                          <span className="text-xs text-muted-foreground">{c.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono">{c.value}</span>
                            {c.ok
                              ? <CheckCircle2 size={12} className="text-emerald-500" />
                              : <AlertTriangle size={12} className="text-red-500" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Final verdict */}
            <div className={cn(
              'rounded-xl border p-6 flex items-center justify-between gap-8',
              result.meetsTarget
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
            )}>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Safety Instrumented Function — Low Demand Mode
                </p>
                <p className="text-2xl font-bold font-mono">
                  PFD<sub>avg</sub> = {formatPFD(result.PFD_avg)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.meetsTarget
                    ? `✓ Meets SIL ${sif.targetSIL} requirement`
                    : `✗ Does not meet SIL ${sif.targetSIL} — increase architecture or reduce TI`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Risk Reduction Factor</p>
                <p className="text-2xl font-bold font-mono">RRF = {formatRRF(result.RRF)}</p>
              </div>
              <SILBadge sil={result.SIL} size="lg" />
            </div>

            {/* Methodology footer */}
            <div className="rounded-xl border bg-card px-5 py-4 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Methodology: </strong>
              IEC 61508-6:2010 Annex B (Eq. B.10a, B.11) · β-factor IEC 61508-6 Annex D ·
              SFF IEC 61508-2 §C.3 · HFT IEC 61511-1:2016 Table 6 · Low demand mode (PFD avg) ·
              <span className="text-amber-500"> Not a substitute for a certified safety assessment.</span>
            </div>
          </div>
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