/**
 * ComponentParamsSheet — v2
 *
 * Redesigned side panel:
 * ─ Sticky header with live SFF/DC/PFD metrics
 * ─ Left nav (icon + label tabs) instead of top tabs
 * ─ Sliders with live readout for key % fields
 * ─ Derived values always visible in a computed card
 * ─ Clean two-column grid layout throughout
 */
import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/appStore'
import {
  calcComponentSFF, calcComponentDC,
  factorizedToDeveloped, formatPct, formatPFD,
} from '@/core/math/pfdCalc'
import type {
  SIFComponent, ParamMode, TestType, NatureType, InstrumentCategory,
} from '@/core/types'
import {
  Tag, FlaskConical, ClipboardList, Settings2, ChevronRight,
  Info, Save, X, Activity, Cpu, Zap, TrendingDown, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Static data ──────────────────────────────────────────────────────────
const INSTRUMENT_CATEGORIES: InstrumentCategory[] = [
  'transmitter', 'switch', 'valve', 'positioner', 'controller', 'relay', 'other',
]
const INSTRUMENT_TYPES: Record<InstrumentCategory, string[]> = {
  transmitter: ['Pressure transmitter', 'Temperature transmitter', 'Flow transmitter', 'Level transmitter', 'Differential pressure transmitter'],
  switch:      ['Pressure switch', 'Temperature switch', 'Flow switch', 'Level switch', 'Vibration switch'],
  valve:       ['On-off valve', 'Control valve', 'Solenoid valve', 'Ball valve', 'Butterfly valve'],
  positioner:  ['Electro-pneumatic positioner', 'Digital positioner'],
  controller:  ['Safety PLC', 'Safety relay module', 'Safety controller'],
  relay:       ['Safety relay', 'Interposing relay'],
  other:       ['Other'],
}
const NATURE_OPTIONS: NatureType[] = ['instrument', 'valve', 'relay', 'controller', 'other']
const TEST_TYPES: { value: TestType; label: string; desc: string }[] = [
  { value: 'stopped', label: 'Stopped unit',   desc: 'Tested when unit is stopped (most common)' },
  { value: 'online',  label: 'Online test',     desc: 'Full test while in service' },
  { value: 'partial', label: 'Partial stroke',  desc: 'Partial proof test (PST for valves)' },
  { value: 'none',    label: 'No test',         desc: 'No functional proof test' },
]

type NavTab = 'identification' | 'parameters' | 'test' | 'advanced'

const NAV: { id: NavTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'identification', label: 'Identification', icon: Tag,          desc: 'Tag, type, source'   },
  { id: 'parameters',     label: 'Parameters',     icon: FlaskConical, desc: 'λ, DCd, SFF'        },
  { id: 'test',           label: 'Test',           icon: ClipboardList,desc: 'T1, test type'      },
  { id: 'advanced',       label: 'Advanced',       icon: Settings2,    desc: 'MTTR, partial test' },
]

// ─── Sub-components ───────────────────────────────────────────────────────

/** Group label */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70 mb-3">
      {children}
    </p>
  )
}

