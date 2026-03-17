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
  calcComponentDC, calcComponentPFDValue, calcComponentSFF, factorizedToDeveloped, developedToFactorized,
  formatPFD, formatPct,
} from '@/core/math/pfdCalc'
import type {
  ComponentTemplateUpsertInput,
  SIFComponent, SubsystemType, ParamMode, TestType,
  NatureType, InstrumentCategory, DeterminedCharacter,
} from '@/core/types'
import { InspectorBlock, RightPanelBody } from '@/components/layout/RightPanelShell'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

// ─── Design tokens ────────────────────────────────────────────────────────
const PANEL_FORM_GRID = 'repeat(auto-fit, minmax(132px, 1fr))'
const PANEL_WIDE_GRID = 'repeat(auto-fit, minmax(152px, 1fr))'

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
type FactorizedLambdaUnit = 'FIT' | 'PER_HOUR'
type DevelopedLambdaUnit = 'FIT' | 'PER_HOUR'
type TimeDisplayUnit = 'hr' | 'yr'

const FACTORIZED_LAMBDA_UNITS: { value: FactorizedLambdaUnit; label: string }[] = [
  { value: 'FIT', label: 'FIT' },
  { value: 'PER_HOUR', label: 'h^-1' },
]
const DEVELOPED_LAMBDA_UNITS: { value: DevelopedLambdaUnit; label: string }[] = [
  { value: 'FIT', label: 'FIT' },
  { value: 'PER_HOUR', label: 'h^-1' },
]

const FACTORIZED_TO_FIT = 1000
const FIT_TO_PER_HOUR = 1e-9
const HOURS_PER_YEAR = 8760

function factorizedLambdaToDisplay(value: number, unit: FactorizedLambdaUnit): number {
  if (unit === 'FIT') return value * FACTORIZED_TO_FIT
  return value * 1e-6
}

function displayToFactorizedLambda(value: number, unit: FactorizedLambdaUnit): number {
  if (unit === 'FIT') return value / FACTORIZED_TO_FIT
  return value / 1e-6
}

function developedLambdaToDisplay(value: number, unit: DevelopedLambdaUnit): number {
  return unit === 'PER_HOUR' ? value * FIT_TO_PER_HOUR : value
}

function displayToDevelopedLambda(value: number, unit: DevelopedLambdaUnit): number {
  return unit === 'PER_HOUR' ? value / FIT_TO_PER_HOUR : value
}

function hoursToDisplay(value: number | null, unit: TimeDisplayUnit): string {
  if (value === null || !Number.isFinite(value)) return ''
  const displayValue = unit === 'yr' ? value / HOURS_PER_YEAR : value
  return formatEditableNumber(displayValue)
}

