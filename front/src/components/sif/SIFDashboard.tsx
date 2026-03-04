import { useMemo } from 'react'
import {
  CheckCircle2, AlertTriangle, LayoutDashboard, Network,
  BarChart3, Shield, FileText, ArrowRight, Sparkles,
  type LucideIcon, TrendingDown, Activity, Info, Pencil,
} from 'lucide-react'
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

// ─── Shared primitives ────────────────────────────────────────────────────

function Section({ number, title, subtitle, action, children }: {
  number?: string; title: string; subtitle?: string
  action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2.5">
          {number && <span className="text-xs font-mono font-bold text-primary/50 shrink-0">{number}</span>}
          <div>
            <h2 className="text-sm font-bold tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Metric({ label, value, sub, color, mono = true }: {
  label: string; value: string; sub?: string; color?: string; mono?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-xl font-bold leading-none', mono && 'font-mono')} style={color ? { color } : undefined}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1 font-mono">{sub}</p>}
    </div>
  )
}

function HDivider({ accent }: { accent?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      {accent && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function VDivider() {
  return <div className="h-10 w-px bg-border mx-5 shrink-0" />
}

function MethodologyNote() {
  return (
    <div className="rounded-xl border bg-muted/20 px-5 py-4 text-xs text-muted-foreground leading-relaxed flex gap-2.5">
      <Info size={13} className="shrink-0 mt-0.5 text-muted-foreground/60" />
      <span>
        <strong className="text-foreground">Methodology: </strong>
        IEC 61508-6:2010 Annex B (Eq. B.10a, B.11) · SFF per IEC 61508-2 §C.3 ·
        HFT per IEC 61511-1:2016 Table 6 · β-factor CCF per IEC 61508-6 Annex D ·
        Low demand mode · Series model for total SIF PFD.
        <span className="text-amber-500 ml-1">Not a substitute for a certified safety assessment.</span>
      </span>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────

export function SIFDashboard({ projectId, sifId }: Props) {
  const view        = useAppStore(s => s.view)
  const setTab      = useAppStore(s => s.setTab)
  const openEditSIF = useAppStore(s => s.openEditSIF)
  const project     = useAppStore(s => s.projects.find(p => p.id === projectId))
  const sif         = project?.sifs.find(s => s.id === sifId)

  const activeTab = view.type === 'sif-dashboard' ? view.tab : 'overview'
  const result    = useMemo(() => sif ? calcSIF(sif) : null, [sif])

  const TABS: { id: SIFTab; label: string; hint: string; icon: LucideIcon }[] = [
    { id: 'overview',     label: 'Overview',     hint: 'KPIs & context',       icon: LayoutDashboard },
    { id: 'architecture', label: 'Architecture', hint: 'Chain & components',   icon: Network },
    { id: 'analysis',     label: 'Analysis',     hint: 'PFD trends & metrics', icon: BarChart3 },
    { id: 'compliance',   label: 'Compliance',   hint: 'Checks & governance',  icon: Shield },
    { id: 'report',       label: 'Report',       hint: 'Pro PDF export',       icon: FileText },
  ]

  const compliance = useMemo(() => {
    if (!result || !sif) return null
    const subsystemChecks = result.subsystems.map((sub, i) => {
      const subsystem = sif.subsystems[i]
      const sffReq    = sub.HFT === 0 ? 0.6 : 0.9
      const checks = [
        { label: `SFF ≥ ${formatPct(sffReq)}`,   ref: 'IEC 61508-2 §C.3',   value: formatPct(sub.SFF),      ok: sub.SFF >= sffReq },
        { label: `HFT ≥ ${sub.SIL >= 2 ? 1 : 0}`, ref: 'IEC 61511-1 Table 6', value: String(sub.HFT),        ok: sub.HFT >= (sub.SIL >= 2 ? 1 : 0) },
        { label: 'DC dangerous ≥ 60 %',            ref: 'IEC 61508-2 §C.3',   value: formatPct(sub.DC),      ok: sub.DC >= 0.6 },
        { label: 'PFDavg within SIL band',         ref: 'IEC 61511-1 §11',    value: formatPFD(sub.PFD_avg), ok: sub.SIL > 0 },
      ]
      return {
        id: sub.subsystemId, label: subsystem?.label ?? 'Subsystem',
        type: sub.type, sil: sub.SIL, architecture: subsystem?.architecture ?? '—',
        checks, allOk: checks.every(c => c.ok),
      }
    })
    const total    = subsystemChecks.reduce((a, s) => a + s.checks.length, 0)
    const passed   = subsystemChecks.reduce((a, s) => a + s.checks.filter(c => c.ok).length, 0)
    const metaFlds = [sif.pid, sif.location, sif.processTag, sif.hazardousEvent, sif.madeBy, sif.verifiedBy, sif.approvedBy]
    const metaPct  = metaFlds.filter(Boolean).length / metaFlds.length
    const score    = Math.round((result.meetsTarget ? 45 : 0) + (passed / total) * 40 + metaPct * 15)

    const actions: { title: string; hint: string; tab: SIFTab }[] = []
    if (!result.meetsTarget) actions.push({ title: 'Increase architectural robustness', hint: 'Adjust MooN architecture, DC, or proof test interval T1.', tab: 'architecture' })
    if (subsystemChecks.some(s => s.checks.some(c => !c.ok && c.label.includes('DC')))) actions.push({ title: 'Improve diagnostic coverage', hint: 'Review DC assumptions and test strategy in component parameters.', tab: 'analysis' })
    if (metaPct < 1) actions.push({ title: 'Complete traceability fields', hint: 'Fill P&ID, hazard description, and approver for audit readiness.', tab: 'overview' })
    if (!actions.length) actions.push({ title: 'All checks passed — ready for review', hint: 'Export the verification report and proceed to independent review.', tab: 'report' })

    return { subsystemChecks, score, passed, total, metaPct, actions: actions.slice(0, 3) }
  }, [result, sif])

  if (!project || !sif || !result) return null

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">

      {/* ── Tab bar ── */}
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
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', activeTab === tab.id ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="min-w-0">
                    <p className={cn('text-sm font-semibold', activeTab === tab.id ? 'text-primary' : 'text-foreground')}>{tab.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{tab.hint}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-7 space-y-8">

        {/* ══════════════════ OVERVIEW ══════════════════ */}
        {activeTab === 'overview' && (<>

          <Section number="01" title="SIL Verification Result"
            subtitle={`${sif.sifNumber} · ${sif.title || 'Untitled'} · ${sif.status.replace('_', ' ')}`}
            action={
              <Button variant="outline" size="sm" onClick={() => openEditSIF(sif.id)} className="h-7 text-xs gap-1.5">
                <Pencil size={11} /> Edit SIF
              </Button>
            }
          >
            <div className="rounded-2xl border-2 bg-card overflow-hidden"
              style={{ borderColor: result.meetsTarget ? '#BBF7D0' : '#FECACA' }}
            >
              <div className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold border-b"
                style={{ background: result.meetsTarget ? '#F0FDF4' : '#FEF2F2', color: result.meetsTarget ? '#15803D' : '#DC2626' }}
              >
                {result.meetsTarget
                  ? <><CheckCircle2 size={13} /> SIL {sif.targetSIL} target is met</>
                  : <><AlertTriangle size={13} /> SIL {sif.targetSIL} target is NOT met — review architecture</>
                }
              </div>

              {/* Main metrics */}
              <div className="flex items-center px-6 py-5 gap-0">
                <Metric label="PFDavg" value={formatPFD(result.PFD_avg)}
                  sub={`SIL ${result.SIL} · ${result.SIL > 0 ? `<10⁻${result.SIL}` : 'out of range'}`} />
                <VDivider />
                <Metric label="Risk Reduction Factor" value={formatRRF(result.RRF)}
                  sub={`Required: ${sif.rrfRequired ?? '—'}`} />
                <VDivider />
                <Metric label="Architecture" value={sif.subsystems.map(s => s.architecture).join(' + ') || '—'} mono={false} />
                <VDivider />
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">SIL result</p>
                  <SILGauge pfd={result.PFD_avg} size={80} />
                </div>
              </div>

              {/* Subsystem strip */}
              <div className="grid grid-cols-3 divide-x border-t">
                {result.subsystems.map((sub, i) => {
                  const subsystem = sif.subsystems[i]
                  const color = SUB_COLORS[sub.type] ?? '#6B7280'
                  return (
                    <div key={sub.subsystemId} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color }}>{subsystem?.label}</span>
                        <SILBadge sil={sub.SIL} size="sm" />
                      </div>
                      <p className="text-base font-bold font-mono" style={{ color }}>{formatPFD(sub.PFD_avg)}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] font-mono text-muted-foreground">
                        <span>{subsystem?.architecture}</span>
                        <span>SFF {formatPct(sub.SFF)}</span>
                        <span>DC {formatPct(sub.DC)}</span>
                        <span>HFT {sub.HFT}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Section>

          <Section number="02" title="Safety Chain"
            subtitle="Process demand → Sensor(s) → Logic Solver → Actuator(s) → Safe state"
            action={
              <Button variant="outline" size="sm" onClick={() => setTab('architecture')} className="h-7 text-xs gap-1.5">
                <Network size={11} /> Edit architecture
              </Button>
            }
          >
            <div className="rounded-xl border bg-card p-5">
              <SIFChainDiagram sif={sif} projectId={projectId} calcResult={result} />
            </div>
          </Section>

          <Section number="03" title="SIF Identification" subtitle="Process context and traceability">
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-y">
                {[
                  ['P&ID',            sif.pid],
                  ['Location',        sif.location],
                  ['Process tag',     sif.processTag],
                  ['Hazardous event', sif.hazardousEvent],
                  ['Demand rate',     sif.demandRate ? `${sif.demandRate} yr⁻¹` : ''],
                  ['Required RRF',    sif.rrfRequired?.toString() ?? ''],
                  ['Made by',         sif.madeBy],
                  ['Verified by',     sif.verifiedBy],
                  ['Approved by',     sif.approvedBy],
                ].map(([label, value]) => (
                  <div key={label as string} className="px-4 py-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-medium">{value || <span className="text-muted-foreground/30 font-normal">—</span>}</p>
                  </div>
                ))}
              </div>
              {/* Completion bar */}
              {(() => {
                const flds = [sif.pid, sif.location, sif.processTag, sif.hazardousEvent, sif.madeBy, sif.verifiedBy, sif.approvedBy]
                const pct  = Math.round(flds.filter(Boolean).length / flds.length * 100)
                return (
                  <div className="border-t px-4 py-3 flex items-center justify-between gap-4 bg-muted/10">
                    <p className="text-xs text-muted-foreground">Traceability completion</p>
                    <div className="flex items-center gap-3">
                      <div className="w-40 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-mono font-semibold">{pct}%</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </Section>

        </>)}

        {/* ══════════════════ ARCHITECTURE ══════════════════ */}
        {activeTab === 'architecture' && (<>

          <Section number="01" title="Safety Chain Diagram"
            subtitle="Visual representation of the SIF — click any component tag to edit its parameters"
          >
            <div className="rounded-xl border bg-card p-5">
              <SIFChainDiagram sif={sif} projectId={projectId} calcResult={result} />
            </div>
          </Section>

          <HDivider accent="#6366F1" />

          <Section number="02" title="Architecture Builder"
            subtitle="Add subsystems, change MooN voting logic, manage channels and components"
          >
            <div className="rounded-xl border bg-card p-5">
              <ArchitectureBuilder projectId={projectId} sifId={sifId} />
            </div>
          </Section>

        </>)}

        {/* ══════════════════ ANALYSIS ══════════════════ */}
        {activeTab === 'analysis' && (<>

          <Section number="01" title="PFD Degradation — Sawtooth Pattern"
            subtitle="PFDavg over proof test cycles · IEC 61511 §11 · Logarithmic scale"
          >
            <div className="rounded-xl border bg-card p-5">
              <PFDChart sif={sif} chartData={result.chartData} />
            </div>
          </Section>

          <HDivider />

          <Section number="02" title="Subsystem Breakdown"
            subtitle="Per-subsystem PFD, reliability metrics, and SIL contribution"
          >
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    {['Subsystem', 'Architecture', 'PFDavg', 'RRF', 'SFF', 'DC', 'HFT', 'SIL'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.subsystems.map((sub, i) => {
                    const subsystem = sif.subsystems[i]
                    const color = SUB_COLORS[sub.type] ?? '#6B7280'
                    return (
                      <tr key={sub.subsystemId} className="border-b hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 rounded-full shrink-0" style={{ background: color }} />
                            <span className="font-semibold text-xs" style={{ color }}>{subsystem?.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{subsystem?.architecture}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold">{formatPFD(sub.PFD_avg)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatRRF(sub.RRF)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, sub.SFF * 100)}%` }} />
                            </div>
                            <span className="font-mono text-xs">{formatPct(sub.SFF)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={cn('h-full rounded-full', sub.DC >= 0.6 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${Math.min(100, sub.DC * 100)}%` }} />
                            </div>
                            <span className="font-mono text-xs">{formatPct(sub.DC)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{sub.HFT}</td>
                        <td className="px-4 py-3"><SILBadge sil={sub.SIL} size="sm" /></td>
                      </tr>
                    )
                  })}
                  <tr className="bg-muted/25 font-bold">
                    <td className="px-4 py-3 text-xs" colSpan={2}>
                      <div className="flex items-center gap-2">
                        <TrendingDown size={13} className="text-muted-foreground" />
                        Total SIF (series model)
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatPFD(result.PFD_avg)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatRRF(result.RRF)}</td>
                    <td colSpan={3} />
                    <td className="px-4 py-3"><SILBadge sil={result.SIL} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <HDivider />

          <Section number="03" title="Component Parameters"
            subtitle="Failure rates, diagnostic coverage and test intervals per component"
          >
            <div className="space-y-3">
              {result.subsystems.map((sub, i) => {
                const subsystem = sif.subsystems[i]
                const color     = SUB_COLORS[sub.type] ?? '#6B7280'
                const comps     = subsystem?.channels.flatMap(ch => ch.components) ?? []
                if (!comps.length) return null
                return (
                  <div key={sub.subsystemId} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: `${color}08` }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs font-bold" style={{ color }}>{subsystem?.label}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${color}18`, color }}>
                          {subsystem?.architecture}
                        </span>
                      </div>
                      <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
                        <span>PFD {formatPFD(sub.PFD_avg)}</span>
                        <span>SFF {formatPct(sub.SFF)}</span>
                        <span>DC {formatPct(sub.DC)}</span>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/10">
                          {['Tag', 'Type', 'λ (×10⁻⁶ h⁻¹)', 'DCd', 'T1', 'MTTR', 'SFF', 'DC', 'PFD'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sub.components.map((comp, ci) => {
                          const raw = comps[ci]
                          return (
                            <tr key={comp.componentId} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-2.5 font-mono font-semibold" style={{ color }}>{raw?.tagName}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{raw?.instrumentType || '—'}</td>
                              <td className="px-4 py-2.5 font-mono">{raw?.factorized.lambda.toFixed(2)}</td>
                              <td className="px-4 py-2.5 font-mono">{((raw?.factorized.DCd ?? 0) * 100).toFixed(0)}%</td>
                              <td className="px-4 py-2.5 font-mono">{raw?.test.T1} {raw?.test.T1Unit}</td>
                              <td className="px-4 py-2.5 font-mono">{raw?.advanced.MTTR} h</td>
                              <td className="px-4 py-2.5 font-mono">{formatPct(comp.SFF)}</td>
                              <td className="px-4 py-2.5 font-mono">{formatPct(comp.DC)}</td>
                              <td className="px-4 py-2.5 font-mono font-bold">{formatPFD(comp.PFD_avg)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </Section>

          <MethodologyNote />

        </>)}

        {/* ══════════════════ COMPLIANCE ══════════════════ */}
        {activeTab === 'compliance' && compliance && (<>

          <Section number="01" title="Compliance Score"
            subtitle="Weighted: 45% SIL result · 40% technical checks · 15% traceability"
          >
            <div className="grid grid-cols-[1.4fr_1fr] gap-4">
              {/* Score */}
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-end gap-5 mb-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Overall</p>
                    <div className="flex items-baseline gap-1">
                      <span className={cn('text-5xl font-black font-mono',
                        compliance.score >= 80 ? 'text-emerald-500' : compliance.score >= 60 ? 'text-amber-500' : 'text-red-500'
                      )}>{compliance.score}</span>
                      <span className="text-xl text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 pb-1">
                    {[
                      { label: 'SIL result',   pct: result.meetsTarget ? 100 : 0,                                       color: result.meetsTarget ? 'bg-emerald-500' : 'bg-red-400', weight: '45%' },
                      { label: 'Tech. checks', pct: Math.round(compliance.passed / compliance.total * 100),              color: 'bg-blue-500',   weight: '40%' },
                      { label: 'Traceability', pct: Math.round(compliance.metaPct * 100),                               color: 'bg-violet-500', weight: '15%' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-2 text-[10px]">
                        <span className="w-16 text-muted-foreground shrink-0">{row.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', row.color)} style={{ width: `${row.pct}%` }} />
                        </div>
                        <span className="w-6 text-right font-mono text-muted-foreground/60">{row.weight}</span>
                        <span className="w-8 text-right font-mono font-semibold">{row.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {compliance.passed}/{compliance.total} checks passed ·
                  traceability {Math.round(compliance.metaPct * 100)}% complete
                </p>
              </div>

              {/* Actions */}
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} className="text-primary" />
                  <p className="text-sm font-semibold">Recommended actions</p>
                </div>
                <div className="space-y-2">
                  {compliance.actions.map(action => (
                    <button key={action.title} type="button" onClick={() => setTab(action.tab)}
                      className="w-full rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-left hover:bg-muted/30 hover:border-border transition-all group"
                    >
                      <p className="text-xs font-semibold flex items-center justify-between gap-2">
                        {action.title}
                        <ArrowRight size={11} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{action.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <HDivider />

          <Section number="02" title="Technical Compliance Checks"
            subtitle="Per IEC 61511-1:2016 Table 6 and IEC 61508-2:2010 §C.3"
          >
            <div className="grid grid-cols-3 gap-4">
              {compliance.subsystemChecks.map(sub => {
                const color = SUB_COLORS[sub.type] ?? '#6B7280'
                return (
                  <div key={sub.id} className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b" style={{ background: `${color}08` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold" style={{ color }}>{sub.label}</span>
                        <div className="flex items-center gap-1.5">
                          <SILBadge sil={sub.sil} size="sm" />
                          {sub.allOk
                            ? <CheckCircle2 size={13} className="text-emerald-500" />
                            : <AlertTriangle size={13} className="text-red-400" />
                          }
                        </div>
                      </div>
                      <span className="font-mono text-[10px]" style={{ color, opacity: 0.7 }}>{sub.architecture}</span>
                    </div>
                    <div>
                      {sub.checks.map(c => (
                        <div key={c.label} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                            <p className="text-[9px] text-muted-foreground/40 truncate">{c.ref}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-mono font-semibold">{c.value}</span>
                            <span className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                              c.ok
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                            )}>
                              {c.ok ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          <HDivider />

          <Section number="03" title="Final Verdict"
            subtitle="IEC 61511 Safety Instrumented Function — Low Demand Mode"
          >
            <div className="rounded-2xl border-2 overflow-hidden"
              style={{ borderColor: result.meetsTarget ? '#BBF7D0' : '#FECACA' }}
            >
              <div className="flex items-center gap-2 px-6 py-3 text-sm font-bold border-b"
                style={{ background: result.meetsTarget ? '#F0FDF4' : '#FEF2F2', color: result.meetsTarget ? '#15803D' : '#DC2626' }}
              >
                {result.meetsTarget
                  ? <><CheckCircle2 size={15} /> SIL {sif.targetSIL} requirement is met</>
                  : <><AlertTriangle size={15} /> SIL {sif.targetSIL} requirement is NOT met</>
                }
              </div>
              <div className="flex items-center px-6 py-5 gap-0 bg-card">
                <Metric label="PFDavg" value={formatPFD(result.PFD_avg)}
                  sub={result.meetsTarget ? `✓ Meets SIL ${sif.targetSIL}` : `✗ Below SIL ${sif.targetSIL}`} />
                <VDivider />
                <Metric label="Achieved RRF" value={formatRRF(result.RRF)} sub={`Required: ${sif.rrfRequired ?? '—'}`} />
                <VDivider />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Calculated SIL</p>
                  <SILBadge sil={result.SIL} size="lg" />
                </div>
                <VDivider />
                <div>
                  {result.meetsTarget
                    ? <Button size="sm" onClick={() => setTab('report')} className="gap-1.5"><FileText size={13}/> Export report</Button>
                    : <Button size="sm" variant="outline" onClick={() => setTab('architecture')} className="gap-1.5"><Network size={13}/> Fix architecture</Button>
                  }
                </div>
              </div>
            </div>
          </Section>

          <MethodologyNote />

        </>)}

        {/* ══════════════════ REPORT ══════════════════ */}
        {activeTab === 'report' && (
          <SILReportStudio project={project} sif={sif} result={result} />
        )}

      </div>
    </div>
  )
}