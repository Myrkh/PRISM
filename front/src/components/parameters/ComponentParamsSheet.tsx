/**
 * ComponentParamsSheet — PRISM v2  (DA KORE)
 *
 * navy #003D5C / teal #009BA4 / bg #F0F4F8
 *
 * Améliorations vs v1 :
 *  ─ DA KORE complète (exit "primary" tokens shadcn)
 *  ─ Header enrichi : sous-type coloré + badge SFF live en couleur
 *  ─ Nav gauche : active = trait teal + fond navy très léger
 *  ─ Sliders : gradient teal
 *  ─ Mode toggle : pill navy/teal
 *  ─ ComputedField : fond BG avec accent coloré
 *  ─ Footer : bouton Save navy, Cancel ghost
 *  ─ Section PST : border teal au lieu de primary
 *  ─ Test type selector : radio-card avec accent teal
 */
import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/appStore'
import {
  calcComponentSFF, calcComponentDC,
  factorizedToDeveloped, formatPct, formatPFD,
} from '@/core/math/pfdCalc'
import type {
  SIFComponent, ParamMode, TestType, NatureType, InstrumentCategory,
} from '@/core/types'
import {
  Tag, FlaskConical, ClipboardList, Settings2,
  Info, Save, X, Activity, Cpu, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CAT_LABELS, INSTRUMENT_CATEGORIES, INSTRUMENT_TYPES } from '@/components/architecture/componentCatalog'
import { NAVY, NAVY2, PAGE_BG, TEAL } from '@/styles/tokens'

// ─── KORE tokens ──────────────────────────────────────────────────────────
// ─── Subsystem accent colours ─────────────────────────────────────────────
const TYPE_META: Record<string, { color: string; label: string; Icon: React.ElementType }> = {
  sensor:   { color: '#0284C7', label: 'Capteur',     Icon: Activity },
  logic:    { color: '#7C3AED', label: 'Logique',     Icon: Cpu      },
  actuator: { color: '#EA580C', label: 'Actionneur',  Icon: Zap      },
}

// ─── Static data ──────────────────────────────────────────────────────────
const NATURE_OPTIONS: NatureType[] = ['instrument', 'valve', 'relay', 'controller', 'other']
const TEST_TYPES: { value: TestType; label: string; desc: string }[] = [
  { value: 'stopped', label: 'Arrêt unité',      desc: 'Testé à l\'arrêt de l\'unité (le plus courant)' },
  { value: 'online',  label: 'Test en ligne',     desc: 'Test complet en service' },
  { value: 'partial', label: 'Course partielle',  desc: 'Test partiel (PST pour vannes)' },
  { value: 'none',    label: 'Aucun test',        desc: 'Pas de test de preuve fonctionnel' },
]

type NavTab = 'identification' | 'parameters' | 'test' | 'advanced'
const NAV: { id: NavTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'identification', label: 'Identification', icon: Tag,          desc: 'Tag, type, source'    },
  { id: 'parameters',     label: 'Paramètres',     icon: FlaskConical, desc: 'λ, DCd, SFF'          },
  { id: 'test',           label: 'Test',           icon: ClipboardList,desc: 'T1, type de test'     },
  { id: 'advanced',       label: 'Avancé',         icon: Settings2,    desc: 'MTTR, test partiel'   },
]

// ─── Shared input style ───────────────────────────────────────────────────
const BG = PAGE_BG
const inp = 'font-mono text-sm h-8 rounded-xl border-gray-200 focus:border-[#009BA4] focus:ring-1 focus:ring-[#009BA4]/30 transition-all'

// ─── Sub-components ───────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-gray-100" />
      <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: '#9CA3AF' }}>
        {children}
      </p>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  )
}

function FieldRow({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold" style={{ color: NAVY }}>{label}</Label>
      {hint && <p className="text-[10px] -mt-1" style={{ color: '#9CA3AF' }}>{hint}</p>}
      {children}
    </div>
  )
}

