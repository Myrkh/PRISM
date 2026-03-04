/**
 * ProofTestTab — full proof test module
 *
 * Three sub-views via a top mini-nav:
 *  1. Procedure  — SOP editor with phase-grouped steps + signatures
 *  2. Campaigns  — Field test log with inline form
 *  3. Performance — Trend charts (SIF response + valve reaction) with tolerance bands
 */
import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend,
} from 'recharts'
import {
  ClipboardList, BarChart3, FlaskConical,
  Plus, Trash2, Edit3, Save, X, CheckCircle2, AlertTriangle,
  Clock, Users, Gauge, ChevronDown, ChevronUp, AlertCircle,
  CalendarDays, TrendingUp, TrendingDown, Minus, Star,
  FileCheck, GripVertical, Info, Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/appStore'
import { nanoid } from 'nanoid'
import { cn } from '@/lib/utils'
import type {
  SIF, Project, ProofTestProcedure, ProofTestStep, ProofTestPhase,
  TestCampaign, CampaignVerdict, StepResult,
} from '@/core/types'
import { PROOF_TEST_PHASE_META } from '@/core/types'

// ─── Constants ────────────────────────────────────────────────────────────
const PHASES: ProofTestPhase[] = [
  'prerequisites', 'isolation', 'sensor', 'logic', 'actuator', 'restoration', 'acceptance',
]

const VERDICT_META: Record<CampaignVerdict, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pass:        { label: 'PASS',        color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle2 },
  fail:        { label: 'FAIL',        color: '#DC2626', bg: '#FEF2F2', icon: AlertTriangle },
  conditional: { label: 'CONDITIONAL', color: '#D97706', bg: '#FFFBEB', icon: AlertCircle },
}

