/**
 * ProofTestTab — full proof test module
 *
 * Four sub-views via a top mini-nav:
 *  1. Studio      — operational cockpit (readiness, planning, execution pipeline)
 *  2. Procedure   — SOP editor with phase-grouped steps + signatures
 *  3. Campaigns   — Field test log + guided execution capture
 *  4. Performance — Trend charts (SIF response + valve reaction) with tolerance bands
 */
import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend,
} from 'recharts'
import {
  ClipboardList, BarChart3, FlaskConical, ClipboardCheck, ShieldCheck,
  Plus, Trash2, Edit3, Save, X, CheckCircle2, AlertTriangle,
  Clock, Users, Gauge, ChevronDown, ChevronUp, AlertCircle,
  CalendarDays, TrendingUp, TrendingDown, Minus, Star,
  FileCheck, GripVertical, Info, Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
function ProofTestQuickJump() {
  const sections = [
    { id: 'pt-studio', label: 'Studio' },
    { id: 'pt-procedure', label: 'Procedure' },
    { id: 'pt-campaigns', label: 'Campaigns' },
    { id: 'pt-performance', label: 'Performance' },
  ]

  return (
    <div className="mb-5 rounded-xl border bg-card/70 p-2 flex flex-wrap gap-2">
      {sections.map(section => (
        <button
          key={section.id}
          type="button"
          onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors"
        >
          {section.label}
        </button>
      ))}
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


function StudioView({ sif }: { sif: SIF }) {
  const proc = sif.proofTestProcedure ?? defaultProcedure(sif)
  const campaigns = (sif.testCampaigns ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
  const last = campaigns[0]
  const periodicityMs = (proc.periodicityMonths || 12) * 30.44 * 24 * 3600000
  const nextDue = last ? new Date(new Date(last.date).getTime() + periodicityMs) : null
  const isOverdue = nextDue ? nextDue < new Date() : false
  const criticalSteps = proc.steps.filter(s => s.isCritical).length
  const passRate = campaigns.length ? Math.round(campaigns.filter(c => c.verdict === 'pass').length / campaigns.length * 100) : null
  const executionCoverage = campaigns.length
    ? Math.round(
      campaigns.reduce((acc, campaign) => {
        if (!campaign.stepResults?.length) return acc
        const done = campaign.stepResults.filter(step => step.done).length
        return acc + done / campaign.stepResults.length
      }, 0) / campaigns.length * 100,
    )
    : null

  const readiness = [
    { label: 'Procedure approved', ok: proc.status === 'approved' },
    { label: 'Critical steps identified', ok: criticalSteps > 0 },
    { label: 'Performance targets set', ok: proc.targetSIFResponseMs > 0 && proc.targetValveReactionMs > 0 },
    { label: 'Signatories assigned', ok: Boolean(proc.madeBy && proc.verifiedBy && proc.approvedBy) },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">ProofTest Studio</p>
            <h3 className="text-lg font-bold mt-1">Operational cockpit — {sif.sifNumber}</h3>
            <p className="text-xs text-muted-foreground mt-1">Pilot procedure readiness, upcoming due date, and campaign execution quality in one place.</p>
          </div>
          <div className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border', isOverdue ? 'border-red-200 text-red-600 bg-red-50' : 'border-emerald-200 text-emerald-600 bg-emerald-50')}>
            {nextDue ? `Next due ${nextDue.toLocaleDateString()}` : 'No campaign date'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Campaigns', value: String(campaigns.length), icon: ClipboardCheck },
          { label: 'Pass rate', value: passRate != null ? `${passRate}%` : '—', icon: ShieldCheck },
          { label: 'Execution coverage', value: executionCoverage != null ? `${executionCoverage}%` : '—', icon: Award },
          { label: 'Critical steps', value: String(criticalSteps), icon: AlertTriangle },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border bg-card px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{card.label}</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-black font-mono">{card.value}</p>
                <Icon size={14} className="text-muted-foreground" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <SectionLabel number="01" title="Readiness gate" subtitle="Before releasing a campaign" />
          <div className="space-y-2">
            {readiness.map(item => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-xs">{item.label}</span>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                  {item.ok ? 'READY' : 'PENDING'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <SectionLabel number="02" title="Template strategy" subtitle="Scale by reusing procedure packs" />
          <div className="space-y-2 text-xs">
            {[
              'Template pack: ESD valve stroke test + response timing',
              'Template pack: Sensor calibration + vote logic validation',
              'Template pack: Shutdown recovery and return-to-service',
            ].map(item => (
              <div key={item} className="rounded-lg border bg-muted/20 px-3 py-2">{item}</div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Tip: duplicate procedure by unit and only override setpoint, tolerance and responsible roles.</p>
        </div>
      </div>
    </div>
  )
}

// ─── PROCEDURE VIEW ───────────────────────────────────────────────────────
function ProcedureView({
  sif, projectId,
}: { sif: SIF; projectId: string }) {
  const updateProc = useAppStore(s => s.updateProofTestProcedure)
  const proc = sif.proofTestProcedure ?? defaultProcedure(sif)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProofTestProcedure>(proc)
  const [selectedPhase, setSelectedPhase] = useState<ProofTestPhase>('prerequisites')

  const p = editing ? draft : proc
  const phaseSteps = p.steps.filter(step => step.phase === selectedPhase).sort((a, b) => a.order - b.order)
  const criticalCount = p.steps.filter(step => step.isCritical).length

  const statusMeta = {
    draft: { label: 'Draft', color: '#6B7280', bg: '#F9FAFB' },
    ifr: { label: 'IFR', color: '#D97706', bg: '#FFFBEB' },
    approved: { label: 'Approved', color: '#16A34A', bg: '#F0FDF4' },
  }
  const sm = statusMeta[p.status]

  const syncOrders = (steps: ProofTestStep[]) =>
    steps.map((step, index) => ({ ...step, order: index }))

  const save = () => {
    updateProc(projectId, sif.id, {
      ...draft,
      steps: PHASES.flatMap(phase => {
        const stepsByPhase = draft.steps.filter(step => step.phase === phase).sort((a, b) => a.order - b.order)
        return syncOrders(stepsByPhase)
      }),
    })
    setEditing(false)
  }

  const addStep = (phase: ProofTestPhase, preset?: Partial<ProofTestStep>) => {
    setDraft(prev => {
      const phaseSteps = prev.steps.filter(step => step.phase === phase).sort((a, b) => a.order - b.order)
      const newStep: ProofTestStep = {
        id: nanoid(),
        phase,
        order: phaseSteps.length,
        description: preset?.description ?? '',
        responsible: preset?.responsible ?? '',
        expectedResult: preset?.expectedResult ?? '',
        toleranceNote: preset?.toleranceNote ?? '',
        isCritical: preset?.isCritical ?? false,
      }
      return { ...prev, steps: [...prev.steps, newStep] }
    })
  }

  const moveStep = (id: string, direction: 'up' | 'down') => {
    setDraft(prev => {
      const step = prev.steps.find(item => item.id === id)
      if (!step) return prev
      const inPhase = prev.steps.filter(item => item.phase === step.phase).sort((a, b) => a.order - b.order)
      const index = inPhase.findIndex(item => item.id === id)
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (index < 0 || targetIndex < 0 || targetIndex >= inPhase.length) return prev
      const swapped = [...inPhase]
      ;[swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]]
      const reordered = syncOrders(swapped)
      const others = prev.steps.filter(item => item.phase !== step.phase)
      return { ...prev, steps: [...others, ...reordered] }
    })
  }

  const removeStep = (id: string) =>
    setDraft(prev => {
      const step = prev.steps.find(item => item.id === id)
      if (!step) return prev
      const remainingPhase = syncOrders(
        prev.steps.filter(item => item.phase === step.phase && item.id !== id).sort((a, b) => a.order - b.order),
      )
      const others = prev.steps.filter(item => item.phase !== step.phase)
      return { ...prev, steps: [...others, ...remainingPhase] }
    })

  const updateStep = (id: string, field: keyof ProofTestStep, value: string | boolean | number) =>
    setDraft(prev => ({ ...prev, steps: prev.steps.map(step => step.id === id ? { ...step, [field]: value } : step) }))

  const quickStepTemplates: Partial<ProofTestStep>[] = [
    {
      description: 'Verify bypass permit and MOC record before test execution',
      expectedResult: 'Permit and MOC validated by responsible engineer',
      responsible: 'SIS Engineer',
      isCritical: true,
    },
    {
      description: 'Record as-found device behavior before stimulation',
      expectedResult: 'As-found baseline captured in campaign report',
      responsible: 'Instrument Tech',
      isCritical: false,
    },
    {
      description: 'Capture evidence attachment reference (PV / trend / photo)',
      expectedResult: 'Evidence ID linked to this step',
      responsible: 'Test Lead',
      isCritical: true,
    },
  ]

  const lastCampaign = (sif.testCampaigns ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))[0]
  const nextDue = lastCampaign
    ? new Date(new Date(lastCampaign.date).getTime() + p.periodicityMonths * 30.44 * 24 * 3600000)
    : null

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-2.5 border-b" style={{ background: sm.bg, color: sm.color }}>
          <div className="flex items-center gap-2">
            <FileCheck size={13} />
            <span className="text-xs font-bold">{sm.label} · Procedure Studio</span>
          </div>
          <span className="text-xs font-mono">{p.ref} · Rev. {p.revision}</span>
        </div>

        <div className="grid grid-cols-4 gap-3 px-5 py-4">
          {[
            { label: 'Periodicity', value: `${p.periodicityMonths} mo` },
            { label: 'Critical steps', value: String(criticalCount) },
            { label: 'Total steps', value: String(p.steps.length) },
            { label: 'Next due', value: nextDue ? nextDue.toLocaleDateString() : '—' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
              <p className="text-lg font-bold font-mono mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Procedure flow</p>
            <div className="space-y-1.5">
              {PHASES.map(phase => {
                const meta = PROOF_TEST_PHASE_META[phase]
                const count = p.steps.filter(step => step.phase === phase).length
                return (
                  <button
                    key={phase}
                    onClick={() => setSelectedPhase(phase)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                      selectedPhase === phase
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/30',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{meta.short}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick templates</p>
            <div className="space-y-2">
              {quickStepTemplates.map((tpl, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={!editing}
                  onClick={() => addStep(selectedPhase, tpl)}
                  className={cn(
                    'w-full rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors',
                    editing ? 'hover:bg-muted/30' : 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {tpl.description}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SectionLabel
            number="01"
            title={`Phase editor — ${PROOF_TEST_PHASE_META[selectedPhase].label}`}
            subtitle="Industrial style procedure authoring with clear responsibilities and expected outcomes"
            action={
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setDraft(proc); setEditing(false) }}>
                      <X size={11} className="mr-1" /> Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" onClick={save}>
                      <Save size={11} /> Save procedure
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => { setDraft(proc); setEditing(true) }}>
                    <Edit3 size={11} /> Edit
                  </Button>
                )}
              </div>
            }
          />

          {editing && (
            <div className="grid grid-cols-4 gap-3 rounded-xl border bg-card p-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Periodicity (months)</Label>
                <Input type="number" min={1} className="h-8 text-xs" value={draft.periodicityMonths} onChange={e => setDraft(prev => ({ ...prev, periodicityMonths: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">SIF max response (ms)</Label>
                <Input type="number" min={0} className="h-8 text-xs" value={draft.targetSIFResponseMs} onChange={e => setDraft(prev => ({ ...prev, targetSIFResponseMs: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Valve max response (ms)</Label>
                <Input type="number" min={0} className="h-8 text-xs" value={draft.targetValveReactionMs} onChange={e => setDraft(prev => ({ ...prev, targetValveReactionMs: +e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tolerance (%)</Label>
                <Input type="number" min={0} className="h-8 text-xs" value={draft.tolerancePct} onChange={e => setDraft(prev => ({ ...prev, tolerancePct: +e.target.value }))} />
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/15">
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">#</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Instruction</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Responsible</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Expected result</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {phaseSteps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">No step in this phase yet.</td>
                  </tr>
                ) : (
                  phaseSteps.map((step, index) => (
                    <tr key={step.id} className="border-b last:border-0 align-top hover:bg-muted/5">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {step.isCritical && <Star size={10} className="text-amber-500 fill-amber-500" />}
                          <span className="font-mono text-muted-foreground">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {editing ? (
                          <Input className="h-7 text-xs" value={step.description} onChange={e => updateStep(step.id, 'description', e.target.value)} />
                        ) : (
                          <span>{step.description}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editing ? (
                          <Input className="h-7 text-xs" value={step.responsible} onChange={e => updateStep(step.id, 'responsible', e.target.value)} />
                        ) : (
                          <span className="text-muted-foreground">{step.responsible || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editing ? (
                          <Input className="h-7 text-xs" value={step.expectedResult} onChange={e => updateStep(step.id, 'expectedResult', e.target.value)} />
                        ) : (
                          <span className="text-muted-foreground">{step.expectedResult || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {editing && (
                          <div className="inline-flex items-center gap-1">
                            <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => moveStep(step.id, 'up')} title="Move up">
                              <ChevronUp size={12} />
                            </button>
                            <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => moveStep(step.id, 'down')} title="Move down">
                              <ChevronDown size={12} />
                            </button>
                            <button type="button" className={cn('p-1 rounded', step.isCritical ? 'text-amber-500' : 'text-muted-foreground')} onClick={() => updateStep(step.id, 'isCritical', !step.isCritical)} title="Critical step">
                              <Star size={12} className={step.isCritical ? 'fill-amber-500' : ''} />
                            </button>
                            <button type="button" className="p-1 rounded text-destructive/50 hover:text-destructive" onClick={() => removeStep(step.id)} title="Delete step">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {editing && (
              <div className="px-3 py-2 border-t bg-muted/10 flex justify-between">
                <p className="text-[11px] text-muted-foreground">Selected phase: {PROOF_TEST_PHASE_META[selectedPhase].label}</p>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => addStep(selectedPhase)}>
                  <Plus size={11} /> Add empty step
                </Button>
              </div>
            )}
          </div>

          <SectionLabel number="02" title="Approval signatures" subtitle="Document control and workflow accountability" />
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-3 divide-x">
              {[
                { role: 'Prepared by', nameKey: 'madeBy' as const, dateKey: 'madeByDate' as const },
                { role: 'Verified by', nameKey: 'verifiedBy' as const, dateKey: 'verifiedByDate' as const },
                { role: 'Approved by', nameKey: 'approvedBy' as const, dateKey: 'approvedByDate' as const },
              ].map(sig => (
                <div key={sig.role} className="px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{sig.role}</p>
                  {editing ? (
                    <div className="space-y-1.5">
                      <Input
                        value={draft[sig.nameKey]}
                        onChange={e => setDraft(prev => ({ ...prev, [sig.nameKey]: e.target.value }))}
                        className="h-7 text-xs"
                        placeholder="Full name"
                      />
                      <Input
                        type="date"
                        value={draft[sig.dateKey]}
                        onChange={e => setDraft(prev => ({ ...prev, [sig.dateKey]: e.target.value }))}
                        className="h-7 text-xs"
                      />
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
    </div>
  )
}

// ─── CAMPAIGNS VIEW ───────────────────────────────────────────────────────
function CampaignsView({ sif, projectId }: { sif: SIF; projectId: string }) {
  const addCampaign = useAppStore(s => s.addTestCampaign)
  const removeCampaign = useAppStore(s => s.removeTestCampaign)
  const proc = sif.proofTestProcedure ?? defaultProcedure(sif)
  const campaigns = (sif.testCampaigns ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))

  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stepDrafts, setStepDrafts] = useState<Record<string, StepResult>>({})
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

  const checklistCompletion = useMemo(() => {
    if (proc.steps.length === 0) return 0
    const done = Object.values(stepDrafts).filter(step => step.done).length
    return Math.round((done / proc.steps.length) * 100)
  }, [proc.steps.length, stepDrafts])

  const updateStepDraft = (stepId: string, patch: Partial<StepResult>) => {
    setStepDrafts(prev => ({
      ...prev,
      [stepId]: {
        stepId,
        done: prev[stepId]?.done ?? false,
        result: prev[stepId]?.result ?? 'na',
        measuredValue: prev[stepId]?.measuredValue ?? '',
        comment: prev[stepId]?.comment ?? '',
        ...patch,
      },
    }))
  }

  const submitCampaign = () => {
    if (!form.date) return
    const stepResults: StepResult[] = proc.steps.map(step => stepDrafts[step.id] ?? {
      stepId: step.id,
      done: false,
      result: 'na',
      measuredValue: '',
      comment: '',
    })

    const campaign: TestCampaign = {
      id: nanoid(),
      date: form.date,
      team: form.team ?? '',
      operatingMode: form.operatingMode ?? '',
      processLoad: form.processLoad ?? '',
      sifResponseTimeMs: form.sifResponseTimeMs ?? 0,
      valveReactionTimeMs: form.valveReactionTimeMs ?? 0,
      verdict: (form.verdict as CampaignVerdict) ?? 'pass',
      notes: form.notes ?? '',
      stepResults,
      conductedBy: form.conductedBy ?? '',
      witnessedBy: form.witnessedBy ?? '',
      reviewedBy: form.reviewedBy ?? '',
    }

    addCampaign(projectId, sif.id, campaign)
    setShowForm(false)
    setStepDrafts({})
    setForm({
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
  }

  const passRate = campaigns.length ? Math.round((campaigns.filter(c => c.verdict === 'pass').length / campaigns.length) * 100) : null

  return (
    <div className="space-y-5">
      {campaigns.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total campaigns', value: String(campaigns.length) },
            { label: 'Pass rate', value: passRate != null ? `${passRate}%` : '—' },
            { label: 'Latest campaign', value: campaigns[0]?.date ?? '—' },
            { label: 'Checklist completion', value: campaigns[0]?.stepResults?.length ? `${Math.round((campaigns[0].stepResults.filter(s => s.done).length / campaigns[0].stepResults.length) * 100)}%` : '—' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl border bg-card px-4 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{kpi.label}</p>
              <p className="text-lg font-bold font-mono">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <SectionLabel
          number="01"
          title="Campaign execution"
          subtitle="Guided capture: context, measurements and step evidence"
          action={
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowForm(s => !s)}>
              {showForm ? <><X size={11} /> Cancel</> : <><Plus size={11} /> New campaign</>}
            </Button>
          }
        />

        {showForm && (
          <div className="rounded-xl border-2 border-primary/30 bg-card p-5 mb-4 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-primary">Campaign wizard</p>
              <span className="text-[10px] text-muted-foreground font-mono">Checklist completion: {checklistCompletion}%</span>
            </div>

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

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">SIF response time (ms)</Label>
                <Input type="number" min={0} value={form.sifResponseTimeMs} onChange={e => setForm(f => ({ ...f, sifResponseTimeMs: +e.target.value }))} className="h-8 text-sm font-mono" />
                <p className="text-[9px] text-muted-foreground">Target ≤ {proc.targetSIFResponseMs} ms</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valve reaction time (ms)</Label>
                <Input type="number" min={0} value={form.valveReactionTimeMs} onChange={e => setForm(f => ({ ...f, valveReactionTimeMs: +e.target.value }))} className="h-8 text-sm font-mono" />
                <p className="text-[9px] text-muted-foreground">Target ≤ {proc.targetValveReactionMs} ms</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Verdict</Label>
                <Select value={(form.verdict as string) ?? 'pass'} onValueChange={v => setForm(f => ({ ...f, verdict: v as CampaignVerdict }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">PASS</SelectItem>
                    <SelectItem value="conditional">CONDITIONAL</SelectItem>
                    <SelectItem value="fail">FAIL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/10 p-4">
              <p className="text-xs font-semibold mb-2">Step evidence capture</p>
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {proc.steps.map((step, idx) => {
                  const draft = stepDrafts[step.id] ?? { stepId: step.id, done: false, result: 'na' as const, measuredValue: '', comment: '' }
                  return (
                    <div key={step.id} className="grid grid-cols-[24px_1fr_130px_120px] gap-2 items-start rounded-lg border bg-card p-2.5">
                      <span className="text-[10px] text-muted-foreground font-mono mt-1">{idx + 1}</span>
                      <div>
                        <p className="text-xs font-medium">{step.description}</p>
                        <Input
                          className="h-7 text-xs mt-1"
                          placeholder="Measured value / reference"
                          value={draft.measuredValue}
                          onChange={e => updateStepDraft(step.id, { measuredValue: e.target.value, done: true })}
                        />
                      </div>
                      <Select value={draft.result} onValueChange={value => updateStepDraft(step.id, { result: value as StepResult['result'], done: value !== 'na' })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pass">Pass</SelectItem>
                          <SelectItem value="fail">Fail</SelectItem>
                          <SelectItem value="na">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-7 text-xs"
                        placeholder="Comment"
                        value={draft.comment}
                        onChange={e => updateStepDraft(step.id, { comment: e.target.value })}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Input placeholder="Process load" value={form.processLoad} onChange={e => setForm(f => ({ ...f, processLoad: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Conducted by" value={form.conductedBy} onChange={e => setForm(f => ({ ...f, conductedBy: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Witnessed by" value={form.witnessedBy} onChange={e => setForm(f => ({ ...f, witnessedBy: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Reviewed by" value={form.reviewedBy} onChange={e => setForm(f => ({ ...f, reviewedBy: e.target.value }))} className="h-8 text-xs" />
            </div>
            <Textarea placeholder="Campaign notes, incidents, corrective actions..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs" />

            <div className="flex justify-end">
              <Button onClick={submitCampaign} className="h-8 text-xs px-4 gap-1.5"><Save size={12} /> Save campaign</Button>
            </div>
          </div>
        )}

        {campaigns.length > 0 && (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/15 border-b">
                <tr>
                  {['Date', 'Team', 'SIF RT', 'Valve RT', 'Verdict', 'Checklist', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const vm = VERDICT_META[c.verdict]
                  const completion = c.stepResults?.length ? Math.round((c.stepResults.filter(step => step.done).length / c.stepResults.length) * 100) : 0
                  return (
                    <>
                      <tr key={c.id} className="border-b hover:bg-muted/10 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                        <td className="px-4 py-3 font-mono">{c.date}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.team || '—'}</td>
                        <td className="px-4 py-3 font-mono">{c.sifResponseTimeMs} ms</td>
                        <td className="px-4 py-3 font-mono">{c.valveReactionTimeMs} ms</td>
                        <td className="px-4 py-3"><span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: vm.bg, color: vm.color }}>{vm.label}</span></td>
                        <td className="px-4 py-3 font-mono">{completion}%</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {expandedId === c.id ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
                            <button onClick={e => { e.stopPropagation(); removeCampaign(projectId, sif.id, c.id) }} className="p-1 text-destructive/30 hover:text-destructive rounded">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === c.id && (
                        <tr className="bg-muted/5 border-b" key={`${c.id}-detail`}>
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                              <p><span className="text-muted-foreground">Operating mode:</span> {c.operatingMode || '—'}</p>
                              <p><span className="text-muted-foreground">Load:</span> {c.processLoad || '—'}</p>
                              <p><span className="text-muted-foreground">Sign-off:</span> {c.conductedBy || '—'} / {c.witnessedBy || '—'} / {c.reviewedBy || '—'}</p>
                            </div>
                            <div className="rounded-lg border overflow-hidden">
                              <table className="w-full text-[11px]">
                                <thead className="bg-muted/20">
                                  <tr>
                                    <th className="text-left px-3 py-1.5">Step</th>
                                    <th className="text-left px-3 py-1.5 w-20">Result</th>
                                    <th className="text-left px-3 py-1.5 w-40">Measured</th>
                                    <th className="text-left px-3 py-1.5">Comment</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.stepResults.map(step => (
                                    <tr key={step.stepId} className="border-t">
                                      <td className="px-3 py-1.5 font-mono">{step.stepId.slice(0, 8)}</td>
                                      <td className="px-3 py-1.5 uppercase">{step.result}</td>
                                      <td className="px-3 py-1.5">{step.measuredValue || '—'}</td>
                                      <td className="px-3 py-1.5">{step.comment || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{c.notes || 'No notes'}</p>
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

  const lastCampaign = campaigns.length ? campaigns[campaigns.length - 1] : undefined
  const prevCampaign = campaigns.length > 1 ? campaigns[campaigns.length - 2] : undefined
  const lastSIF   = lastCampaign?.sifResponseTimeMs
  const lastValve = lastCampaign?.valveReactionTimeMs
  const prevSIF   = prevCampaign?.sifResponseTimeMs
  const prevValve = prevCampaign?.valveReactionTimeMs

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

      <ProofTestQuickJump />

      <section id="pt-studio" className="scroll-mt-20">
        <StudioView sif={sif} />
      </section>

      <section id="pt-procedure" className="scroll-mt-20 mt-6">
        <ProcedureView sif={sif} projectId={project.id} />
      </section>

      <section id="pt-campaigns" className="scroll-mt-20 mt-6">
        <CampaignsView sif={sif} projectId={project.id} />
      </section>

      <section id="pt-performance" className="scroll-mt-20 mt-6">
        <PerformanceView sif={sif} />
      </section>
    </div>
  )
}