function displayToHours(value: number, unit: TimeDisplayUnit): number {
  return unit === 'yr' ? value * HOURS_PER_YEAR : value
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
  const { TEXT_DIM } = usePrismTheme()
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
  const { BORDER, SURFACE, TEXT } = usePrismTheme()
  return (
    <input
      type={type} step={step} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="prism-field w-full min-w-0 rounded-md border px-2 py-1.5 text-xs outline-none"
      style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
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
  const { BORDER, SURFACE, TEXT } = usePrismTheme()
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
      onBlur={e => {
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
      className="prism-field w-full min-w-0 rounded-md border px-2 py-1.5 text-xs font-mono outline-none"
      style={{
        background: SURFACE,
        borderColor: invalid ? semantic.error : BORDER,
        color: TEXT,
      }}
    />
  )
}

function StyledSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const { BORDER, SURFACE, TEXT } = usePrismTheme()
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="prism-field w-full min-w-0 appearance-none rounded-md border px-2 py-1.5 text-xs outline-none"
      style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function CheckboxField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const { BORDER, CARD_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <label
      className="flex items-start gap-3 rounded-md border px-3 py-2.5"
      style={{ borderColor: BORDER, background: CARD_BG }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        style={{ accentColor: TEAL }}
      />
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold" style={{ color: TEXT }}>{label}</span>
        {description && (
          <span className="mt-0.5 block text-[10px] leading-relaxed" style={{ color: TEXT_DIM }}>
            {description}
          </span>
        )}
      </span>
    </label>
  )
}

function SliderField({ label, value, min, max, step = 0.01, format, onChange, color }: {
  label: string; value: number; min: number; max: number; step?: number
  format: (v: number) => string; onChange: (v: number) => void; color?: string
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const scale = max <= 1 ? 100 : 1
  const displayValue = value * scale
  const displayMin = min * scale
  const displayMax = max * scale
  const unit = scale === 100 ? '%' : undefined
  const tone = color ?? TEXT_DIM
  const [draft, setDraft] = useState(() => formatEditableNumber(displayValue))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setDraft(formatEditableNumber(displayValue))
    setInvalid(false)
  }, [displayValue])

  const commitDraft = () => {
    const parsed = parseNumericText(draft)
    if (parsed === null) {
      setInvalid(draft.trim().length > 0)
      setDraft(draft.trim().length > 0 ? draft : formatEditableNumber(displayValue))
      return
    }

    const clamped = Math.min(displayMax, Math.max(displayMin, parsed))
    setInvalid(false)
    onChange(clamped / scale)
  }

  return (
    <div className="space-y-1.5">
      <div className="grid items-center gap-x-3 gap-y-1" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(88px,112px) auto' }}>
        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</label>
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={e => {
            setDraft(e.target.value)
            if (invalid) setInvalid(false)
          }}
          onBlur={commitDraft}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitDraft()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setDraft(formatEditableNumber(displayValue))
              setInvalid(false)
            }
          }}
          className="prism-field w-full min-w-0 rounded-md border px-2 py-1.5 text-xs font-mono outline-none"
          style={{
            background: PAGE_BG,
            borderColor: invalid ? semantic.error : BORDER,
            color: TEXT,
          }}
          aria-label={label}
        />
        <span className="text-[11px] font-semibold font-mono" style={{ color: tone }}>
          {unit ?? format(value)}
        </span>
      </div>
    </div>
  )
}

function ComputedRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const c = ok === undefined ? TEXT : ok ? semantic.success : semantic.error
  return (
    <div className="flex justify-between items-center rounded px-2 py-1.5"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>{label}</span>
      <span className="text-xs font-bold font-mono" style={{ color: c }}>{value}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { SHADOW_SOFT, TEAL } = usePrismTheme()
  return (
    <div className="mb-2 mt-1 flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL, boxShadow: SHADOW_SOFT }} />
      <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: TEAL }}>{children}</span>
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
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const BG = PAGE_BG
  const BORDER2 = BORDER
  const updateComponent = useAppStore(s => s.updateComponent)
  const saveComponentTemplate = useAppStore(s => s.saveComponentTemplate)
  const setSyncError = useAppStore(s => s.setSyncError)
  const [local, setLocal] = useState<SIFComponent>(() => synchronizeComponentParams(component))
  const [factorizedLambdaUnit, setFactorizedLambdaUnit] = useState<FactorizedLambdaUnit>('FIT')
  const [developedLambdaUnit, setDevelopedLambdaUnit] = useState<DevelopedLambdaUnit>('FIT')
  const [lambdaStarUnit, setLambdaStarUnit] = useState<DevelopedLambdaUnit>('PER_HOUR')
  const [lifetimeUnit, setLifetimeUnit] = useState<TimeDisplayUnit>('yr')
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
  useEffect(() => {
    setLocal(synchronizeComponentParams(component))
    setLambdaStarUnit('PER_HOUR')
    setLifetimeUnit(component.advanced.lifetime && component.advanced.lifetime < HOURS_PER_YEAR ? 'hr' : 'yr')
  }, [component])
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
  const componentPFD = calcComponentPFDValue(local)
  const sffOk = sff >= 0.6
  const dcOk  = dc  >= 0.6

  const meta = TYPE_META[subsystemType]
  const partialTestActive = local.test.testType === 'partial' || local.advanced.partialTest.enabled
  const onlineDuringTest = local.test.testType === 'online'
  const headerTypeLabel = local.instrumentType || CAT_LABELS[local.instrumentCategory] || meta.label

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-3 py-3" style={{ borderColor: `${BORDER}A6` }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${meta.color}18`, boxShadow: SHADOW_SOFT }}
            >
              <meta.Icon size={13} style={{ color: meta.color }} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold tracking-[0.01em]" style={{ color: TEXT }}>{local.tagName}</p>
              <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
                {meta.label} · {headerTypeLabel}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={openSaveDialog}
              className="prism-action inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[10px] font-bold"
              style={{ borderColor: `${meta.color}45`, background: `${meta.color}12`, color: meta.color }}
            >
              <Save size={11} />
              Template
            </button>
            <button
              type="button"
              onClick={onClose}
              className="prism-action shrink-0 rounded-md border p-1.5"
              style={{ color: TEXT_DIM, borderColor: BORDER }}
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {saveNotice && (
          <div className="mb-3 rounded-md border px-2.5 py-2 text-[10px]"
            style={{ background: `${TEAL}08`, borderColor: `${TEAL}25`, color: TEAL_DIM }}>
            {saveNotice}
          </div>
        )}

        <div className="grid gap-2">
          <LiveMetric label="PFD" value={formatPFD(componentPFD)} />
        </div>
      </div>

      <RightPanelBody compact className="space-y-3">
        <InspectorBlock title="Identification">
          <div className="space-y-3">
            <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_FORM_GRID }}>
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
            </div>

            <FieldRow label="Description">
              <textarea
                value={local.description}
                onChange={e => upd({ description: e.target.value })}
                rows={3}
                className="prism-field w-full rounded-md border px-2 py-1.5 text-xs outline-none resize-none"
                style={{ background: BG, borderColor: BORDER2, color: TEXT }}
                placeholder="Description optionnelle…"
              />
            </FieldRow>
          </div>
        </InspectorBlock>

        <InspectorBlock title="Paramètres">
          <div className="space-y-3">
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: BG }}>
              {(['factorized', 'developed'] as ParamMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => upd({ paramMode: m })}
                  className="prism-action flex-1 rounded-md py-1.5 text-[11px] font-bold transition-all"
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
                          className="prism-action rounded px-2 py-1 text-[10px] font-bold font-mono transition-all"
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
                    placeholder={factorizedLambdaUnit === 'FIT' ? 'Ex. 1500 ou 1.50E3' : 'Ex. 1.50E-6'}
                  />
                  <p className="text-[10px] mt-1" style={{ color: TEXT_DIM }}>
                    {factorizedLambdaUnit === 'FIT'
                      ? 'Saisie libre en FIT. Exemple equivalent: 1500 FIT = 1.50E-6 h^-1.'
                      : 'Saisie libre en h^-1 absolu. Exemple: 1.50E-6 h^-1 = 1500 FIT.'}
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
                          className="prism-action rounded px-2 py-1 text-[10px] font-bold font-mono transition-all"
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

                <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_FORM_GRID }}>
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
                </div>
                <p className="text-[10px] -mt-1" style={{ color: TEXT_DIM }}>
                  Saisie libre, avec ou sans notation scientifique.
                </p>
              </>
            )}

            <SectionTitle>Métriques calculées</SectionTitle>
            <ComputedRow label="SFF" value={formatPct(sff)} ok={sffOk} />
            <ComputedRow label="DC eff" value={formatPct(dc)} ok={dcOk} />
          </div>
        </InspectorBlock>

        <InspectorBlock title="Test de preuve">
          <div className="space-y-3">
            <SectionTitle>Intervalle de test de preuve</SectionTitle>
            <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_WIDE_GRID }}>
              <FieldRow label="T1">
                <div className="flex gap-2">
                  <StyledInput
                    type="number" step="0.1" value={local.test.T1}
                    onChange={v => updT({ T1: parseFloat(v) || 1 })}
                  />
                  <div className="w-24 shrink-0">
                    <StyledSelect
                      value={local.test.T1Unit}
                      onChange={v => updT({ T1Unit: v as 'hr' | 'yr' })}
                      options={[{ value: 'yr', label: 'années' }, { value: 'hr', label: 'heures' }]}
                    />
                  </div>
                </div>
              </FieldRow>

              <FieldRow label="T0 — Premier test">
                <div className="flex gap-2">
                  <StyledInput
                    type="number" step="0.1" value={local.test.T0}
                    onChange={v => updT({ T0: parseFloat(v) || 0 })}
                  />
                  <div className="w-24 shrink-0">
                    <StyledSelect
                      value={local.test.T0Unit}
                      onChange={v => updT({ T0Unit: v as 'hr' | 'yr' })}
                      options={[{ value: 'yr', label: 'années' }, { value: 'hr', label: 'heures' }]}
                    />
                  </div>
                </div>
              </FieldRow>
            </div>

            <SectionTitle>Type de test</SectionTitle>
            <div className="space-y-1.5">
              {TEST_TYPES.map(tt => (
                <button key={tt.value} type="button"
                  onClick={() => updT({ testType: tt.value })}
                  className="prism-action flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-all"
                  style={local.test.testType === tt.value ? {
                    borderColor: TEAL, background: `${TEAL}12`, color: TEXT,
                  } : {
                    borderColor: BORDER2, background: BG, color: TEXT_DIM,
                  }}
                >
                  <div className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: local.test.testType === tt.value ? TEAL : BORDER2 }}>
                    {local.test.testType === tt.value && (
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold">{tt.label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: TEXT_DIM }}>{tt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <CheckboxField
              label="Composant disponible pendant test (X)"
              description="Alias direct du mode “En ligne” pour le test complet."
              checked={onlineDuringTest}
              onChange={checked => updT({
                testType: checked
                  ? 'online'
                  : local.test.testType === 'online'
                    ? 'stopped'
                    : local.test.testType,
              })}
            />
          </div>
        </InspectorBlock>

        <InspectorBlock title="Avancé">
          <div className="space-y-3">
            <SectionTitle>Réparation</SectionTitle>
            <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_WIDE_GRID }}>
              <FieldRow label="MTTR [heures]">
                <StyledInput
                  type="number" step="1" value={local.advanced.MTTR}
                  onChange={v => updA({ MTTR: parseFloat(v) || 0 })}
                />
              </FieldRow>
              <FieldRow label="Durée test (π) [heures]">
                <StyledInput
                  type="number" step="0.1" value={local.advanced.testDuration}
                  onChange={v => updA({ testDuration: parseFloat(v) || 0 })}
                />
              </FieldRow>
            </div>

            <SectionTitle>Paramètres test avancés</SectionTitle>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TEXT_DIM }}>
                    λ pendant test (λ*)
                  </label>
                  <div className="flex rounded-md p-0.5" style={{ background: BG }}>
                    {DEVELOPED_LAMBDA_UNITS.map(unit => (
                      <button
                        key={unit.value}
                        type="button"
                        onClick={() => setLambdaStarUnit(unit.value)}
                        className="prism-action rounded px-2 py-1 text-[10px] font-bold font-mono transition-all"
                        style={lambdaStarUnit === unit.value
                          ? { background: TEAL, color: '#fff' }
                          : { color: TEXT_DIM }}
                      >
                        {unit.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ScientificInput
                  value={developedLambdaToDisplay(local.advanced.lambdaStar, lambdaStarUnit)}
                  onCommit={value => updA({ lambdaStar: displayToDevelopedLambda(value, lambdaStarUnit) })}
                  placeholder={lambdaStarUnit === 'FIT' ? 'Ex. 1.13E2' : 'Ex. 1.13E-7'}
                />
                <CheckboxField
                  label="Equal to Lambda"
                  description="Utilise le lambda principal pendant le test au lieu d’un λ* dédié."
                  checked={local.advanced.lambdaStarEqualToLambda}
                  onChange={checked => updA({ lambdaStarEqualToLambda: checked })}
                />
              </div>
            </div>

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
            <SliderField
              label="DC alarmed only" value={local.advanced.DCalarmedOnly}
              min={0} max={1} step={0.01} format={formatPct}
              onChange={v => updA({ DCalarmedOnly: v })}
            />

            <SectionTitle>Durée de vie</SectionTitle>
            <FieldRow label="Durée de vie composant">
              <div className="flex gap-2">
                <StyledInput
                  value={hoursToDisplay(local.advanced.lifetime, lifetimeUnit)}
                  onChange={v => {
                    const parsed = parseNumericText(v)
                    updA({ lifetime: parsed === null ? null : displayToHours(parsed, lifetimeUnit) })
                  }}
                  placeholder={lifetimeUnit === 'yr' ? 'Ex. 20' : 'Ex. 175200'}
                />
                <div className="w-24 shrink-0">
                  <StyledSelect
                    value={lifetimeUnit}
                    onChange={value => setLifetimeUnit(value as TimeDisplayUnit)}
                    options={[{ value: 'yr', label: 'années' }, { value: 'hr', label: 'heures' }]}
                  />
                </div>
              </div>
            </FieldRow>

            <SectionTitle>Sigma</SectionTitle>
            <FieldRow label="σ (diagnostic complet)">
              <StyledInput
                type="number" step="0.1" value={local.advanced.sigma}
                onChange={v => updA({ sigma: parseFloat(v) || 1 })}
              />
            </FieldRow>

            <SectionTitle>Test partiel (PST)</SectionTitle>
            <div className="space-y-3">
              <CheckboxField
                label="Activer le test partiel"
                description="Active la logique PST intermédiaire entre deux proof tests complets."
                checked={partialTestActive}
                onChange={checked => {
                  if (checked) {
                    updA({ partialTest: { ...local.advanced.partialTest, enabled: true } })
                    return
                  }

                  commit(prev => ({
                    ...prev,
                    test: prev.test.testType === 'partial'
                      ? { ...prev.test, testType: 'stopped' }
                      : prev.test,
                    advanced: {
                      ...prev.advanced,
                      partialTest: { ...prev.advanced.partialTest, enabled: false },
                    },
                  }))
                }}
              />

              {partialTestActive && (
                <div className="rounded-lg border p-3 space-y-3"
                  style={{ borderColor: `${TEAL}35`, background: `${TEAL}08` }}>
                  <FieldRow label="Durée (π) [heures]">
                    <StyledInput
                      type="number" step="0.1"
                      value={local.advanced.partialTest.duration}
                      onChange={v => updA({ partialTest: { ...local.advanced.partialTest, duration: parseFloat(v) || 0 } })}
                    />
                  </FieldRow>
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
              )}
            </div>
          </div>
        </InspectorBlock>
      </RightPanelBody>

      <Dialog open={isSaveDialogOpen} onOpenChange={open => {
        setIsSaveDialogOpen(open)
        if (!open) setSaveError(null)
      }}>
        <DialogContent className="max-w-xl border" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}>
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
                className="prism-field w-full rounded-md border px-2 py-1.5 text-xs outline-none resize-none"
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
                style={{ background: `${semantic.error}15`, borderColor: `${semantic.error}30`, color: semantic.error }}>
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
function LiveMetric({
  label,
  value,
  ok,
  className,
}: {
  label: string
  value: string
  ok?: boolean
  className?: string
}) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM, semantic } = usePrismTheme()
  const color = ok === undefined ? TEXT_DIM : ok ? semantic.success : semantic.error
  return (
    <div className={`min-w-0 rounded-lg px-2.5 py-2 ${className ?? ''}`}
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}>
      <p className="text-[8px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 truncate text-[11px] font-semibold" style={{ color: ok === undefined ? TEXT : color }}>{value}</p>
    </div>
  )
}
