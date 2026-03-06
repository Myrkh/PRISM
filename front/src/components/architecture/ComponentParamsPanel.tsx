/**
 * ComponentParamsPanel — PRISM v3
 *
 * Version inline du ComponentParamsSheet, conçue pour s'afficher
 * dans le panneau droit de SIFWorkbenchLayout (sans Sheet/modal).
 *
 * 4 onglets intercalaires :
 *  Identification | Paramètres | Test | Avancé
 *
 * Auto-save : chaque modification sauvegarde immédiatement via updateComponent.
 */
import { useState, useEffect, useMemo } from 'react'
import {
  Tag, FlaskConical, ClipboardList, Settings2,
  Activity, Cpu, Zap, CheckCircle2, AlertTriangle,
  X, ChevronDown,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import {
  calcComponentSFF, calcComponentDC, factorizedToDeveloped,
  formatPct, formatPFD,
} from '@/core/math/pfdCalc'
import type {
  SIFComponent, SubsystemType, ParamMode, TestType,
  NatureType, InstrumentCategory,
} from '@/core/types'
import { cn } from '@/lib/utils'

// ─── Design tokens ────────────────────────────────────────────────────────
const PANEL    = '#23292F'
const CARD     = '#1D232A'
const BG       = '#141A21'
const BORDER   = '#2A3138'
const BORDER2  = '#363F49'
const TEXT     = '#DFE8F1'
const TEXT_DIM = '#8FA0B1'
const TEAL     = '#009BA4'
const TEAL_DIM = '#5FD8D2'
const R        = 6

const TYPE_META: Record<SubsystemType, { color: string; label: string; Icon: React.ElementType }> = {
  sensor:   { color: '#0284C7', label: 'Capteur',    Icon: Activity },
  logic:    { color: '#7C3AED', label: 'Logique',    Icon: Cpu      },
  actuator: { color: '#EA580C', label: 'Actionneur', Icon: Zap      },
}

const INSTRUMENT_CATEGORIES: InstrumentCategory[] = [
  'transmitter', 'switch', 'valve', 'positioner', 'controller', 'relay', 'other',
]
const CAT_LABELS: Record<InstrumentCategory, string> = {
  transmitter: 'Transmetteur', switch: 'Pressoswitche / Switch',
  valve: 'Vanne', positioner: 'Positionneur',
  controller: 'Contrôleur / PLC', relay: 'Relais', other: 'Autre',
}
const INSTRUMENT_TYPES: Record<InstrumentCategory, string[]> = {
  transmitter: ['Pressure transmitter', 'Temperature transmitter', 'Flow transmitter', 'Level transmitter', 'DP transmitter'],
  switch:      ['Pressure switch', 'Temperature switch', 'Flow switch', 'Level switch', 'Vibration switch'],
  valve:       ['On-off valve', 'Control valve', 'Solenoid valve', 'Ball valve', 'Butterfly valve'],
  positioner:  ['Electro-pneumatic positioner', 'Digital positioner'],
  controller:  ['Safety PLC', 'Safety relay module', 'Safety controller'],
  relay:       ['Safety relay', 'Interposing relay'],
  other:       ['Other'],
}
const TEST_TYPES: { value: TestType; label: string; desc: string }[] = [
  { value: 'stopped', label: 'Arrêt unité',    desc: 'Testé lors d\'un arrêt unité' },
  { value: 'online',  label: 'En ligne',        desc: 'Test complet en service'      },
  { value: 'partial', label: 'PST (partiel)',   desc: 'Course partielle (vanne)'     },
  { value: 'none',    label: 'Aucun test',      desc: 'Pas de test de preuve'        },
]

type PanelTab = 'identification' | 'parameters' | 'test' | 'advanced'
const PANEL_TABS: { id: PanelTab; label: string; Icon: React.ElementType }[] = [
  { id: 'identification', label: 'ID',      Icon: Tag          },
  { id: 'parameters',     label: 'Params',  Icon: FlaskConical },
  { id: 'test',           label: 'Test',    Icon: ClipboardList},
  { id: 'advanced',       label: 'Avancé',  Icon: Settings2    },
]

// ─── Small reusable form widgets ──────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</label>
      {children}
    </div>
  )
}

