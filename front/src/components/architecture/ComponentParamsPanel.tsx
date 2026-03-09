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
import { useState, useEffect } from 'react'
import {
  Tag, FlaskConical, ClipboardList, Settings2,
  Activity, Cpu, Save, Zap, X,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import {
  calcComponentSFF, calcComponentDC, factorizedToDeveloped, developedToFactorized,
  formatPct,
} from '@/core/math/pfdCalc'
import type {
  ComponentTemplateUpsertInput,
  SIFComponent, SubsystemType, ParamMode, TestType,
  NatureType, InstrumentCategory, DeterminedCharacter,
} from '@/core/types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BORDER, CARD_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM } from '@/styles/tokens'
const PANEL = CARD_BG

// ─── Design tokens ────────────────────────────────────────────────────────
const CARD     = '#1D232A'
const BG       = '#141A21'
const BORDER2  = '#363F49'
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
const DETERMINED_CHARACTER_OPTIONS: { value: DeterminedCharacter; label: string }[] = [
  { value: 'TYPE_A', label: 'Type A' },
  { value: 'TYPE_B', label: 'Type B' },
  { value: 'NON_TYPE_AB', label: 'Non-Type-AB' },
]
type FactorizedLambdaUnit = 'FIT' | 'MICRO_PER_HOUR' | 'PER_HOUR'
type DevelopedLambdaUnit = 'FIT' | 'PER_HOUR'

const FACTORIZED_LAMBDA_UNITS: { value: FactorizedLambdaUnit; label: string }[] = [
  { value: 'FIT', label: 'FIT' },
  { value: 'MICRO_PER_HOUR', label: '10^-6 h^-1' },
  { value: 'PER_HOUR', label: 'h^-1' },
]
const DEVELOPED_LAMBDA_UNITS: { value: DevelopedLambdaUnit; label: string }[] = [
  { value: 'FIT', label: 'FIT' },
  { value: 'PER_HOUR', label: 'h^-1' },
]

const FACTORIZED_TO_FIT = 1000
const MICRO_PER_HOUR_TO_PER_HOUR = 1e-6
const FIT_TO_PER_HOUR = 1e-9

function factorizedLambdaToDisplay(value: number, unit: FactorizedLambdaUnit): number {
  if (unit === 'FIT') return value * FACTORIZED_TO_FIT
  if (unit === 'PER_HOUR') return value * MICRO_PER_HOUR_TO_PER_HOUR
  return value
}

function displayToFactorizedLambda(value: number, unit: FactorizedLambdaUnit): number {
  if (unit === 'FIT') return value / FACTORIZED_TO_FIT
  if (unit === 'PER_HOUR') return value / MICRO_PER_HOUR_TO_PER_HOUR
  return value
}

function developedLambdaToDisplay(value: number, unit: DevelopedLambdaUnit): number {
  return unit === 'PER_HOUR' ? value * FIT_TO_PER_HOUR : value
}

function displayToDevelopedLambda(value: number, unit: DevelopedLambdaUnit): number {
  return unit === 'PER_HOUR' ? value / FIT_TO_PER_HOUR : value
}

function parseNumericText(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function formatEditableNumber(value: number): string {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'

  const magnitude = Math.abs(value)
  if (magnitude >= 1e4 || magnitude < 1e-2) {
    return value.toExponential(3).replace('e', 'E')
  }

  return String(value)
}

function synchronizeComponentParams(component: SIFComponent): SIFComponent {
  if (component.paramMode === 'factorized') {
    return {
      ...component,
      developed: factorizedToDeveloped(component.factorized),
    }
  }

  return {
    ...component,
    factorized: developedToFactorized(component.developed, component.factorized),
  }
}

type PanelTab = 'identification' | 'parameters' | 'test' | 'advanced'
const PANEL_TABS: { id: PanelTab; label: string; Icon: React.ElementType }[] = [
  { id: 'identification', label: 'ID',      Icon: Tag          },
  { id: 'parameters',     label: 'Params',  Icon: FlaskConical },
  { id: 'test',           label: 'Test',    Icon: ClipboardList},
  { id: 'advanced',       label: 'Avancé',  Icon: Settings2    },
]

const TEMPLATE_SCOPE_OPTIONS: {
  value: ComponentTemplateUpsertInput['scope']
  label: string
  description: string
}[] = [
  { value: 'user', label: 'My Library', description: 'Disponible dans tous vos projets.' },
  { value: 'project', label: 'Project', description: 'Visible seulement dans le projet courant.' },
]

const TEMPLATE_REVIEW_OPTIONS: {
  value: NonNullable<ComponentTemplateUpsertInput['reviewStatus']>
  label: string
}[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
]

function tagsToInput(tags: string[]): string {
  return tags.join(', ')
}

function inputToTags(raw: string): string[] {
  return raw
    .split(',')
    .map(tag => tag.trim())
    .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index)
}

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

function ScientificInput({
  value,
  onCommit,
  placeholder,
}: {
  value: number
  onCommit: (value: number) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState(() => formatEditableNumber(value))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setDraft(formatEditableNumber(value))
    setInvalid(false)
  }, [value])

  const commitDraft = () => {
    const parsed = parseNumericText(draft)
    if (parsed === null) {
      setDraft(formatEditableNumber(value))
      setInvalid(false)
      return
    }

    setInvalid(false)
    onCommit(parsed)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={e => {
        setDraft(e.target.value)
        if (invalid) setInvalid(false)
      }}
      onBlur={() => {
        const parsed = parseNumericText(draft)
        if (parsed === null) {
          setInvalid(draft.trim().length > 0)
          setDraft(draft.trim().length > 0 ? draft : formatEditableNumber(value))
          return
        }
        commitDraft()
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commitDraft()
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setDraft(formatEditableNumber(value))
          setInvalid(false)
        }
      }}
      placeholder={placeholder}
      className="w-full rounded-md border px-2 py-1.5 text-xs outline-none transition-colors font-mono"
      style={{
        background: BG,
        borderColor: invalid ? '#EF4444' : BORDER2,
        color: TEXT,
      }}
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
  const saveComponentTemplate = useAppStore(s => s.saveComponentTemplate)
  const setSyncError = useAppStore(s => s.setSyncError)
  const [local, setLocal] = useState<SIFComponent>(() => synchronizeComponentParams(component))
  const [activeTab, setActiveTab] = useState<PanelTab>('identification')
  const [factorizedLambdaUnit, setFactorizedLambdaUnit] = useState<FactorizedLambdaUnit>('FIT')
  const [developedLambdaUnit, setDevelopedLambdaUnit] = useState<DevelopedLambdaUnit>('FIT')
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [templateScope, setTemplateScope] = useState<ComponentTemplateUpsertInput['scope']>('user')
  const [templateName, setTemplateName] = useState(component.instrumentType || component.tagName)
  const [templateDescription, setTemplateDescription] = useState(component.description)
  const [templateTags, setTemplateTags] = useState('')
  const [templateSourceReference, setTemplateSourceReference] = useState('')
  const [templateReviewStatus, setTemplateReviewStatus] = useState<NonNullable<ComponentTemplateUpsertInput['reviewStatus']>>('draft')
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)

  // Sync local state whenever the component prop changes
  // (different component selected, OR same component re-selected after store update)
  useEffect(() => { setLocal(synchronizeComponentParams(component)) }, [component])
  useEffect(() => {
    setTemplateName(component.instrumentType || component.tagName)
    setTemplateDescription(component.description)
    setTemplateTags('')
    setTemplateSourceReference('')
    setTemplateReviewStatus('draft')
    setTemplateScope('user')
    setSaveError(null)
    setSaveNotice(null)
  }, [component])

  // Auto-save
  const commit = (updater: (prev: SIFComponent) => SIFComponent) => {
    setLocal(prev => {
      const next = synchronizeComponentParams(updater(prev))
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

  const openSaveDialog = () => {
    setTemplateName(local.instrumentType || local.tagName)
    setTemplateDescription(local.description)
    setTemplateTags(tagsToInput([
      local.subsystemType,
      local.instrumentCategory,
      local.manufacturer,
    ].filter(Boolean)))
    setTemplateSourceReference('')
    setTemplateReviewStatus('draft')
    setTemplateScope('user')
    setSaveError(null)
    setIsSaveDialogOpen(true)
  }

  const submitTemplateSave = async () => {
    const trimmedName = templateName.trim()
    if (!trimmedName) {
      setSaveError('Le nom du template est requis.')
      return
    }

    setSaveBusy(true)
    setSaveError(null)
    setSyncError(null)

    try {
      await saveComponentTemplate({
        scope: templateScope,
        projectId: templateScope === 'project' ? projectId : null,
        name: trimmedName,
        description: templateDescription.trim(),
        sourceReference: templateSourceReference.trim() || null,
        tags: inputToTags(templateTags),
        reviewStatus: templateReviewStatus,
        componentSnapshot: local,
      })
      setIsSaveDialogOpen(false)
      setSaveNotice(`Template enregistré dans ${templateScope === 'project' ? 'Project' : 'My Library'}.`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setSaveError(message)
      setSyncError(message)
    } finally {
      setSaveBusy(false)
    }
  }

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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openSaveDialog}
              className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-bold transition-colors"
              style={{ borderColor: `${meta.color}45`, background: `${meta.color}12`, color: meta.color }}
            >
              <Save size={11} />
              Template
            </button>
            <button onClick={onClose} className="shrink-0 rounded p-1 transition-colors hover:bg-red-900/30"
              style={{ color: TEXT_DIM }}>
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Live metrics strip */}
        <div className="flex gap-1.5 mb-3">
          <LiveMetric label="SFF" value={formatPct(sff)} ok={sffOk} />
          <LiveMetric label="DC"  value={formatPct(dc)}  ok={dcOk} />
          <LiveMetric label="λ"   value={`${local.factorized.lambda.toFixed(2)}`} />
          <LiveMetric label="T1"  value={`${local.test.T1}${local.test.T1Unit}`} />
        </div>

        {saveNotice && (
          <div className="mb-3 rounded-md border px-2.5 py-2 text-[10px]"
            style={{ background: `${TEAL}08`, borderColor: `${TEAL}25`, color: TEAL_DIM }}>
            {saveNotice}
          </div>
        )}

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
            <FieldRow label="Caractérisation IEC 61508">
              <StyledSelect
                value={local.determinedCharacter ?? (subsystemType === 'actuator' ? 'TYPE_A' : 'TYPE_B')}
                onChange={v => upd({ determinedCharacter: v as DeterminedCharacter })}
                options={DETERMINED_CHARACTER_OPTIONS}
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
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>
                      λ total
                    </label>
                    <div className="flex rounded-md p-0.5" style={{ background: BG }}>
                      {FACTORIZED_LAMBDA_UNITS.map(unit => (
                        <button
                          key={unit.value}
                          type="button"
                          onClick={() => setFactorizedLambdaUnit(unit.value)}
                          className="rounded px-2 py-1 text-[10px] font-bold font-mono transition-all"
                          style={factorizedLambdaUnit === unit.value
                            ? { background: TEAL, color: '#fff' }
                            : { color: TEXT_DIM }}
                        >
                          {unit.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ScientificInput
                    value={factorizedLambdaToDisplay(local.factorized.lambda, factorizedLambdaUnit)}
                    onCommit={value => updF({ lambda: displayToFactorizedLambda(value, factorizedLambdaUnit) })}
                    placeholder={
                      factorizedLambdaUnit === 'FIT'
                        ? 'Ex. 1500 ou 1.50E3'
                        : factorizedLambdaUnit === 'PER_HOUR'
                          ? 'Ex. 1.50E-6'
                          : 'Ex. 1.5 ou 1.50E0'
                    }
                  />
                  <p className="text-[10px] mt-1" style={{ color: TEXT_DIM }}>
                    {factorizedLambdaUnit === 'FIT'
                      ? 'Saisie libre en FIT. Exemple equivalent: 1500 FIT = 1.50E-6 h^-1.'
                      : factorizedLambdaUnit === 'PER_HOUR'
                        ? 'Saisie libre en h^-1 absolu. Exemple: 1.50E-6 h^-1 = 1500 FIT.'
                        : 'Saisie libre en 10^-6 h^-1. Exemple: 1.5 = 1500 FIT.'}
                  </p>
                </div>
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
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>
                      Unite des lambdas developpes
                    </label>
                    <div className="flex rounded-md p-0.5" style={{ background: BG }}>
                      {DEVELOPED_LAMBDA_UNITS.map(unit => (
                        <button
                          key={unit.value}
                          type="button"
                          onClick={() => setDevelopedLambdaUnit(unit.value)}
                          className="rounded px-2 py-1 text-[10px] font-bold font-mono transition-all"
                          style={developedLambdaUnit === unit.value
                            ? { background: TEAL, color: '#fff' }
                            : { color: TEXT_DIM }}
                        >
                          {unit.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                    {developedLambdaUnit === 'FIT'
                      ? 'Saisie libre en FIT. Exemple equivalent: 113 FIT = 1.13E-7 h^-1.'
                      : 'Saisie libre en h^-1 absolu. Exemple: 1.13E-7 h^-1 = 113 FIT.'}
                  </p>
                </div>
                {[
                  { key: 'lambda_DU', label: 'λDU [FIT]' },
                  { key: 'lambda_DD', label: 'λDD [FIT]' },
                  { key: 'lambda_SU', label: 'λSU [FIT]' },
                  { key: 'lambda_SD', label: 'λSD [FIT]' },
                ].map(({ key, label }) => (
                  <FieldRow
                    key={key}
                    label={`${label.split(' ')[0]} [${developedLambdaUnit === 'FIT' ? 'FIT' : 'h^-1'}]`}
                  >
                    <ScientificInput
                      value={developedLambdaToDisplay(local.developed[key as keyof typeof local.developed] as number, developedLambdaUnit)}
                      onCommit={value => updD({ [key]: displayToDevelopedLambda(value, developedLambdaUnit) })}
                      placeholder={developedLambdaUnit === 'FIT' ? 'Ex. 1.13E2' : 'Ex. 1.13E-7'}
                    />
                  </FieldRow>
                ))}
                <p className="text-[10px] -mt-1" style={{ color: TEXT_DIM }}>
                  Saisie libre, avec ou sans notation scientifique.
                </p>
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

            <SectionTitle>Facteurs qualité de test</SectionTitle>
            <SliderField
              label="γ — Défaillance due au test" value={local.advanced.gamma}
              min={0} max={0.2} step={0.005} format={formatPct}
              onChange={v => updA({ gamma: v })}
            />
            <SliderField
              label="ω₁ — Erreur de remise en état" value={local.advanced.omega1}
              min={0} max={1} step={0.005} format={formatPct}
              onChange={v => updA({ omega1: v })}
            />
            <SliderField
              label="ω₂ — Erreur de réparation" value={local.advanced.omega2}
              min={0} max={1} step={0.005} format={formatPct}
              onChange={v => updA({ omega2: v })}
            />

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

      <Dialog open={isSaveDialogOpen} onOpenChange={open => {
        setIsSaveDialogOpen(open)
        if (!open) setSaveError(null)
      }}>
        <DialogContent className="max-w-xl border-[#2A3340] bg-[#111821] text-[#DFE8F1]">
          <DialogHeader>
            <DialogTitle>Enregistrer comme template SIL</DialogTitle>
            <p className="text-sm" style={{ color: TEXT_DIM }}>
              Snapshot complet du composant avec ses parametres IEC 61508, tests, donnees factorisees/developpees et reglages avances.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <FieldRow label="Nom du template">
              <StyledInput value={templateName} onChange={setTemplateName} placeholder="Pressure transmitter — Rosemount 3051S" />
            </FieldRow>

            <FieldRow label="Scope">
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_SCOPE_OPTIONS.map(option => {
                  const isActive = option.value === templateScope
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTemplateScope(option.value)}
                      className="rounded-lg border px-3 py-2 text-left transition-colors"
                      style={isActive
                        ? { borderColor: TEAL, background: `${TEAL}12`, color: TEXT }
                        : { borderColor: BORDER2, background: BG, color: TEXT_DIM }}
                    >
                      <p className="text-xs font-semibold" style={{ color: isActive ? TEAL_DIM : TEXT }}>
                        {option.label}
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed">
                        {option.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </FieldRow>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Review status">
                <StyledSelect
                  value={templateReviewStatus}
                  onChange={value => setTemplateReviewStatus(value as NonNullable<ComponentTemplateUpsertInput['reviewStatus']>)}
                  options={TEMPLATE_REVIEW_OPTIONS}
                />
              </FieldRow>
              <FieldRow label="Source reference">
                <StyledInput value={templateSourceReference} onChange={setTemplateSourceReference} placeholder="SERH 2023, FMEDA ref, cert #" />
              </FieldRow>
            </div>

            <FieldRow label="Tags">
              <StyledInput
                value={templateTags}
                onChange={setTemplateTags}
                placeholder="pressure, transmitter, rosemount, SIL2"
              />
            </FieldRow>

            <FieldRow label="Description">
              <textarea
                value={templateDescription}
                onChange={event => setTemplateDescription(event.target.value)}
                rows={3}
                className="w-full rounded-md border px-2 py-1.5 text-xs outline-none resize-none"
                style={{ background: BG, borderColor: BORDER2, color: TEXT }}
                placeholder="Description technique ou contexte d'utilisation…"
              />
            </FieldRow>

            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3"
              style={{ borderColor: BORDER2, background: BG }}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Fabricant</p>
                <p className="mt-1 text-xs" style={{ color: TEXT }}>{local.manufacturer || 'Non renseigne'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>Data source</p>
                <p className="mt-1 text-xs" style={{ color: TEXT }}>{local.dataSource || 'Non renseignee'}</p>
              </div>
            </div>

            {saveError && (
              <div className="rounded-lg border px-3 py-2 text-[11px]"
                style={{ background: '#7F1D1D20', borderColor: '#F8717130', color: '#FCA5A5' }}>
                {saveError}
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsSaveDialogOpen(false)}
              className="rounded-md border px-3 py-2 text-xs font-semibold"
              style={{ borderColor: BORDER2, background: BG, color: TEXT }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void submitTemplateSave()}
              disabled={saveBusy}
              className="rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
              style={{ background: TEAL, color: '#041014' }}
            >
              {saveBusy ? 'Enregistrement…' : 'Enregistrer le template'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
