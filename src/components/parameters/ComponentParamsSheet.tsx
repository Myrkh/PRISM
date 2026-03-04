/**
 * ComponentParamsSheet
 * Full GRIF-style parameter panel in a side sheet:
 * - Identification tab
 * - Instrument Parameters (Factorized / Developed)
 * - Test Parameters
 * - Advanced Parameters
 */
import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/appStore'
import {
  calcComponentSFF, calcComponentDC,
  factorizedToDeveloped, formatPct,
} from '@/core/math/pfdCalc'
import type {
  SIFComponent, ParamMode, TestType, NatureType, InstrumentCategory,
} from '@/core/types'

interface Props {
  open: boolean
  onClose: () => void
  component: SIFComponent
  subsystemId: string
  channelId: string
  projectId: string
  sifId: string
}

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
const TEST_TYPES: { value: TestType; label: string }[] = [
  { value: 'stopped', label: 'Tested when unit is stopped' },
  { value: 'online',  label: 'Online test' },
  { value: 'partial', label: 'Partial stroke test' },
  { value: 'none',    label: 'No test' },
]

/** Section label */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </p>
  )
}

/** Read-only derived field */
function DerivedField({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-md border bg-muted/40 px-3 py-1.5 text-sm font-mono text-muted-foreground">
          {value}
        </div>
        <span className="text-xs font-mono text-muted-foreground w-10">{unit}</span>
      </div>
    </div>
  )
}