/** Field row: label + input */
function FieldRow({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label className="text-xs font-medium">{label}</Label>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/** Percentage slider + input combo */
function PctField({ label, hint, value, onChange }: {
  label: string; hint?: string
  value: number; onChange: (v: number) => void
}) {
  const pct = Math.round(value * 100)
  const hue = value < 0.5 ? `hsl(${Math.round(value * 200)}, 80%, 45%)` : `hsl(${Math.round(value * 200)}, 70%, 40%)`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs font-mono font-bold" style={{ color: hue }}>{pct}%</span>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground -mt-1">{hint}</p>}
      <input
        type="range" min={0} max={100} step={1}
        value={pct}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${hue} ${pct}%, hsl(214, 32%, 88%) ${pct}%)`,
        }}
      />
    </div>
  )
}

/** Readonly computed field */
function ComputedField({ label, value, unit, good }: {
  label: string; value: string; unit?: string; good?: boolean
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-sm font-bold font-mono', good !== undefined && (good ? 'text-emerald-500' : 'text-amber-500'))}>
          {value}
        </span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────
interface Props {
  open: boolean; onClose: () => void
  component: SIFComponent
  subsystemId: string; channelId: string
  projectId: string; sifId: string
}

export function ComponentParamsSheet({
  open, onClose, component, subsystemId, channelId, projectId, sifId,
}: Props) {
  const updateComponent = useAppStore(s => s.updateComponent)
  const [activeTab, setActiveTab] = useState<NavTab>('identification')
  const [paramMode, setParamMode] = useState<ParamMode>(component.paramMode)

  const { register, handleSubmit, watch, setValue, control, reset } =
    useForm<SIFComponent>({ defaultValues: component })

  useEffect(() => {
    reset(component)
    setParamMode(component.paramMode)
    setActiveTab('identification')
  }, [component, reset])

  const watchedFactorized = watch('factorized')
  const watchedDeveloped  = watch('developed')
  const watchedCategory   = watch('instrumentCategory')

  const derivedDeveloped = useMemo(() => {
    if (paramMode !== 'factorized') return null
    return factorizedToDeveloped(watchedFactorized)
  }, [paramMode, watchedFactorized])

  const effectiveDeveloped = paramMode === 'factorized' ? derivedDeveloped! : watchedDeveloped
  const SFF = effectiveDeveloped ? calcComponentSFF(effectiveDeveloped) : 0
  const DC  = effectiveDeveloped ? calcComponentDC(effectiveDeveloped)  : 0

  const PFD: null = null // component-level PFD is computed at subsystem level

  const onSubmit = (data: SIFComponent) => {
    const updated: SIFComponent = {
      ...data,
      paramMode,
      developed: paramMode === 'factorized' ? factorizedToDeveloped(data.factorized) : data.developed,
    }
    updateComponent(projectId, sifId, subsystemId, channelId, updated)
    onClose()
  }

  const typeColors = { sensor: '#0891B2', logic: '#6366F1', actuator: '#EA580C' }
  const color = typeColors[component.subsystemType]

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] p-0 flex flex-col gap-0 border-l">

        {/* ── Sticky header ── */}
        <div className="shrink-0 border-b" style={{ background: `${color}07` }}>
          {/* Title row */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-bold font-mono tracking-tight" style={{ color }}>
                  {component.tagName}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono capitalize shrink-0">
                  {component.subsystemType}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {component.instrumentType || component.instrumentCategory}
                {component.manufacturer && ` · ${component.manufacturer}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>

          {/* Live metrics strip */}
          <div className="grid grid-cols-3 divide-x border-t">
            <div className="px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">SFF</p>
              <p className={cn('text-sm font-bold font-mono', SFF >= 0.6 ? 'text-emerald-500' : 'text-amber-500')}>
                {formatPct(SFF)}
              </p>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">DC</p>
              <p className={cn('text-sm font-bold font-mono', DC >= 0.6 ? 'text-emerald-500' : 'text-amber-500')}>
                {formatPct(DC)}
              </p>
            </div>

            <div className="px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">Mode</p>
              <button
                type="button"
                onClick={() => setParamMode(m => m === 'factorized' ? 'developed' : 'factorized')}
                className="text-[10px] font-semibold text-primary hover:underline capitalize"
              >
                {paramMode}
              </button>
            </div>
          </div>
        </div>

        {/* ── Body: left nav + content ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0">

          {/* Left nav */}
          <div className="w-36 shrink-0 border-r bg-muted/10 flex flex-col py-2">
            {NAV.map(tab => {
              const Icon    = tab.icon
              const isActive= activeTab === tab.id
              return (
                <button key={tab.id} type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors border-l-2',
                    isActive
                      ? 'border-primary bg-primary/8 text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
                  )}
                >
                  <Icon size={13} className={cn('mt-0.5 shrink-0', isActive ? 'text-primary' : '')} />
                  <div>
                    <p className={cn('text-xs font-semibold leading-tight', isActive && 'text-primary')}>
                      {tab.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{tab.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Content pane */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5">

            {/* ── IDENTIFICATION ── */}
            {activeTab === 'identification' && (
              <div className="space-y-4">
                <GroupLabel>Identity</GroupLabel>
                <FieldRow label="Tag name">
                  <Input className="font-mono text-sm" {...register('tagName')} />
                </FieldRow>
                <FieldRow label="Description">
                  <Input placeholder="Function or location description" {...register('description')} />
                </FieldRow>

                <div className="h-px bg-border my-2" />
                <GroupLabel>Classification</GroupLabel>

                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Nature">
                    <Controller name="nature" control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {NATURE_OPTIONS.map(n => (
                              <SelectItem key={n} value={n} className="capitalize text-xs">{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldRow>

                  <FieldRow label="Category">
                    <Controller name="instrumentCategory" control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INSTRUMENT_CATEGORIES.map(c => (
                              <SelectItem key={c} value={c} className="capitalize text-xs">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldRow>
                </div>

                <FieldRow label="Instrument type">
                  <Controller name="instrumentType" control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(INSTRUMENT_TYPES[watchedCategory] ?? INSTRUMENT_TYPES.other).map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldRow>

                <div className="h-px bg-border my-2" />
                <GroupLabel>Traceability</GroupLabel>

                <FieldRow label="Manufacturer">
                  <Input placeholder="e.g. Emerson, Endress+Hauser" className="text-xs" {...register('manufacturer')} />
                </FieldRow>
                <FieldRow label="Data source" hint="Failure rate origin">
                  <Input placeholder="exida SERH, OREDA, vendor certificate…" className="text-xs" {...register('dataSource')} />
                </FieldRow>
              </div>
            )}

            {/* ── PARAMETERS ── */}
            {activeTab === 'parameters' && (
              <div className="space-y-4">
                {/* Mode toggle */}
                <div className="flex rounded-xl border overflow-hidden">
                  {(['factorized', 'developed'] as ParamMode[]).map(m => (
                    <button key={m} type="button" onClick={() => setParamMode(m)}
                      className={cn(
                        'flex-1 py-2 text-xs font-semibold capitalize transition-colors',
                        paramMode === m ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground -mt-1">
                  {paramMode === 'factorized'
                    ? 'Enter λ total + ratios — developed values computed automatically'
                    : 'Enter λDU, λDD, λSU, λSD directly (FIT = 10⁻⁹ h⁻¹)'}
                </p>

                {/* Factorized inputs */}
                {paramMode === 'factorized' && (
                  <div className="space-y-4">
                    <GroupLabel>Failure rates</GroupLabel>
                    <FieldRow label="λ total" hint="Total failure rate">
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.01" className="font-mono text-sm"
                          {...register('factorized.lambda', { valueAsNumber: true })} />
                        <span className="text-xs font-mono text-muted-foreground shrink-0">×10⁻⁶ h⁻¹</span>
                      </div>
                    </FieldRow>

                    <PctField label="λD/λ — Dangerous fraction"
                      hint="Fraction of failures that are dangerous"
                      value={watch('factorized.lambdaDRatio') ?? 0.25}
                      onChange={v => setValue('factorized.lambdaDRatio', v)}
                    />
                    <PctField label="DCd — Dangerous coverage"
                      hint="Fraction of dangerous failures detected by diagnostics"
                      value={watch('factorized.DCd') ?? 0.7}
                      onChange={v => setValue('factorized.DCd', v)}
                    />
                    <PctField label="DCs — Safe coverage"
                      hint="Fraction of safe failures detected"
                      value={watch('factorized.DCs') ?? 1.0}
                      onChange={v => setValue('factorized.DCs', v)}
                    />
                  </div>
                )}

                {/* Developed inputs */}
                {paramMode === 'developed' && (
                  <div className="space-y-3">
                    <GroupLabel>Developed failure rates (FIT)</GroupLabel>
                    {([
                      ['developed.lambda_DU', 'λDU', 'Dangerous Undetected'],
                      ['developed.lambda_DD', 'λDD', 'Dangerous Detected'],
                      ['developed.lambda_SU', 'λSU', 'Safe Undetected'],
                      ['developed.lambda_SD', 'λSD', 'Safe Detected'],
                    ] as [string, string, string][]).map(([key, sym, label]) => (
                      <FieldRow key={key} label={`${sym} — ${label}`}>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="0.001" min={0} className="font-mono text-sm"
                            {...register(key as any, { valueAsNumber: true })} />
                          <span className="text-xs font-mono text-muted-foreground shrink-0">FIT</span>
                        </div>
                      </FieldRow>
                    ))}
                  </div>
                )}

                {/* Computed card */}
                <div className="h-px bg-border" />
                <GroupLabel>Computed results</GroupLabel>
                <div className="grid grid-cols-2 gap-2">
                  <ComputedField label="SFF" value={formatPct(SFF)} good={SFF >= 0.6} />
                  <ComputedField label="DC" value={formatPct(DC)} good={DC >= 0.6} />
                </div>

                {/* Derived developed breakdown */}
                {derivedDeveloped && paramMode === 'factorized' && (
                  <div className="rounded-lg border bg-muted/10 p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2">→ Derived developed values</p>
                    {Object.entries({
                      'λDU': derivedDeveloped.lambda_DU,
                      'λDD': derivedDeveloped.lambda_DD,
                      'λSU': derivedDeveloped.lambda_SU,
                      'λSD': derivedDeveloped.lambda_SD,
                    }).map(([sym, val]) => (
                      <div key={sym} className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground">{sym}</span>
                        <span>{val.toExponential(3)} FIT</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TEST ── */}
            {activeTab === 'test' && (
              <div className="space-y-4">
                <GroupLabel>Proof test configuration</GroupLabel>

                <FieldRow label="Test type">
                  <Controller name="test.testType" control={control}
                    render={({ field }) => (
                      <div className="space-y-1.5">
                        {TEST_TYPES.map(t => (
                          <button key={t.value} type="button"
                            onClick={() => field.onChange(t.value)}
                            className={cn(
                              'w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left transition-all',
                              field.value === t.value
                                ? 'border-primary/40 bg-primary/8'
                                : 'border-border/50 bg-card hover:border-border hover:bg-muted/20',
                            )}
                          >
                            <div className={cn(
                              'w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center',
                              field.value === t.value ? 'border-primary' : 'border-muted-foreground/30',
                            )}>
                              {field.value === t.value && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div>
                              <p className={cn('text-xs font-semibold', field.value === t.value && 'text-primary')}>{t.label}</p>
                              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </FieldRow>

                <div className="h-px bg-border" />
                <GroupLabel>Intervals</GroupLabel>

                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="T1 — Proof test interval">
                    <div className="flex gap-1.5">
                      <Input type="number" step="0.1" min={0} className="font-mono text-sm"
                        {...register('test.T1', { valueAsNumber: true })} />
                      <Controller name="test.T1Unit" control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-20 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yr" className="text-xs">Year(s)</SelectItem>
                              <SelectItem value="hr" className="text-xs">Hour(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </FieldRow>

                  <FieldRow label="T0 — First test">
                    <div className="flex gap-1.5">
                      <Input type="number" step="0.1" min={0} className="font-mono text-sm"
                        {...register('test.T0', { valueAsNumber: true })} />
                      <Controller name="test.T0Unit" control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-20 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yr" className="text-xs">Year(s)</SelectItem>
                              <SelectItem value="hr" className="text-xs">Hour(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </FieldRow>
                </div>
              </div>
            )}

            {/* ── ADVANCED ── */}
            {activeTab === 'advanced' && (
              <div className="space-y-4">
                <GroupLabel>Repair & availability</GroupLabel>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="MTTR" hint="Mean time to repair">
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} className="font-mono text-sm"
                        {...register('advanced.MTTR', { valueAsNumber: true })} />
                      <span className="text-xs text-muted-foreground shrink-0">h</span>
                    </div>
                  </FieldRow>
                  <FieldRow label="Lifetime">
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} placeholder="—" className="font-mono text-sm"
                        {...register('advanced.lifetime', { valueAsNumber: true })} />
                      <span className="text-xs text-muted-foreground shrink-0">yr</span>
                    </div>
                  </FieldRow>
                </div>

                <div className="h-px bg-border" />
                <GroupLabel>Test quality factors</GroupLabel>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'advanced.gamma',   label: 'γ — Failure due to test',   unit: 'prob.' },
                    { key: 'advanced.sigma',   label: 'σ — Test efficiency',        unit: 'prob.' },
                    { key: 'advanced.omega1',  label: 'ω₁ — Setup error (test)',    unit: 'prob.' },
                    { key: 'advanced.omega2',  label: 'ω₂ — Setup error (repair)',  unit: 'prob.' },
                  ].map(f => (
                    <FieldRow key={f.key} label={f.label}>
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.001" min={0} max={1} className="font-mono text-sm"
                          {...register(f.key as any, { valueAsNumber: true })} />
                        <span className="text-xs text-muted-foreground shrink-0">{f.unit}</span>
                      </div>
                    </FieldRow>
                  ))}
                </div>

                <PctField label="Proof test coverage"
                  hint="Fraction of faults revealed by the proof test"
                  value={watch('advanced.proofTestCoverage') ?? 1}
                  onChange={v => setValue('advanced.proofTestCoverage', v)}
                />

                <PctField label="DC alarmed only"
                  hint="Diagnostics that alarm but do not shutdown"
                  value={watch('advanced.DCalarmedOnly') ?? 0}
                  onChange={v => setValue('advanced.DCalarmedOnly', v)}
                />

                <div className="h-px bg-border" />
                <GroupLabel>Partial proof test (PST)</GroupLabel>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-medium">Enable partial test</p>
                    <p className="text-[10px] text-muted-foreground">Intermediate partial proof test between full tests</p>
                  </div>
                  <Controller name="advanced.partialTest.enabled" control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                {watch('advanced.partialTest.enabled') && (
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 border-primary/20">
                    <FieldRow label="Duration (π)">
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} className="font-mono text-sm"
                          {...register('advanced.partialTest.duration', { valueAsNumber: true })} />
                        <span className="text-xs text-muted-foreground shrink-0">h</span>
                      </div>
                    </FieldRow>
                    <FieldRow label="Number of tests">
                      <Input type="number" min={1} step={1} className="font-mono text-sm"
                        {...register('advanced.partialTest.numberOfTests', { valueAsNumber: true })} />
                    </FieldRow>
                    <div className="col-span-2">
                      <PctField label="Detected faults"
                        value={watch('advanced.partialTest.detectedFaultsPct') ?? 0.5}
                        onChange={v => setValue('advanced.partialTest.detectedFaultsPct', v)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t px-5 py-3 flex items-center justify-between bg-card gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info size={11} />
            <span>Changes apply immediately on Save</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button" size="sm" className="h-8 text-xs gap-1.5"
              onClick={handleSubmit(onSubmit)}
            >
              <Save size={12} /> Save component
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}