function PctField({ label, hint, value, onChange, color = TEAL }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void; color?: string
}) {
  const pct = Math.round(value * 100)
  // Color ramp: low = red → mid = amber → high = teal
  const trackColor = pct < 50 ? '#EF4444' : pct < 70 ? '#F59E0B' : TEAL
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold" style={{ color: NAVY }}>{label}</Label>
        <span className="text-xs font-mono font-bold tabular-nums" style={{ color: trackColor }}>{pct}%</span>
      </div>
      {hint && <p className="text-[10px] -mt-1" style={{ color: '#9CA3AF' }}>{hint}</p>}
      <input
        type="range" min={0} max={100} step={1}
        value={pct}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${trackColor} ${pct}%, #E5E7EB ${pct}%)` }}
      />
    </div>
  )
}

function ComputedField({ label, value, unit, good }: {
  label: string; value: string; unit?: string; good?: boolean
}) {
  const accent = good === undefined ? NAVY : good ? '#15803D' : '#D97706'
  return (
    <div className="rounded-xl border px-3 py-2.5" style={{ background: BG, borderColor: '#E5E7EB' }}>
      <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold font-mono" style={{ color: accent }}>{value}</span>
        {unit && <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{unit}</span>}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
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
  const [paramMode, setParamMode] = useState<ParamMode>(component.paramMode ?? 'factorized')

  const { register, handleSubmit, watch, setValue, control, reset } =
    useForm<SIFComponent>({ defaultValues: component })

  useEffect(() => {
    reset(component)
    setParamMode(component.paramMode ?? 'factorized')
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

  const onSubmit = (data: SIFComponent) => {
    const updated: SIFComponent = {
      ...data, paramMode,
      developed: paramMode === 'factorized' ? factorizedToDeveloped(data.factorized) : data.developed,
    }
    updateComponent(projectId, sifId, subsystemId, channelId, updated)
    onClose()
  }

  const meta = TYPE_META[component.subsystemType] ?? TYPE_META.sensor
  const { color, label: typeLabel, Icon: TypeIcon } = meta

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent
        className="w-[520px] sm:max-w-[520px] p-0 flex flex-col gap-0 border-l"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 border-b" style={{ background: `${color}07` }}>
          {/* Title */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                {/* Tag name */}
                <span className="text-lg font-bold font-mono tracking-tight" style={{ color }}>
                  {component.tagName}
                </span>
                {/* Type badge */}
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border"
                  style={{ background: `${color}12`, color, borderColor: `${color}30` }}
                >
                  <TypeIcon size={9} />{typeLabel}
                </span>
              </div>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {component.instrumentType || component.instrumentCategory}
                {component.manufacturer && <span style={{ color: '#C4C9D4' }}> · {component.manufacturer}</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              style={{ color: '#9CA3AF' }}
            ><X size={14} /></button>
          </div>

          {/* Live metrics strip */}
          <div className="grid grid-cols-4 border-t" style={{ borderColor: `${color}15` }}>
            {/* SFF */}
            <div className="px-4 py-2.5 border-r" style={{ borderColor: `${color}15` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>SFF</p>
              <p className="text-sm font-bold font-mono" style={{ color: SFF >= 0.6 ? '#15803D' : '#D97706' }}>
                {formatPct(SFF)}
              </p>
            </div>
            {/* DC */}
            <div className="px-4 py-2.5 border-r" style={{ borderColor: `${color}15` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>DC</p>
              <p className="text-sm font-bold font-mono" style={{ color: DC >= 0.6 ? '#15803D' : '#D97706' }}>
                {formatPct(DC)}
              </p>
            </div>
            {/* T1 */}
            <div className="px-4 py-2.5 border-r" style={{ borderColor: `${color}15` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>T1</p>
              <p className="text-sm font-bold font-mono" style={{ color: NAVY }}>
                {watch('test.T1') ?? '—'} {watch('test.T1Unit') ?? 'yr'}
              </p>
            </div>
            {/* Mode toggle */}
            <div className="px-3 py-2 flex flex-col justify-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>Mode</p>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['factorized', 'developed'] as ParamMode[]).map(m => (
                  <button key={m} type="button" onClick={() => setParamMode(m)}
                    className="flex-1 py-0.5 text-[8px] font-bold capitalize transition-all"
                    style={paramMode === m
                      ? { background: NAVY, color: 'white' }
                      : { color: '#9CA3AF', background: 'white' }}
                  >{m === 'factorized' ? 'Fact.' : 'Dév.'}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0">

          {/* Left nav */}
          <div className="w-[130px] shrink-0 border-r flex flex-col py-2" style={{ background: BG }}>
            {NAV.map(tab => {
              const Icon     = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-start gap-2 px-3 py-2.5 text-left transition-all border-l-2"
                  style={isActive
                    ? { borderLeftColor: TEAL, background: `${NAVY}08`, color: NAVY }
                    : { borderLeftColor: 'transparent', color: '#9CA3AF' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = NAVY }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#9CA3AF' }}
                >
                  <Icon size={12} className="mt-0.5 shrink-0"
                    style={{ color: isActive ? TEAL : 'currentColor' }}
                  />
                  <div>
                    <p className="text-[11px] font-semibold leading-tight"
                      style={{ color: isActive ? NAVY : 'currentColor' }}
                    >{tab.label}</p>
                    <p className="text-[9px] leading-tight mt-0.5" style={{ color: '#B0B8C4' }}>{tab.desc}</p>
                  </div>
                </button>
              )
            })}

            {/* Quick stats footer */}
            <div className="mt-auto mx-2 mb-2 rounded-xl border border-gray-200 bg-white p-2.5 space-y-1.5">
              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>λ total</p>
              <p className="text-xs font-bold font-mono" style={{ color: NAVY }}>
                {watch('factorized.lambda') ?? '—'}
                <span className="text-[8px] font-normal ml-0.5" style={{ color: '#9CA3AF' }}>×10⁻⁶/h</span>
              </p>
            </div>
          </div>

          {/* Content pane */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4 bg-white">

            {/* ─ IDENTIFICATION ─ */}
            {activeTab === 'identification' && (
              <div className="space-y-4">
                <SectionTitle>Identité</SectionTitle>
                <FieldRow label="Nom / Tag">
                  <Input className={inp} {...register('tagName')} />
                </FieldRow>
                <FieldRow label="Description">
                  <Input className={inp.replace('font-mono text-sm', 'text-xs')}
                    placeholder="Fonction ou localisation" {...register('description')} />
                </FieldRow>

                <SectionTitle>Classification</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Nature">
                    <Controller name="nature" control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-xs rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {NATURE_OPTIONS.map(n => (
                              <SelectItem key={n} value={n} className="capitalize text-xs">{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldRow>

                  <FieldRow label="Catégorie">
                    <Controller name="instrumentCategory" control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-xs rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INSTRUMENT_CATEGORIES.map(c => (
                              <SelectItem key={c} value={c} className="text-xs">{CAT_LABELS[c]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FieldRow>
                </div>

                <FieldRow label="Type d'instrument">
                  <Controller name="instrumentType" control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 text-xs rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(INSTRUMENT_TYPES[watchedCategory] ?? INSTRUMENT_TYPES.other).map(t => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FieldRow>

                <SectionTitle>Traçabilité</SectionTitle>
                <FieldRow label="Fabricant">
                  <Input className={inp.replace('font-mono text-sm', 'text-xs')}
                    placeholder="ex: Emerson, Endress+Hauser" {...register('manufacturer')} />
                </FieldRow>
                <FieldRow label="Source de données" hint="Origine du taux de défaillance">
                  <Input className={inp.replace('font-mono text-sm', 'text-xs')}
                    placeholder="exida SERH, OREDA, certificat fournisseur…" {...register('dataSource')} />
                </FieldRow>
              </div>
            )}

            {/* ─ PARAMETERS ─ */}
            {activeTab === 'parameters' && (
              <div className="space-y-4">
                <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                  {paramMode === 'factorized'
                    ? 'Saisir λ total + ratios — valeurs développées calculées automatiquement'
                    : 'Saisir λDU, λDD, λSU, λSD directement (FIT = 10⁻⁹ h⁻¹)'}
                </p>

                {paramMode === 'factorized' && (
                  <div className="space-y-4">
                    <SectionTitle>Taux de défaillance</SectionTitle>
                    <FieldRow label="λ total" hint="Taux de défaillance total">
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.01" className={inp}
                          {...register('factorized.lambda', { valueAsNumber: true })} />
                        <span className="text-xs font-mono shrink-0" style={{ color: '#9CA3AF' }}>×10⁻⁶ h⁻¹</span>
                      </div>
                    </FieldRow>
                    <PctField label="λD/λ — Fraction dangereuse"
                      hint="Part des défaillances dangereuses"
                      value={watch('factorized.lambdaDRatio') ?? 0.25}
                      onChange={v => setValue('factorized.lambdaDRatio', v)}
                    />
                    <PctField label="DCd — Couverture diagnostique dangereuse"
                      hint="Part des défaillances dangereuses détectées par les diagnostics"
                      value={watch('factorized.DCd') ?? 0.7}
                      onChange={v => setValue('factorized.DCd', v)}
                    />
                    <PctField label="DCs — Couverture diagnostique sûre"
                      hint="Part des défaillances sûres détectées"
                      value={watch('factorized.DCs') ?? 1.0}
                      onChange={v => setValue('factorized.DCs', v)}
                    />
                  </div>
                )}

                {paramMode === 'developed' && (
                  <div className="space-y-3">
                    <SectionTitle>Taux développés (FIT)</SectionTitle>
                    {([
                      ['developed.lambda_DU', 'λDU', 'Dangereux Non-Détecté'],
                      ['developed.lambda_DD', 'λDD', 'Dangereux Détecté'],
                      ['developed.lambda_SU', 'λSU', 'Sûr Non-Détecté'],
                      ['developed.lambda_SD', 'λSD', 'Sûr Détecté'],
                    ] as [string, string, string][]).map(([key, sym, label]) => (
                      <FieldRow key={key} label={`${sym} — ${label}`}>
                        <div className="flex items-center gap-2">
                          <Input type="number" step="0.001" min={0} className={inp}
                            {...register(key as any, { valueAsNumber: true })} />
                          <span className="text-xs font-mono shrink-0" style={{ color: '#9CA3AF' }}>FIT</span>
                        </div>
                      </FieldRow>
                    ))}
                  </div>
                )}

                <SectionTitle>Résultats calculés</SectionTitle>
                <div className="grid grid-cols-2 gap-2">
                  <ComputedField label="SFF" value={formatPct(SFF)} good={SFF >= 0.6} />
                  <ComputedField label="DC"  value={formatPct(DC)}  good={DC  >= 0.6} />
                </div>

                {derivedDeveloped && paramMode === 'factorized' && (
                  <div className="rounded-xl border p-3 space-y-1.5" style={{ background: BG, borderColor: '#E5E7EB' }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>
                      → Valeurs développées dérivées
                    </p>
                    {Object.entries({
                      'λDU': derivedDeveloped.lambda_DU,
                      'λDD': derivedDeveloped.lambda_DD,
                      'λSU': derivedDeveloped.lambda_SU,
                      'λSD': derivedDeveloped.lambda_SD,
                    }).map(([sym, val]) => (
                      <div key={sym} className="flex justify-between text-xs font-mono">
                        <span style={{ color: '#9CA3AF' }}>{sym}</span>
                        <span style={{ color: NAVY }}>{val.toExponential(3)} FIT</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─ TEST ─ */}
            {activeTab === 'test' && (
              <div className="space-y-4">
                <SectionTitle>Type de test</SectionTitle>
                <Controller name="test.testType" control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {TEST_TYPES.map(t => (
                        <button key={t.value} type="button"
                          onClick={() => field.onChange(t.value)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
                          style={field.value === t.value
                            ? { borderColor: `${TEAL}50`, background: `${TEAL}06` }
                            : { borderColor: '#E5E7EB', background: 'white' }}
                        >
                          {/* Radio dot */}
                          <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all"
                            style={{ borderColor: field.value === t.value ? TEAL : '#D1D5DB' }}
                          >
                            {field.value === t.value && (
                              <div className="w-2 h-2 rounded-full" style={{ background: TEAL }} />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold"
                              style={{ color: field.value === t.value ? NAVY : '#374151' }}
                            >{t.label}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>{t.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                />

                <SectionTitle>Intervalles</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="T1 — Intervalle de test">
                    <div className="flex gap-1.5">
                      <Input type="number" step="0.1" min={0} className={inp}
                        {...register('test.T1', { valueAsNumber: true })} />
                      <Controller name="test.T1Unit" control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-20 h-8 text-xs rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yr" className="text-xs">Année(s)</SelectItem>
                              <SelectItem value="hr" className="text-xs">Heure(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </FieldRow>

                  <FieldRow label="T0 — Premier test">
                    <div className="flex gap-1.5">
                      <Input type="number" step="0.1" min={0} className={inp}
                        {...register('test.T0', { valueAsNumber: true })} />
                      <Controller name="test.T0Unit" control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-20 h-8 text-xs rounded-xl border-gray-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yr" className="text-xs">Année(s)</SelectItem>
                              <SelectItem value="hr" className="text-xs">Heure(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </FieldRow>
                </div>
              </div>
            )}

            {/* ─ ADVANCED ─ */}
            {activeTab === 'advanced' && (
              <div className="space-y-4">
                <SectionTitle>Réparation & disponibilité</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="MTTR" hint="Temps moyen de réparation">
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} className={inp}
                        {...register('advanced.MTTR', { valueAsNumber: true })} />
                      <span className="text-xs font-mono shrink-0" style={{ color: '#9CA3AF' }}>h</span>
                    </div>
                  </FieldRow>
                  <FieldRow label="Durée de vie">
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} placeholder="—" className={inp}
                        {...register('advanced.lifetime', { valueAsNumber: true })} />
                      <span className="text-xs font-mono shrink-0" style={{ color: '#9CA3AF' }}>an</span>
                    </div>
                  </FieldRow>
                </div>

                <SectionTitle>Facteurs qualité de test</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'advanced.gamma',  label: 'γ — Défaillance due au test',   unit: 'prob.' },
                    { key: 'advanced.sigma',  label: 'σ — Efficacité du test',        unit: 'prob.' },
                    { key: 'advanced.omega1', label: 'ω₁ — Erreur de remise en état', unit: 'prob.' },
                    { key: 'advanced.omega2', label: 'ω₂ — Erreur de réparation',     unit: 'prob.' },
                  ].map(f => (
                    <FieldRow key={f.key} label={f.label}>
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.001" min={0} max={1} className={inp}
                          {...register(f.key as any, { valueAsNumber: true })} />
                        <span className="text-xs font-mono shrink-0" style={{ color: '#9CA3AF' }}>{f.unit}</span>
                      </div>
                    </FieldRow>
                  ))}
                </div>

                <PctField label="Couverture du test de preuve"
                  hint="Part des défauts révélés par le test périodique"
                  value={watch('advanced.proofTestCoverage') ?? 1}
                  onChange={v => setValue('advanced.proofTestCoverage', v)}
                />
                <PctField label="DC alarme seule"
                  hint="Diagnostics qui alarment sans déclencher l'arrêt"
                  value={watch('advanced.DCalarmedOnly') ?? 0}
                  onChange={v => setValue('advanced.DCalarmedOnly', v)}
                />

                <SectionTitle>Test de preuve partiel (PST)</SectionTitle>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: NAVY }}>Activer le test partiel</p>
                    <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                      Test partiel intermédiaire entre les tests complets
                    </p>
                  </div>
                  <Controller name="advanced.partialTest.enabled" control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                {watch('advanced.partialTest.enabled') && (
                  <div className="grid grid-cols-2 gap-3 pl-3 border-l-2 ml-1"
                    style={{ borderLeftColor: `${TEAL}40` }}
                  >
                    <FieldRow label="Durée (π)">
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} className={inp}
                          {...register('advanced.partialTest.duration', { valueAsNumber: true })} />
                        <span className="text-xs font-mono shrink-0" style={{ color: '#9CA3AF' }}>h</span>
                      </div>
                    </FieldRow>
                    <FieldRow label="Nombre de tests">
                      <Input type="number" min={1} step={1} className={inp}
                        {...register('advanced.partialTest.numberOfTests', { valueAsNumber: true })} />
                    </FieldRow>
                    <div className="col-span-2">
                      <PctField label="Défauts détectés"
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
        <div className="shrink-0 border-t px-5 py-3 flex items-center justify-between gap-3" style={{ background: BG }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
            <Info size={11} />
            <span>Les modifications s'appliquent à la sauvegarde</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="h-8 px-4 text-xs font-semibold rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-300"
              style={{ color: '#6B7280' }}
            >Annuler</button>
            <button type="button" onClick={handleSubmit(onSubmit)}
              className="h-8 px-4 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              style={{ background: NAVY }}
              onMouseEnter={e => (e.currentTarget.style.background = NAVY2)}
              onMouseLeave={e => (e.currentTarget.style.background = NAVY)}
            >
              <Save size={12} />Sauvegarder
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
