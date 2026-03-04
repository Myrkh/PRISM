import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, LayoutDashboard, Network, BarChart3, Shield, Gauge, Sparkles, ArrowRight, FileText, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore, type SIFTab } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { SILGauge } from '@/components/shared/SILGauge'
import { SIFChainDiagram } from '@/components/architecture/SIFChainDiagram'
import { ArchitectureBuilder } from '@/components/architecture/ArchitectureBuilder'
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
  const project     = useAppStore(s => s.projects.find(p => p.id === projectId))
  const sif         = project?.sifs.find(s => s.id === sifId)

  const activeTab = view.type === 'sif-dashboard' ? view.tab : 'overview'
  const result    = useMemo(() => sif ? calcSIF(sif) : null, [sif])

  if (!project || !sif || !result) return null

  const TABS: { id: SIFTab; label: string; hint: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Overview', hint: 'Key KPIs & context', icon: LayoutDashboard },
    { id: 'architecture', label: 'Architecture', hint: 'Chain & components', icon: Network },
    { id: 'analysis', label: 'Analysis', hint: 'PFD trends & breakdown', icon: BarChart3 },
    { id: 'compliance', label: 'Compliance', hint: 'Proof & governance', icon: Shield },
    { id: 'report', label: 'Report', hint: 'SIL Pro PDF builder', icon: FileText },
  ]

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

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <div className="border-b bg-card/70">
        <div className="max-w-7xl mx-auto px-6 py-2 grid grid-cols-2 lg:grid-cols-5 gap-2">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={cn(
                'group rounded-xl border px-3 py-2.5 text-left transition-all',
                activeTab === tab.id
                  ? 'border-primary/40 bg-primary/10 shadow-sm'
                  : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/40 hover:text-foreground',
              )}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={cn('h-4 w-4 mt-0.5', activeTab === tab.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                <div>
                  <p className={cn('text-sm font-semibold', activeTab === tab.id ? 'text-primary' : 'text-foreground')}>
                    {tab.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{tab.hint}</p>
                </div>
              </div>
            </button>
          )})}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">

        {/* ════ OVERVIEW ════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* KPI strip */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4">
              {/* Main SIF */}
              <div className={cn(
                'rounded-xl border p-5 flex items-center justify-between gap-4 bg-card',
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
                  <div key={sub.subsystemId} className="rounded-xl border bg-card p-4 space-y-1.5">
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
            <div className="rounded-xl border bg-card p-5">
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
              <SIFChainDiagram sif={sif} projectId={projectId} calcResult={result} />
            </div>

            {/* Metadata */}
            <div className="rounded-xl border bg-card p-5">
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
          </div>
        )}

        {/* ════ ARCHITECTURE ════ */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            {/* Visual chain */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-1">Safety Chain Diagram</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Click any component tag to edit its parameters
              </p>
              <SIFChainDiagram sif={sif} projectId={projectId} calcResult={result} />
            </div>

            {/* Interactive builder */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-1">Architecture Builder</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Add subsystems, change architecture (MooN), add channels and components
              </p>
              <ArchitectureBuilder projectId={projectId} sifId={sifId} />
            </div>
          </div>
        )}

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
              <div className="rounded-xl border bg-card p-5">
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

              <div className="rounded-xl border bg-card p-5">
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

        {/* ════ REPORT ════ */}
        {activeTab === 'report' && (
          <SILReportStudio project={project} sif={sif} result={result} />
        )}
      </div>
    </div>
  )
}