export function ComponentParamsSheet({ open, onClose, component, subsystemId, channelId, projectId, sifId }: Props) {
  const updateComponent = useAppStore(s => s.updateComponent)
  const [paramMode, setParamMode] = useState<ParamMode>(component.paramMode)

  const { register, handleSubmit, watch, setValue, control, reset } = useForm<SIFComponent>({
    defaultValues: component,
  })

  useEffect(() => {
    reset(component)
    setParamMode(component.paramMode)
  }, [component, reset])

  const watchedFactorized = watch('factorized')
  const watchedDeveloped  = watch('developed')

  // Auto-compute developed from factorized
  const derivedDeveloped = useMemo(() => {
    if (paramMode !== 'factorized') return null
    return factorizedToDeveloped(watchedFactorized)
  }, [paramMode, watchedFactorized])

  const effectiveDeveloped = paramMode === 'factorized' ? derivedDeveloped! : watchedDeveloped
  const SFF = effectiveDeveloped ? calcComponentSFF(effectiveDeveloped) : 0
  const DC  = effectiveDeveloped ? calcComponentDC(effectiveDeveloped)  : 0

  const onSubmit = (data: SIFComponent) => {
    const updated: SIFComponent = {
      ...data,
      paramMode,
      developed: paramMode === 'factorized' ? factorizedToDeveloped(data.factorized) : data.developed,
    }
    updateComponent(projectId, sifId, subsystemId, channelId, updated)
    onClose()
  }

  const watchedCategory = watch('instrumentCategory')
  const T1Unit = watch('test.T1Unit')
  const T0Unit = watch('test.T0Unit')

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-3">
            <span className="font-mono text-base">{component.tagName}</span>
            <Badge variant="outline" className="text-xs font-mono">
              {component.instrumentType || component.instrumentCategory}
            </Badge>
          </SheetTitle>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>SFF: <strong className="text-foreground font-mono">{formatPct(SFF)}</strong></span>
            <span>DC: <strong className="text-foreground font-mono">{formatPct(DC)}</strong></span>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="identification" className="h-full">
              <TabsList className="w-full rounded-none border-b h-10 bg-transparent justify-start gap-0 px-6">
                {[
                  { value: 'identification', label: 'Identification' },
                  { value: 'parameters',     label: 'Parameters' },
                  { value: 'test',           label: 'Test' },
                  { value: 'advanced',       label: 'Advanced' },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-10 text-xs"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ── Identification ── */}
              <TabsContent value="identification" className="px-6 py-5 space-y-5">
                <div className="space-y-1.5">
                  <Label>Tag name</Label>
                  <Input className="font-mono" {...register('tagName')} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nature</Label>
                    <Controller
                      name="nature"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {NATURE_OPTIONS.map(n => (
                              <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Instrument category</Label>
                    <Controller
                      name="instrumentCategory"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INSTRUMENT_CATEGORIES.map(c => (
                              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Instrument type</Label>
                  <Controller
                    name="instrumentType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(INSTRUMENT_TYPES[watchedCategory] ?? INSTRUMENT_TYPES.other).map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Manufacturer</Label>
                  <Input placeholder="e.g. Emerson, Endress+Hauser" {...register('manufacturer')} />
                </div>

                <div className="space-y-1.5">
                  <Label>Data source</Label>
                  <Input placeholder="e.g. exida, vendor certificate, MIL-HDBK-217" {...register('dataSource')} />
                </div>

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input {...register('description')} />
                </div>
              </TabsContent>

              {/* ── Parameters ── */}
              <TabsContent value="parameters" className="px-6 py-5 space-y-6">
                {/* Mode selector */}
                <RadioGroup
                  value={paramMode}
                  onValueChange={v => setParamMode(v as ParamMode)}
                  className="flex gap-4"
                >
                  {[
                    { value: 'factorized', label: 'Factorized' },
                    { value: 'developed',  label: 'Developed' },
                  ].map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} />
                      <Label htmlFor={`mode-${opt.value}`} className="cursor-pointer font-medium">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <Separator />

                {/* Factorized inputs */}
                {paramMode === 'factorized' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Lambda (λ)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" step="0.01" className="font-mono"
                          {...register('factorized.lambda', { valueAsNumber: true })}
                        />
                        <span className="text-xs font-mono text-muted-foreground">×10⁻⁶ h⁻¹</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>λD/λ</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" step="0.1" min={0} max={100} className="font-mono"
                          {...register('factorized.lambdaDRatio', {
                            valueAsNumber: true,
                            setValueAs: v => v / 100,
                          })}
                          value={(watchedFactorized?.lambdaDRatio ?? 0.25) * 100}
                          onChange={e => setValue('factorized.lambdaDRatio', Number(e.target.value) / 100)}
                        />
                        <span className="text-xs font-mono text-muted-foreground">%</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>DCd — Dangerous coverage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" step="0.1" min={0} max={100} className="font-mono"
                          value={(watchedFactorized?.DCd ?? 0.7) * 100}
                          onChange={e => setValue('factorized.DCd', Number(e.target.value) / 100)}
                        />
                        <span className="text-xs font-mono text-muted-foreground">%</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>DCs — Safe coverage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" step="0.1" min={0} max={100} className="font-mono"
                          value={(watchedFactorized?.DCs ?? 1.0) * 100}
                          onChange={e => setValue('factorized.DCs', Number(e.target.value) / 100)}
                        />
                        <span className="text-xs font-mono text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Developed inputs */}
                {paramMode === 'developed' && (
                  <div className="grid grid-cols-2 gap-4">
                    {([
                      ['developed.lambda_DU', 'λDU — Dangerous Undetected'],
                      ['developed.lambda_DD', 'λDD — Dangerous Detected'],
                      ['developed.lambda_SU', 'λSU — Safe Undetected'],
                      ['developed.lambda_SD', 'λSD — Safe Detected'],
                    ] as [keyof SIFComponent, string][]).map(([key, label]) => (
                      <div key={key} className="space-y-1.5">
                        <Label>{label}</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" step="0.001" min={0} className="font-mono"
                            {...register(key as any, { valueAsNumber: true })}
                          />
                          <span className="text-xs font-mono text-muted-foreground">FIT</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Derived / Computed values */}
                <div>
                  <SectionLabel>Computed (Developed values)</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {derivedDeveloped && paramMode === 'factorized' && Object.entries({
                      'λDU': derivedDeveloped.lambda_DU,
                      'λDD': derivedDeveloped.lambda_DD,
                      'λSU': derivedDeveloped.lambda_SU,
                      'λSD': derivedDeveloped.lambda_SD,
                    }).map(([label, val]) => (
                      <DerivedField
                        key={label}
                        label={label}
                        value={val.toExponential(3)}
                        unit="FIT"
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex gap-6 p-3 rounded-lg bg-muted/40 border text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">SFF</span>
                      <p className="font-mono font-semibold">{formatPct(SFF)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">DC</span>
                      <p className="font-mono font-semibold">{formatPct(DC)}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── Test ── */}
              <TabsContent value="test" className="px-6 py-5 space-y-5">
                <div className="space-y-1.5">
                  <Label>Test type</Label>
                  <Controller
                    name="test.testType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TEST_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Interval between tests (T1)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number" step="0.1" min={0} className="font-mono"
                        {...register('test.T1', { valueAsNumber: true })}
                      />
                      <Controller
                        name="test.T1Unit"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hr">Hour(s)</SelectItem>
                              <SelectItem value="yr">Year(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Time of first test (T0)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number" step="0.1" min={0} className="font-mono"
                        {...register('test.T0', { valueAsNumber: true })}
                      />
                      <Controller
                        name="test.T0Unit"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hr">Hour(s)</SelectItem>
                              <SelectItem value="yr">Year(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── Advanced ── */}
              <TabsContent value="advanced" className="px-6 py-5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>MTTR</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} className="font-mono"
                        {...register('advanced.MTTR', { valueAsNumber: true })}
                      />
                      <span className="text-xs font-mono text-muted-foreground">h</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Failure due to test (γ)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.001" min={0} max={1} className="font-mono"
                        {...register('advanced.gamma', { valueAsNumber: true })}
                      />
                      <span className="text-xs font-mono text-muted-foreground">prob.</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Test efficiency rate (σ)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.01" min={0} max={1} className="font-mono"
                        {...register('advanced.sigma', { valueAsNumber: true })}
                      />
                      <span className="text-xs font-mono text-muted-foreground">prob.</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Setup error after test (ω1)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.001" min={0} max={1} className="font-mono"
                        {...register('advanced.omega1', { valueAsNumber: true })}
                      />
                      <span className="text-xs font-mono text-muted-foreground">prob.</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Setup error after repair (ω2)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.001" min={0} max={1} className="font-mono"
                        {...register('advanced.omega2', { valueAsNumber: true })}
                      />
                      <span className="text-xs font-mono text-muted-foreground">prob.</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Proof test coverage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.1" min={0} max={100} className="font-mono"
                        defaultValue={100}
                        onChange={e => setValue('advanced.proofTestCoverage', Number(e.target.value) / 100)}
                      />
                      <span className="text-xs font-mono text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lifetime</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} placeholder="—" className="font-mono"
                        {...register('advanced.lifetime', { valueAsNumber: true })}
                      />
                      <span className="text-xs font-mono text-muted-foreground">yr</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>DC alarmed only</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.1" min={0} max={100} className="font-mono"
                        defaultValue={0}
                        onChange={e => setValue('advanced.DCalarmedOnly', Number(e.target.value) / 100)}
                      />
                      <span className="text-xs font-mono text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Partial tests */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Partial tests</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enable intermediate partial proof tests
                      </p>
                    </div>
                    <Controller
                      name="advanced.partialTest.enabled"
                      control={control}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>

                  {watch('advanced.partialTest.enabled') && (
                    <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/30">
                      <div className="space-y-1.5">
                        <Label>Test duration (π)</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" min={0} className="font-mono"
                            {...register('advanced.partialTest.duration', { valueAsNumber: true })} />
                          <span className="text-xs font-mono text-muted-foreground">h</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Detected faults</Label>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="1" min={0} max={100} className="font-mono"
                            defaultValue={50}
                            onChange={e => setValue('advanced.partialTest.detectedFaultsPct', Number(e.target.value) / 100)} />
                          <span className="text-xs font-mono text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Number of tests</Label>
                        <Input type="number" min={1} step={1} className="font-mono"
                          {...register('advanced.partialTest.numberOfTests', { valueAsNumber: true })} />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <SheetFooter className="px-6 py-4 border-t shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Component</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