// ─── Shared primitives ────────────────────────────────────────────────────
function SubNav({
  view, setView,
}: {
  view: 'procedure' | 'campaigns' | 'performance'
  setView: (v: 'procedure' | 'campaigns' | 'performance') => void
}) {
  const tabs = [
    { id: 'procedure'   as const, label: 'Procedure', icon: ClipboardList, hint: 'SOP & steps' },
    { id: 'campaigns'   as const, label: 'Campaigns',  icon: FlaskConical,  hint: 'Field results' },
    { id: 'performance' as const, label: 'Performance',icon: BarChart3,      hint: 'Trend & KPIs' },
  ]
  return (
    <div className="flex gap-2 mb-6">
      {tabs.map(tab => {
        const Icon = tab.icon
        return (
          <button key={tab.id} onClick={() => setView(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
              view === tab.id
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
            )}
          >
            <Icon size={14} />
            {tab.label}
            <span className={cn('text-[10px] font-normal', view === tab.id ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
              {tab.hint}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SectionLabel({ number, title, subtitle, action }: {
  number: string; title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div className="flex items-baseline gap-2.5">
        <span className="text-xs font-mono font-bold text-primary/50">{number}</span>
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

// ─── DEFAULT procedure factory ────────────────────────────────────────────
function defaultProcedure(sif: SIF): ProofTestProcedure {
  const steps: ProofTestStep[] = [
    { id: nanoid(), phase: 'prerequisites', order: 0, description: 'Obtain Work Permit (PTW)', responsible: 'Safety officer', expectedResult: 'PTW signed and in place', toleranceNote: '', isCritical: true },
    { id: nanoid(), phase: 'prerequisites', order: 1, description: 'Notify control room — proof test in progress', responsible: 'Test engineer', expectedResult: 'Control room acknowledged', toleranceNote: '', isCritical: true },
    { id: nanoid(), phase: 'isolation', order: 0, description: 'Bypass SIF in DCS/SIS and log bypass start time', responsible: 'Test engineer', expectedResult: 'Bypass confirmed active in DCS', toleranceNote: '', isCritical: true },
    { id: nanoid(), phase: 'sensor', order: 0, description: `Inject signal on ${sif.processTag || 'sensor'} — simulate process demand`, responsible: 'Instrument tech', expectedResult: 'Signal received within tolerance at logic solver', toleranceNote: '±2% of span', isCritical: false },
    { id: nanoid(), phase: 'logic', order: 0, description: 'Verify logic solver output activates on demand signal', responsible: 'Instrument tech', expectedResult: 'Output energised / de-energised as per cause & effect', toleranceNote: '', isCritical: true },
    { id: nanoid(), phase: 'actuator', order: 0, description: 'Measure full stroke time of final element', responsible: 'Test engineer', expectedResult: `Valve reaction time ≤ ${sif.subsystems[2]?.channels[0]?.components[0]?.test.T1 ?? '—'} target`, toleranceNote: 'See target time in procedure header', isCritical: true },
    { id: nanoid(), phase: 'actuator', order: 1, description: 'Measure overall SIF response time (sensor → safe state)', responsible: 'Test engineer', expectedResult: `SIF response time ≤ target`, toleranceNote: 'Record to nearest 10ms', isCritical: true },
    { id: nanoid(), phase: 'restoration', order: 0, description: 'Reset final element and verify return-to-service position', responsible: 'Instrument tech', expectedResult: 'Valve in normal operating position confirmed', toleranceNote: '', isCritical: false },
    { id: nanoid(), phase: 'restoration', order: 1, description: 'Remove bypass and verify SIF is operational in DCS/SIS', responsible: 'Test engineer', expectedResult: 'Bypass removed, SIF status = Active', toleranceNote: '', isCritical: true },
    { id: nanoid(), phase: 'acceptance', order: 0, description: 'All critical steps passed — sign PV', responsible: 'Test engineer + Witness', expectedResult: 'PV signed by all required personnel', toleranceNote: '', isCritical: true },
  ]
  return {
    id: nanoid(),
    ref: `PT-${sif.sifNumber}-001`,
    revision: 'A',
    status: 'draft',
    periodicityMonths: 12,
    targetSIFResponseMs: 1000,
    targetValveReactionMs: 500,
    tolerancePct: 10,
    steps,
    madeBy: sif.madeBy,
    madeByDate: '',
    verifiedBy: sif.verifiedBy,
    verifiedByDate: '',
    approvedBy: sif.approvedBy,
    approvedByDate: '',
    notes: '',
  }
}

// ─── PROCEDURE VIEW ───────────────────────────────────────────────────────
function ProcedureView({
  sif, projectId,
}: { sif: SIF; projectId: string }) {
  const updateProc = useAppStore(s => s.updateProofTestProcedure)
  const proc = sif.proofTestProcedure ?? defaultProcedure(sif)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProofTestProcedure>(proc)
  const [expandedPhases, setExpandedPhases] = useState<Set<ProofTestPhase>>(new Set(PHASES))

  const save = () => {
    updateProc(projectId, sif.id, draft)
    setEditing(false)
  }

  const addStep = (phase: ProofTestPhase) => {
    const newStep: ProofTestStep = {
      id: nanoid(), phase, order: draft.steps.filter(s => s.phase === phase).length,
      description: '', responsible: '', expectedResult: '', toleranceNote: '', isCritical: false,
    }
    setDraft(d => ({ ...d, steps: [...d.steps, newStep] }))
  }

  const removeStep = (id: string) => setDraft(d => ({ ...d, steps: d.steps.filter(s => s.id !== id) }))

  const updateStep = (id: string, field: keyof ProofTestStep, value: any) =>
    setDraft(d => ({ ...d, steps: d.steps.map(s => s.id === id ? { ...s, [field]: value } : s) }))

  const togglePhase = (phase: ProofTestPhase) =>
    setExpandedPhases(prev => { const n = new Set(prev); n.has(phase) ? n.delete(phase) : n.add(phase); return n })

  const p = editing ? draft : proc

  const statusMeta = {
    draft:    { label: 'Draft',    color: '#6B7280', bg: '#F9FAFB' },
    ifr:      { label: 'IFR',     color: '#D97706', bg: '#FFFBEB' },
    approved: { label: 'Approved', color: '#16A34A', bg: '#F0FDF4' },
  }
  const sm = statusMeta[p.status]

  // Days until next test
  const lastCampaign = (sif.testCampaigns ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))[0]
  const nextDue = lastCampaign
    ? new Date(new Date(lastCampaign.date).getTime() + p.periodicityMonths * 30.44 * 24 * 3600000)
    : null
  const daysUntil = nextDue ? Math.round((nextDue.getTime() - Date.now()) / (24 * 3600000)) : null

  return (
    <div className="space-y-6">
      {/* ─ Header card ─ */}
      <div className="rounded-2xl border-2 bg-card overflow-hidden" style={{ borderColor: `${sm.color}40` }}>
        <div className="flex items-center justify-between px-5 py-2.5 border-b"
          style={{ background: sm.bg, color: sm.color }}
        >
          <div className="flex items-center gap-2">
            <FileCheck size={13} />
            <span className="text-xs font-bold">{p.status.toUpperCase()}</span>
          </div>
          <span className="text-xs font-mono">{p.ref} · Rev. {p.revision}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center px-6 py-5 gap-0">
          {/* Periodicity */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Periodicity</p>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <Input type="number" min={1} value={draft.periodicityMonths}
                  onChange={e => setDraft(d => ({ ...d, periodicityMonths: +e.target.value }))}
                  className="w-16 h-7 font-mono text-sm" />
                <span className="text-xs text-muted-foreground">months</span>
              </div>
            ) : (
              <p className="text-xl font-bold font-mono">{p.periodicityMonths} <span className="text-sm text-muted-foreground font-normal">months</span></p>
            )}
          </div>
          <div className="h-10 w-px bg-border mx-5" />

          {/* Target SIF RT */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Max SIF Response</p>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} value={draft.targetSIFResponseMs}
                  onChange={e => setDraft(d => ({ ...d, targetSIFResponseMs: +e.target.value }))}
                  className="w-20 h-7 font-mono text-sm" />
                <span className="text-xs text-muted-foreground">ms</span>
              </div>
            ) : (
              <p className="text-xl font-bold font-mono text-cyan-600">{p.targetSIFResponseMs} <span className="text-sm font-normal text-muted-foreground">ms</span></p>
            )}
          </div>
          <div className="h-10 w-px bg-border mx-5" />

          {/* Target Valve RT */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Max Valve Reaction</p>
            {editing ? (
              <div className="flex items-center gap-1.5">
                <Input type="number" min={0} value={draft.targetValveReactionMs}
                  onChange={e => setDraft(d => ({ ...d, targetValveReactionMs: +e.target.value }))}
                  className="w-20 h-7 font-mono text-sm" />
                <span className="text-xs text-muted-foreground">ms</span>
              </div>
            ) : (
              <p className="text-xl font-bold font-mono text-orange-600">{p.targetValveReactionMs} <span className="text-sm font-normal text-muted-foreground">ms</span></p>
            )}
          </div>
          <div className="h-10 w-px bg-border mx-5" />

          {/* Next test */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Next test due</p>
            {daysUntil !== null ? (
              <p className={cn('text-xl font-bold font-mono', daysUntil < 30 ? 'text-red-500' : daysUntil < 90 ? 'text-amber-500' : 'text-emerald-500')}>
                {daysUntil}d <span className="text-sm font-normal text-muted-foreground">{daysUntil < 0 ? 'overdue' : 'remaining'}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ─ Steps ─ */}
      <div>
        <SectionLabel number="01" title="Test Procedure Steps"
          subtitle={`${p.steps.length} steps across ${PHASES.length} phases`}
          action={
            <div className="flex gap-2">
              {editing
                ? <>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(false)}>
                      <X size={11} className="mr-1" /> Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={save}>
                      <Save size={11} /> Save procedure
                    </Button>
                  </>
                : <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => { setDraft(proc); setEditing(true) }}>
                    <Edit3 size={11} /> Edit
                  </Button>
              }
            </div>
          }
        />

        <div className="space-y-2">
          {PHASES.map(phase => {
            const meta     = PROOF_TEST_PHASE_META[phase]
            const steps    = p.steps.filter(s => s.phase === phase)
            const expanded = expandedPhases.has(phase)
            return (
              <div key={phase} className="rounded-xl border overflow-hidden bg-card">
                {/* Phase header */}
                <button type="button" onClick={() => togglePhase(phase)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
                  style={{ background: `${meta.color}06`, borderBottom: expanded ? `1px solid ${meta.color}20` : undefined }}
                >
                  <div className="w-8 h-5 rounded text-[9px] font-black flex items-center justify-center"
                    style={{ background: `${meta.color}20`, color: meta.color }}
                  >
                    {meta.short}
                  </div>
                  <span className="text-xs font-semibold flex-1 text-left" style={{ color: meta.color }}>{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground mr-2">{steps.length} steps</span>
                  {expanded ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
                </button>

                {/* Steps */}
                {expanded && (
                  <div>
                    {steps.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No steps — {editing && 'add one below'}</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/10">
                            <th className="text-left px-4 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider w-6">#</th>
                            <th className="text-left px-4 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Description</th>
                            <th className="text-left px-4 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider w-32">Responsible</th>
                            <th className="text-left px-4 py-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Expected result</th>
                            <th className="px-4 py-2 w-16"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {steps.map((step, si) => (
                            <tr key={step.id} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  {step.isCritical && <Star size={9} className="text-amber-500 shrink-0 fill-amber-500" />}
                                  <span className="text-muted-foreground font-mono">{si + 1}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                {editing ? (
                                  <Input value={step.description}
                                    onChange={e => updateStep(step.id, 'description', e.target.value)}
                                    className="h-7 text-xs" />
                                ) : (
                                  <span>{step.description}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {editing ? (
                                  <Input value={step.responsible}
                                    onChange={e => updateStep(step.id, 'responsible', e.target.value)}
                                    className="h-7 text-xs" />
                                ) : (
                                  <span className="text-muted-foreground">{step.responsible}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {editing ? (
                                  <Input value={step.expectedResult}
                                    onChange={e => updateStep(step.id, 'expectedResult', e.target.value)}
                                    className="h-7 text-xs" />
                                ) : (
                                  <span className="text-muted-foreground/80">{step.expectedResult}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {editing && (
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button onClick={() => updateStep(step.id, 'isCritical', !step.isCritical)}
                                      title="Toggle critical"
                                      className={cn('p-1 rounded', step.isCritical ? 'text-amber-500' : 'text-muted-foreground/30 hover:text-muted-foreground')}
                                    >
                                      <Star size={11} className={step.isCritical ? 'fill-amber-500' : ''} />
                                    </button>
                                    <button onClick={() => removeStep(step.id)} className="p-1 text-destructive/40 hover:text-destructive rounded">
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {editing && (
                      <div className="px-4 py-2 border-t bg-muted/5">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground"
                          onClick={() => addStep(phase)}
                        >
                          <Plus size={10} /> Add step
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─ Signatures ─ */}
      <div>
        <SectionLabel number="02" title="Approval Signatures" />
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-3 divide-x">
            {[
              { role: 'Prepared by',  nameKey: 'madeBy' as const,     dateKey: 'madeByDate' as const },
              { role: 'Verified by',  nameKey: 'verifiedBy' as const,  dateKey: 'verifiedByDate' as const },
              { role: 'Approved by',  nameKey: 'approvedBy' as const,  dateKey: 'approvedByDate' as const },
            ].map(sig => (
              <div key={sig.role} className="px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{sig.role}</p>
                {editing ? (
                  <div className="space-y-1.5">
                    <Input value={draft[sig.nameKey]} onChange={e => setDraft(d => ({ ...d, [sig.nameKey]: e.target.value }))}
                      placeholder="Full name" className="h-7 text-xs" />
                    <Input type="date" value={draft[sig.dateKey]} onChange={e => setDraft(d => ({ ...d, [sig.dateKey]: e.target.value }))}
                      className="h-7 text-xs" />
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">{p[sig.nameKey] || <span className="text-muted-foreground/40">—</span>}</p>
                    {p[sig.dateKey] && <p className="text-[10px] text-muted-foreground mt-0.5">{p[sig.dateKey]}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CAMPAIGNS VIEW ───────────────────────────────────────────────────────
function CampaignsView({ sif, projectId }: { sif: SIF; projectId: string }) {
  const addCampaign    = useAppStore(s => s.addTestCampaign)
  const removeCampaign = useAppStore(s => s.removeTestCampaign)
  const proc = sif.proofTestProcedure ?? defaultProcedure(sif)
  const campaigns = (sif.testCampaigns ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))

  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<TestCampaign>>({
    date: new Date().toISOString().split('T')[0],
    verdict: 'pass',
    sifResponseTimeMs: 0,
    valveReactionTimeMs: 0,
    team: '',
    operatingMode: 'Normal operation',
    processLoad: '',
    notes: '',
    conductedBy: '',
    witnessedBy: '',
    reviewedBy: '',
  })

  const submitCampaign = () => {
    if (!form.date) return
    const campaign: TestCampaign = {
      id: nanoid(),
      date: form.date!,
      team: form.team ?? '',
      operatingMode: form.operatingMode ?? '',
      processLoad: form.processLoad ?? '',
      sifResponseTimeMs: form.sifResponseTimeMs ?? 0,
      valveReactionTimeMs: form.valveReactionTimeMs ?? 0,
      verdict: form.verdict as CampaignVerdict ?? 'pass',
      notes: form.notes ?? '',
      stepResults: [],
      conductedBy: form.conductedBy ?? '',
      witnessedBy: form.witnessedBy ?? '',
      reviewedBy: form.reviewedBy ?? '',
    }
    addCampaign(projectId, sif.id, campaign)
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], verdict: 'pass', sifResponseTimeMs: 0, valveReactionTimeMs: 0, team: '', operatingMode: 'Normal operation', processLoad: '', notes: '', conductedBy: '', witnessedBy: '', reviewedBy: '' })
  }

  const passRate = campaigns.length
    ? Math.round(campaigns.filter(c => c.verdict === 'pass').length / campaigns.length * 100)
    : null

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total campaigns', value: String(campaigns.length), color: undefined },
            { label: 'Pass rate', value: passRate != null ? `${passRate}%` : '—', color: passRate! >= 80 ? '#16A34A' : '#D97706' },
            {
              label: 'Last test',
              value: campaigns[0]?.date ?? '—',
              color: undefined,
            },
            {
              label: 'SIF response (last)',
              value: campaigns[0] ? `${campaigns[0].sifResponseTimeMs} ms` : '—',
              color: campaigns[0] && proc.targetSIFResponseMs
                ? campaigns[0].sifResponseTimeMs <= proc.targetSIFResponseMs ? '#16A34A' : '#DC2626'
                : undefined,
            },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl border bg-card px-4 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{kpi.label}</p>
              <p className="text-lg font-bold font-mono" style={kpi.color ? { color: kpi.color } : undefined}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* New campaign button / form */}
      <div>
        <SectionLabel number="01" title="Test Campaigns"
          subtitle="Field proof test results log"
          action={
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowForm(s => !s)}>
              {showForm ? <><X size={11} /> Cancel</> : <><Plus size={11} /> New campaign</>}
            </Button>
          }
        />

        {/* Inline form */}
        {showForm && (
          <div className="rounded-xl border-2 border-primary/30 bg-card p-5 mb-4 space-y-4">
            <p className="text-xs font-bold text-primary">New test campaign</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Team / Campaign ref</Label>
                <Input placeholder="e.g. EI-TEAM-01" value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Operating mode</Label>
                <Input placeholder="Normal operation" value={form.operatingMode} onChange={e => setForm(f => ({ ...f, operatingMode: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>

            {/* Key measurements */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                  SIF Response Time
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={0} value={form.sifResponseTimeMs}
                    onChange={e => setForm(f => ({ ...f, sifResponseTimeMs: +e.target.value }))}
                    className={cn('h-8 text-sm font-mono flex-1', form.sifResponseTimeMs! > proc.targetSIFResponseMs ? 'border-red-400' : '')} />
                  <span className="text-xs text-muted-foreground shrink-0">ms</span>
                </div>
                {proc.targetSIFResponseMs > 0 && (
                  <p className="text-[9px] text-muted-foreground">Target: ≤ {proc.targetSIFResponseMs} ms</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                  Valve Reaction Time
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={0} value={form.valveReactionTimeMs}
                    onChange={e => setForm(f => ({ ...f, valveReactionTimeMs: +e.target.value }))}
                    className={cn('h-8 text-sm font-mono flex-1', form.valveReactionTimeMs! > proc.targetValveReactionMs ? 'border-red-400' : '')} />
                  <span className="text-xs text-muted-foreground shrink-0">ms</span>
                </div>
                {proc.targetValveReactionMs > 0 && (
                  <p className="text-[9px] text-muted-foreground">Target: ≤ {proc.targetValveReactionMs} ms</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Verdict</Label>
                <Select value={form.verdict} onValueChange={v => setForm(f => ({ ...f, verdict: v as CampaignVerdict }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass" className="text-xs text-emerald-600 font-semibold">✓ PASS</SelectItem>
                    <SelectItem value="conditional" className="text-xs text-amber-600 font-semibold">⚠ CONDITIONAL</SelectItem>
                    <SelectItem value="fail" className="text-xs text-red-600 font-semibold">✗ FAIL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Conducted by</Label>
                <Input placeholder="Full name" value={form.conductedBy} onChange={e => setForm(f => ({ ...f, conductedBy: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Witnessed by</Label>
                <Input placeholder="Full name" value={form.witnessedBy} onChange={e => setForm(f => ({ ...f, witnessedBy: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reviewed by</Label>
                <Input placeholder="Full name" value={form.reviewedBy} onChange={e => setForm(f => ({ ...f, reviewedBy: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes / observations</Label>
              <Input placeholder="Any anomalies, conditions, deviations from procedure…"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="h-8 text-xs" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs gap-1.5" onClick={submitCampaign}>
                <Save size={11} /> Save campaign
              </Button>
            </div>
          </div>
        )}

        {/* Campaigns table */}
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
            <FlaskConical size={28} className="mb-2 opacity-30" />
            <p className="text-sm font-medium mb-1">No test campaigns yet</p>
            <p className="text-xs">Record your first proof test to start tracking performance over time</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  {['Date', 'Team', 'SIF Response', 'Valve Reaction', 'Verdict', 'Conducted by', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const vm = VERDICT_META[c.verdict]
                  const VIcon = vm.icon
                  const sifOk  = c.sifResponseTimeMs <= proc.targetSIFResponseMs
                  const valvOk = c.valveReactionTimeMs <= proc.targetValveReactionMs
                  return (
                    <>
                      <tr key={c.id} className="border-b hover:bg-muted/10 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{c.date}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{c.team || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('font-mono text-xs font-bold', sifOk ? 'text-emerald-500' : 'text-red-500')}>
                            {c.sifResponseTimeMs} ms
                          </span>
                          {!sifOk && <span className="ml-1 text-[9px] text-red-400">↑ over limit</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('font-mono text-xs font-bold', valvOk ? 'text-emerald-500' : 'text-red-500')}>
                            {c.valveReactionTimeMs} ms
                          </span>
                          {!valvOk && <span className="ml-1 text-[9px] text-red-400">↑ over limit</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: vm.bg, color: vm.color }}
                          >
                            <VIcon size={10} /> {vm.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{c.conductedBy || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {expandedId === c.id ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
                            <button onClick={e => { e.stopPropagation(); removeCampaign(projectId, sif.id, c.id) }}
                              className="p-1 text-destructive/30 hover:text-destructive rounded ml-1"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === c.id && (
                        <tr key={`${c.id}-exp`} className="bg-muted/5 border-b">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div>
                                <p className="font-semibold text-muted-foreground mb-1">Conditions</p>
                                <p><span className="text-muted-foreground">Mode:</span> {c.operatingMode}</p>
                                <p><span className="text-muted-foreground">Load:</span> {c.processLoad || '—'}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-muted-foreground mb-1">Team</p>
                                <p><span className="text-muted-foreground">Conducted:</span> {c.conductedBy}</p>
                                <p><span className="text-muted-foreground">Witnessed:</span> {c.witnessedBy}</p>
                                <p><span className="text-muted-foreground">Reviewed:</span> {c.reviewedBy}</p>
                              </div>
                              <div>
                                <p className="font-semibold text-muted-foreground mb-1">Notes</p>
                                <p className="text-muted-foreground">{c.notes || 'None'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PERFORMANCE VIEW (Trend Charts) ─────────────────────────────────────
function PerformanceView({ sif }: { sif: SIF }) {
  const proc = sif.proofTestProcedure ?? defaultProcedure(sif)
  const campaigns = (sif.testCampaigns ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))

  const chartData = campaigns.map((c, i) => ({
    label: `#${i + 1} ${c.date}`,
    sifRT: c.sifResponseTimeMs,
    valveRT: c.valveReactionTimeMs,
    verdict: c.verdict,
    index: i + 1,
  }))

  const passCount = campaigns.filter(c => c.verdict === 'pass').length
  const passRate  = campaigns.length ? Math.round(passCount / campaigns.length * 100) : null

  const lastSIF   = campaigns.at(-1)?.sifResponseTimeMs
  const lastValve = campaigns.at(-1)?.valveReactionTimeMs
  const prevSIF   = campaigns.at(-2)?.sifResponseTimeMs
  const prevValve = campaigns.at(-2)?.valveReactionTimeMs

  const trend = (curr?: number, prev?: number) => {
    if (curr == null || prev == null) return null
    const diff = curr - prev
    if (Math.abs(diff) < 5) return { dir: 'stable', color: '#6B7280', icon: Minus }
    return diff < 0
      ? { dir: 'improving', color: '#16A34A', icon: TrendingDown }
      : { dir: 'degrading', color: '#DC2626', icon: TrendingUp }
  }

  const sifTrend   = trend(lastSIF, prevSIF)
  const valveTrend = trend(lastValve, prevValve)

  const isDark = useAppStore(s => s.isDark)
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const tickColor = isDark ? '#4B5563' : '#9CA3AF'

  // Custom dot with out-of-tolerance coloring
  const CustomDot = ({ cx, cy, payload, limit }: any) => {
    const over = payload.sifRT > limit || payload.valveRT > limit
    const color = payload.verdict === 'fail' ? '#DC2626' : payload.verdict === 'conditional' ? '#D97706' : '#16A34A'
    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={1.5} />
  }

  const TooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div className="rounded-xl border bg-card shadow-xl px-4 py-3 text-xs">
        <p className="font-mono text-muted-foreground mb-2">Campaign {label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-5 mb-1">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="font-mono font-bold" style={{ color: p.color }}>{p.value} ms</span>
          </div>
        ))}
        {d && (
          <div className="mt-1.5 pt-1.5 border-t">
            <span className="font-semibold" style={{ color: VERDICT_META[d.verdict as CampaignVerdict]?.color }}>
              {VERDICT_META[d.verdict as CampaignVerdict]?.label}
            </span>
          </div>
        )}
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-xl text-muted-foreground">
        <BarChart3 size={32} className="mb-3 opacity-25" />
        <p className="text-sm font-medium mb-1">No data yet</p>
        <p className="text-xs">Add test campaigns to see performance trends</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Pass rate',
            value: passRate != null ? `${passRate}%` : '—',
            sub: `${passCount}/${campaigns.length} campaigns`,
            color: passRate! >= 80 ? '#16A34A' : passRate! >= 60 ? '#D97706' : '#DC2626',
          },
          {
            label: 'Last SIF response',
            value: lastSIF != null ? `${lastSIF} ms` : '—',
            sub: proc.targetSIFResponseMs ? `Target ≤ ${proc.targetSIFResponseMs} ms` : '',
            color: lastSIF != null ? (lastSIF <= proc.targetSIFResponseMs ? '#16A34A' : '#DC2626') : '#6B7280',
          },
          {
            label: 'Last valve reaction',
            value: lastValve != null ? `${lastValve} ms` : '—',
            sub: proc.targetValveReactionMs ? `Target ≤ ${proc.targetValveReactionMs} ms` : '',
            color: lastValve != null ? (lastValve <= proc.targetValveReactionMs ? '#16A34A' : '#DC2626') : '#6B7280',
          },
          {
            label: 'Campaigns total',
            value: String(campaigns.length),
            sub: `Since ${campaigns[0]?.date ?? '—'}`,
            color: '#6B7280',
          },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border bg-card px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{kpi.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* SIF Response Time chart */}
      <div>
        <SectionLabel number="01" title="SIF Response Time" subtitle="Measured end-to-end response time · Tolerance band in grey" />
        <div className="rounded-xl border bg-card p-5">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="index" tick={{ fill: tickColor, fontSize: 10 }}
                label={{ value: 'Campaign #', position: 'insideBottomRight', offset: -8, fill: tickColor, fontSize: 10 }} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }}
                label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 10 }} />
              <Tooltip content={<TooltipContent />} />

              {/* Tolerance band */}
              {proc.targetSIFResponseMs > 0 && (
                <>
                  <ReferenceArea y1={0} y2={proc.targetSIFResponseMs * (1 + proc.tolerancePct / 100)}
                    fill="#16A34A" fillOpacity={0.06} />
                  <ReferenceLine y={proc.targetSIFResponseMs} stroke="#16A34A" strokeDasharray="6 3"
                    strokeWidth={1.5} label={{ value: `Limit: ${proc.targetSIFResponseMs}ms`, position: 'insideTopRight', fill: '#16A34A', fontSize: 10 }} />
                </>
              )}

              <Line type="monotone" dataKey="sifRT" stroke="#0891B2" strokeWidth={2}
                dot={<CustomDot limit={proc.targetSIFResponseMs} />}
                name="SIF Response Time" activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Valve Reaction Time chart */}
      <div>
        <SectionLabel number="02" title="Valve Reaction Time" subtitle="Final element stroke time · Tolerance band in grey" />
        <div className="rounded-xl border bg-card p-5">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="index" tick={{ fill: tickColor, fontSize: 10 }}
                label={{ value: 'Campaign #', position: 'insideBottomRight', offset: -8, fill: tickColor, fontSize: 10 }} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }}
                label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 10 }} />
              <Tooltip content={<TooltipContent />} />

              {proc.targetValveReactionMs > 0 && (
                <>
                  <ReferenceArea y1={0} y2={proc.targetValveReactionMs * (1 + proc.tolerancePct / 100)}
                    fill="#EA580C" fillOpacity={0.06} />
                  <ReferenceLine y={proc.targetValveReactionMs} stroke="#EA580C" strokeDasharray="6 3"
                    strokeWidth={1.5} label={{ value: `Limit: ${proc.targetValveReactionMs}ms`, position: 'insideTopRight', fill: '#EA580C', fontSize: 10 }} />
                </>
              )}

              <Line type="monotone" dataKey="valveRT" stroke="#EA580C" strokeWidth={2}
                dot={<CustomDot limit={proc.targetValveReactionMs} />}
                name="Valve Reaction Time" activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend summary */}
      <div>
        <SectionLabel number="03" title="Trend Summary" subtitle="Compared to previous campaign" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'SIF Response trend', trend: sifTrend, curr: lastSIF, unit: 'ms' },
            { label: 'Valve Reaction trend', trend: valveTrend, curr: lastValve, unit: 'ms' },
          ].map(item => {
            const Icon = item.trend?.icon ?? Minus
            return (
              <div key={item.label} className="rounded-xl border bg-card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.trend?.color ?? '#6B7280'}15` }}
                >
                  <Icon size={18} style={{ color: item.trend?.color ?? '#6B7280' }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold capitalize" style={{ color: item.trend?.color ?? '#6B7280' }}>
                    {item.trend?.dir ?? 'No data'}
                  </p>
                  {item.curr != null && <p className="text-[10px] text-muted-foreground font-mono">Last: {item.curr} {item.unit}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────
export function ProofTestTab({ sif, project }: { sif: SIF; project: Project }) {
  const [subView, setSubView] = useState<'procedure' | 'campaigns' | 'performance'>('procedure')

  const campaigns = sif.testCampaigns ?? []
  const proc = sif.proofTestProcedure

  // Overdue indicator
  const lastCampaign = (campaigns ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))[0]
  const periodicityMs = (proc?.periodicityMonths ?? 12) * 30.44 * 24 * 3600000
  const nextDue = lastCampaign ? new Date(new Date(lastCampaign.date).getTime() + periodicityMs) : null
  const isOverdue = nextDue ? nextDue < new Date() : false

  return (
    <div>
      {/* Overdue alert */}
      {isOverdue && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
            Proof test overdue — last campaign {lastCampaign?.date ?? '—'}, periodicity {proc?.periodicityMonths ?? 12} months.
            Next test was due {nextDue?.toLocaleDateString()}.
          </p>
        </div>
      )}

      <SubNav view={subView} setView={setSubView} />

      {subView === 'procedure'    && <ProcedureView sif={sif} projectId={project.id} />}
      {subView === 'campaigns'    && <CampaignsView sif={sif} projectId={project.id} />}
      {subView === 'performance'  && <PerformanceView sif={sif} />}
    </div>
  )
}