function StyledInput({ value, onChange, placeholder, type = 'text', step }: {
  value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string; step?: string
}) {
  return (
    <input
      type={type} step={step} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border px-2 py-1.5 text-xs outline-none transition-colors"
      style={{ background: BG, borderColor: BORDER2, color: TEXT }}
      onFocus={e => (e.target.style.borderColor = TEAL)}
      onBlur={e => (e.target.style.borderColor = BORDER2)}
    />
  )
}

function StyledSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full rounded-md border px-2 py-1.5 text-xs outline-none appearance-none"
      style={{ background: BG, borderColor: BORDER2, color: TEXT }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function SliderField({ label, value, min, max, step = 0.01, format, onChange, color = TEAL }: {
  label: string; value: number; min: number; max: number; step?: number
  format: (v: number) => string; onChange: (v: number) => void; color?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  const trackColor = pct < 40 ? '#EF4444' : pct < 65 ? '#F59E0B' : color
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</label>
        <span className="text-[11px] font-bold font-mono" style={{ color: trackColor }}>{format(value)}</span>
      </div>
      <div className="relative h-1.5 rounded-full" style={{ background: BORDER2 }}>
        <div className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: trackColor, transition: 'background 0.2s' }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
      </div>
    </div>
  )
}

function ComputedRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const c = ok === undefined ? TEXT : ok ? '#4ADE80' : '#F87171'
  return (
    <div className="flex justify-between items-center rounded px-2 py-1.5"
      style={{ background: BG, border: `1px solid ${BORDER2}` }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-xs font-bold font-mono" style={{ color: c }}>{value}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1 border-t" style={{ borderColor: BORDER }} />
      <span className="text-[9px] font-bold uppercase tracking-widest shrink-0" style={{ color: TEXT_DIM }}>{children}</span>
      <div className="flex-1 border-t" style={{ borderColor: BORDER }} />
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────
interface Props {
  component: SIFComponent
  subsystemType: SubsystemType
  projectId: string
  sifId: string
  subsystemId: string
  channelId: string
  onClose: () => void
}

export function ComponentParamsPanel({
  component, subsystemType, projectId, sifId, subsystemId, channelId, onClose,
}: Props) {
  const updateComponent = useAppStore(s => s.updateComponent)
  const [local, setLocal] = useState<SIFComponent>(component)
  const [activeTab, setActiveTab] = useState<PanelTab>('identification')

  // Sync when component changes (different component selected)
  useEffect(() => { setLocal(component) }, [component.id])

  // Auto-save
  const commit = (updater: (prev: SIFComponent) => SIFComponent) => {
    setLocal(prev => {
      const next = updater(prev)
      updateComponent(projectId, sifId, subsystemId, channelId, next)
      return next
    })
  }

  const upd = (patch: Partial<SIFComponent>) => commit(prev => ({ ...prev, ...patch }))
  const updF = (patch: Partial<typeof local.factorized>) =>
    commit(prev => ({ ...prev, factorized: { ...prev.factorized, ...patch } }))
  const updD = (patch: Partial<typeof local.developed>) =>
    commit(prev => ({ ...prev, developed: { ...prev.developed, ...patch } }))
  const updT = (patch: Partial<typeof local.test>) =>
    commit(prev => ({ ...prev, test: { ...prev.test, ...patch } }))
  const updA = (patch: Partial<typeof local.advanced>) =>
    commit(prev => ({ ...prev, advanced: { ...prev.advanced, ...patch } }))

  // Computed live metrics
  const derived   = factorizedToDeveloped(local.factorized)
  const effective = local.paramMode === 'factorized' ? derived : local.developed
  const sff = calcComponentSFF(effective)
  const dc  = calcComponentDC(effective)
  const sffOk = sff >= 0.6
  const dcOk  = dc  >= 0.6

  const meta = TYPE_META[subsystemType]
  const activeIdx = PANEL_TABS.findIndex(t => t.id === activeTab)

  return (
    <div className="flex flex-col h-full" style={{ background: PANEL }}>
      {/* ── Header ── */}
      <div className="shrink-0 px-3 pt-3 pb-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0"
              style={{ background: `${meta.color}20` }}>
              <meta.Icon size={12} style={{ color: meta.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold truncate" style={{ color: TEXT }}>{local.tagName}</p>
              <p className="text-[9px] truncate" style={{ color: TEXT_DIM }}>
                {meta.label} · {local.instrumentCategory}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded p-1 transition-colors hover:bg-red-900/30"
            style={{ color: TEXT_DIM }}>
            <X size={12} />
          </button>
        </div>

        {/* Live metrics strip */}
        <div className="flex gap-1.5 mb-3">
          <LiveMetric label="SFF" value={formatPct(sff)} ok={sffOk} />
          <LiveMetric label="DC"  value={formatPct(dc)}  ok={dcOk} />
          <LiveMetric label="λ"   value={`${local.factorized.lambda.toFixed(2)}`} />
          <LiveMetric label="T1"  value={`${local.test.T1}${local.test.T1Unit}`} />
        </div>

        {/* Tab bar intercalaire */}
        <div className="flex items-end" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {PANEL_TABS.map((tab, i) => {
            const isActive = tab.id === activeTab
            return (
              <button key={tab.id} type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1 px-2.5 py-2 text-[11px] font-semibold transition-colors"
                style={isActive ? {
                  background: CARD, color: TEAL_DIM,
                  borderTop: `1px solid ${BORDER}`,
                  borderLeft: `1px solid ${BORDER}`,
                  borderRight: `1px solid ${BORDER}`,
                  borderBottom: `1px solid ${CARD}`,
                  borderRadius: `${R}px ${R}px 0 0`,
                  marginBottom: '-1px', zIndex: 10,
                } : { color: TEXT_DIM }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = TEXT }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = TEXT_DIM }}
              >
                <tab.Icon size={10} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-3"
        style={{
          background: CARD,
          borderLeft: `1px solid ${BORDER}`,
          borderRight: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          borderRadius: `${activeIdx === 0 ? 0 : R}px ${activeIdx === PANEL_TABS.length - 1 ? 0 : R}px ${R}px ${R}px`,
        }}
      >

        {/* ══ IDENTIFICATION ══ */}
        {activeTab === 'identification' && (
          <>
            <FieldRow label="Tag">
              <StyledInput value={local.tagName} onChange={v => upd({ tagName: v })} placeholder="PT-001" />
            </FieldRow>
            <FieldRow label="Catégorie">
              <StyledSelect
                value={local.instrumentCategory}
                onChange={v => upd({ instrumentCategory: v as InstrumentCategory })}
                options={INSTRUMENT_CATEGORIES.map(c => ({ value: c, label: CAT_LABELS[c] }))}
              />
            </FieldRow>
            <FieldRow label="Type d'instrument">
              <StyledSelect
                value={local.instrumentType}
                onChange={v => upd({ instrumentType: v })}
                options={(INSTRUMENT_TYPES[local.instrumentCategory] ?? ['Other']).map(t => ({ value: t, label: t }))}
              />
            </FieldRow>
            <FieldRow label="Fabricant">
              <StyledInput value={local.manufacturer} onChange={v => upd({ manufacturer: v })} placeholder="Rosemount, Emerson…" />
            </FieldRow>
            <FieldRow label="Source des données">
              <StyledSelect
                value={local.dataSource}
                onChange={v => upd({ dataSource: v })}
                options={[
                  { value: 'SIL-DB', label: 'Base SIL certifiée' },
                  { value: 'OREDA', label: 'OREDA' },
                  { value: 'EXIDA', label: 'exida' },
                  { value: 'Manufacturer', label: 'Constructeur' },
                  { value: 'Custom', label: 'Données propres' },
                ]}
              />
            </FieldRow>
            <FieldRow label="Description">
              <textarea
                value={local.description}
                onChange={e => upd({ description: e.target.value })}
                rows={3}
                className="w-full rounded-md border px-2 py-1.5 text-xs outline-none resize-none"
                style={{ background: BG, borderColor: BORDER2, color: TEXT }}
                placeholder="Description optionnelle…"
              />
            </FieldRow>
          </>
        )}

        {/* ══ PARAMÈTRES ══ */}
        {activeTab === 'parameters' && (
          <>
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: BG }}>
              {(['factorized', 'developed'] as ParamMode[]).map(m => (
                <button key={m} type="button"
                  onClick={() => upd({ paramMode: m })}
                  className="flex-1 rounded-md py-1 text-[11px] font-bold transition-all"
                  style={local.paramMode === m
                    ? { background: TEAL, color: '#FFF' }
                    : { color: TEXT_DIM }
                  }
                >
                  {m === 'factorized' ? 'Factorisé' : 'Développé'}
                </button>
              ))}
            </div>

            <SectionTitle>Taux de défaillance</SectionTitle>

            {local.paramMode === 'factorized' ? (
              <>
                <SliderField
                  label="λ total [FIT]" value={local.factorized.lambda}
                  min={0.01} max={30} step={0.01} format={v => `${v.toFixed(2)} FIT`}
                  onChange={v => updF({ lambda: v })} color={meta.color}
                />
                <SliderField
                  label="λD/λ ratio" value={local.factorized.lambdaDRatio}
                  min={0} max={1} step={0.01} format={v => formatPct(v)}
                  onChange={v => updF({ lambdaDRatio: v })} color={meta.color}
                />
                <SectionTitle>Couverture diagnostic</SectionTitle>
                <SliderField
                  label="DCd — Dangerous" value={local.factorized.DCd}
                  min={0} max={1} step={0.01} format={formatPct}
                  onChange={v => updF({ DCd: v })}
                />
                <SliderField
                  label="DCs — Safe" value={local.factorized.DCs}
                  min={0} max={1} step={0.01} format={formatPct}
                  onChange={v => updF({ DCs: v })}
                />
              </>
            ) : (
              <>
                {[
                  { key: 'lambda_DU', label: 'λDU [FIT]' },
                  { key: 'lambda_DD', label: 'λDD [FIT]' },
                  { key: 'lambda_SU', label: 'λSU [FIT]' },
                  { key: 'lambda_SD', label: 'λSD [FIT]' },
                ].map(({ key, label }) => (
                  <FieldRow key={key} label={label}>
                    <StyledInput
                      type="number" step="0.001"
                      value={local.developed[key as keyof typeof local.developed] as number}
                      onChange={v => updD({ [key]: parseFloat(v) || 0 })}
                    />
                  </FieldRow>
                ))}
              </>
            )}

            <SectionTitle>Métriques calculées</SectionTitle>
            <ComputedRow label="SFF"    value={formatPct(sff)}    ok={sffOk} />
            <ComputedRow label="DC eff" value={formatPct(dc)}     ok={dcOk}  />
          </>
        )}

        {/* ══ TEST ══ */}
        {activeTab === 'test' && (
          <>
            <SectionTitle>Intervalle de test de preuve</SectionTitle>
            <div className="flex gap-2">
              <div className="flex-1">
                <FieldRow label="T1">
                  <StyledInput
                    type="number" step="0.1" value={local.test.T1}
                    onChange={v => updT({ T1: parseFloat(v) || 1 })}
                  />
                </FieldRow>
              </div>
              <div className="w-20">
                <FieldRow label="Unité">
                  <StyledSelect
                    value={local.test.T1Unit}
                    onChange={v => updT({ T1Unit: v as 'hr' | 'yr' })}
                    options={[{ value: 'yr', label: 'années' }, { value: 'hr', label: 'heures' }]}
                  />
                </FieldRow>
              </div>
            </div>

            <SectionTitle>Type de test</SectionTitle>
            <div className="space-y-1.5">
              {TEST_TYPES.map(tt => (
                <button key={tt.value} type="button"
                  onClick={() => updT({ testType: tt.value })}
                  className="flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-all"
                  style={local.test.testType === tt.value ? {
                    borderColor: TEAL, background: `${TEAL}12`, color: TEXT,
                  } : {
                    borderColor: BORDER2, background: BG, color: TEXT_DIM,
                  }}
                >
                  <div className="mt-0.5 w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center"
                    style={{ borderColor: local.test.testType === tt.value ? TEAL : BORDER2 }}>
                    {local.test.testType === tt.value && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold">{tt.label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: TEXT_DIM }}>{tt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {local.test.testType === 'partial' && (
              <>
                <SectionTitle>Test Partiel (PST)</SectionTitle>
                <div className="rounded-lg border p-3 space-y-2"
                  style={{ borderColor: `${TEAL}40`, background: `${TEAL}08` }}>
                  <SliderField
                    label="Couverture PST" value={local.advanced.partialTest.detectedFaultsPct}
                    min={0} max={1} step={0.01} format={formatPct}
                    onChange={v => updA({ partialTest: { ...local.advanced.partialTest, detectedFaultsPct: v } })}
                    color={TEAL}
                  />
                  <FieldRow label="Nb de tests / période">
                    <StyledInput
                      type="number" step="1"
                      value={local.advanced.partialTest.numberOfTests}
                      onChange={v => updA({ partialTest: { ...local.advanced.partialTest, numberOfTests: parseInt(v) || 1 } })}
                    />
                  </FieldRow>
                </div>
              </>
            )}
          </>
        )}

        {/* ══ AVANCÉ ══ */}
        {activeTab === 'advanced' && (
          <>
            <SectionTitle>Réparation</SectionTitle>
            <FieldRow label="MTTR [heures]">
              <StyledInput
                type="number" step="1" value={local.advanced.MTTR}
                onChange={v => updA({ MTTR: parseFloat(v) || 0 })}
              />
            </FieldRow>

            <SectionTitle>Facteur de défaillance commune</SectionTitle>
            <div className="flex gap-2">
              <div className="flex-1">
                <SliderField
                  label="β (β-factor)" value={local.advanced.gamma}
                  min={0} max={0.2} step={0.005} format={formatPct}
                  onChange={v => updA({ gamma: v })}
                />
              </div>
            </div>

            <SectionTitle>Couverture test de preuve</SectionTitle>
            <SliderField
              label="Couverture (%)" value={local.advanced.proofTestCoverage}
              min={0} max={1} step={0.01} format={formatPct}
              onChange={v => updA({ proofTestCoverage: v })}
              color={meta.color}
            />

            <SectionTitle>Durée de vie</SectionTitle>
            <FieldRow label="Durée de vie [heures] (optionnel)">
              <StyledInput
                type="number" step="1000"
                value={local.advanced.lifetime ?? ''}
                onChange={v => updA({ lifetime: v ? parseFloat(v) : null })}
                placeholder="Ex. 175200 (20 ans)"
              />
            </FieldRow>

            <SectionTitle>Sigma</SectionTitle>
            <FieldRow label="σ (diagnostic complet)">
              <StyledInput
                type="number" step="0.1" value={local.advanced.sigma}
                onChange={v => updA({ sigma: parseFloat(v) || 1 })}
              />
            </FieldRow>
          </>
        )}

      </div>
    </div>
  )
}

// ── Live metric chip ──────────────────────────────────────────────────────
function LiveMetric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? TEXT_DIM : ok ? '#4ADE80' : '#F87171'
  return (
    <div className="flex-1 rounded px-1.5 py-1 text-center"
      style={{ background: BG, border: `1px solid ${BORDER}` }}>
      <p className="text-[8px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="text-[11px] font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  )
}
