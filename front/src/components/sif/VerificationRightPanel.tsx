import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  LineChart,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import { normalizeSIFAssumptions } from '@/core/models/sifAssumptions'
import type { SIFAnalysisSettings } from '@/core/models/analysisSettings'
import type { ComplianceResult } from '@/components/sif/complianceCalc'
import type {
  SIF,
  SIFAssumption,
  SIFAssumptionCategory,
  SIFAssumptionStatus,
  SIFCalcResult,
  SIFReferenceTab,
} from '@/core/types'
import { formatPFD } from '@/core/math/pfdCalc'
import { useAppStore } from '@/store/appStore'
import type { SIFTab } from '@/store/types'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, semantic } from '@/styles/tokens'

type PanelTab = 'summary' | 'graph' | 'assumptions'

const PANEL_TABS: { id: PanelTab; label: string; Icon: React.ElementType }[] = [
  { id: 'summary', label: 'Resume', Icon: ShieldCheck },
  { id: 'graph', label: 'Graphe', Icon: LineChart },
  { id: 'assumptions', label: 'Hypotheses', Icon: Lightbulb },
]

const ASSUMPTION_STATUS_OPTIONS: { value: SIFAssumptionStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'validated', label: 'Validated' },
]

const ASSUMPTION_CATEGORY_OPTIONS: { value: SIFAssumptionCategory; label: string }[] = [
  { value: 'process', label: 'Process' },
  { value: 'proof', label: 'Proof' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'data', label: 'Data' },
  { value: 'governance', label: 'Governance' },
  { value: 'other', label: 'Other' },
]

const ASSUMPTION_TAB_OPTIONS: { value: SIFReferenceTab; label: string }[] = [
  { value: 'cockpit', label: 'Cockpit' },
  { value: 'context', label: 'Contexte' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'verification', label: 'Verification' },
  { value: 'exploitation', label: 'Exploitation' },
  { value: 'report', label: 'Publier' },
]

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  settings: SIFAnalysisSettings
  onChangeSettings: (settings: SIFAnalysisSettings) => void
  onResetSettings: () => void
  onUpdateAssumptions: (assumptions: SIFAssumption[]) => Promise<void> | void
  onSelectTab: (tab: SIFTab) => void
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <p className="text-sm font-semibold" style={{ color: TEXT }}>{title}</p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </label>
  )
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
      style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
    />
  )
}

function FieldTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-[76px] w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors resize-y"
      style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
    />
  )
}

function FieldSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
      style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <FieldInput
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={event => onChange(Number(event.target.value))}
    />
  )
}

function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}) {
  return (
    <FieldInput
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
    />
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: CARD_BG }}>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: TEXT }}>{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: CARD_BG }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={event => onChange(event.target.value)}
          className="h-8 w-10 rounded border-0 bg-transparent p-0"
        />
        <span className="text-xs font-mono" style={{ color: TEXT }}>{value}</span>
      </div>
    </div>
  )
}

function createDraftAssumption(): SIFAssumption {
  return {
    id: nanoid(),
    title: 'New assumption',
    statement: '',
    rationale: '',
    status: 'draft',
    owner: '',
    reviewDate: '',
    category: 'other',
    linkedTab: 'verification',
  }
}

function PFDContributionDonut({
  result,
  settings,
}: {
  result: SIFCalcResult
  settings: SIFAnalysisSettings
}) {
  const items = result.subsystems
    .map(subsystem => ({
      key: subsystem.subsystemId,
      label: subsystem.type.charAt(0).toUpperCase() + subsystem.type.slice(1),
      value: Math.max(subsystem.PFD_avg, 0),
      color:
        subsystem.type === 'sensor' ? settings.chart.sensorColor :
        subsystem.type === 'logic' ? settings.chart.logicColor :
        settings.chart.actuatorColor,
    }))
    .filter(item => item.value > 0)

  const total = items.reduce((sum, item) => sum + item.value, 0)

  if (!items.length || total <= 0) {
    return (
      <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: BORDER, background: CARD_BG, color: TEXT_DIM }}>
        No contribution split is available for the current result set.
      </div>
    )
  }

  const previewOuter = Math.min(settings.pie.outerRadius, 88)
  const previewInner = Math.min(settings.pie.innerRadius, previewOuter - 12)
  const radius = (previewOuter + previewInner) / 2
  const strokeWidth = Math.max(previewOuter - previewInner, 12)
  const size = previewOuter * 2 + 32
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle>Camembert</SectionTitle>
          <p className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>{settings.pie.title}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{settings.pie.subtitle}</p>
        </div>
        <div className="rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ borderColor: BORDER, background: CARD_BG, color: TEAL_DIM }}>
          PFD split
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center gap-3">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`${TEXT_DIM}20`}
            strokeWidth={strokeWidth}
          />
          {items.map(item => {
            const segment = (item.value / total) * circumference
            const currentOffset = offset
            offset += segment
            const ratio = item.value / total
            const angle = -Math.PI / 2 + ((currentOffset + (segment / 2)) / circumference) * (Math.PI * 2)
            const labelRadius = radius + (settings.pie.showLabels ? 0 : 9999)
            const x = center + Math.cos(angle) * labelRadius
            const y = center + Math.sin(angle) * labelRadius

            return (
              <g key={item.key}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  strokeDasharray={`${segment} ${circumference - segment}`}
                  strokeDashoffset={-currentOffset}
                  transform={`rotate(-90 ${center} ${center})`}
                />
                {settings.pie.showLabels && ratio > 0.08 && (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill={TEXT}
                  >
                    {Math.round(ratio * 100)}%
                  </text>
                )}
              </g>
            )
          })}
          <text x={center} y={center - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill={TEXT_DIM}>
            Total
          </text>
          <text x={center} y={center + 12} textAnchor="middle" fontSize="14" fontWeight="800" fill={TEXT}>
            {formatPFD(result.PFD_avg)}
          </text>
        </svg>

        <div className="grid w-full gap-2">
          {items.map(item => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG }}>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-xs font-semibold" style={{ color: TEXT }}>{item.label}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                  {Math.round((item.value / total) * 100)}%
                </p>
                <p className="text-xs font-mono" style={{ color: TEXT }}>{formatPFD(item.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function VerificationRightPanel({
  sif,
  result,
  compliance,
  settings,
  onChangeSettings,
  onResetSettings,
  onUpdateAssumptions,
  onSelectTab,
}: Props) {
  const selectedRightPanelTab = useAppStore(s => s.rightPanelTabs.verification)
  const setRightPanelTab = useAppStore(s => s.setRightPanelTab)
  const [activeTab, setActiveTab] = useState<PanelTab>('summary')
  const [assumptionDrafts, setAssumptionDrafts] = useState<SIFAssumption[]>(() => normalizeSIFAssumptions(sif.assumptions))
  const [assumptionsDirty, setAssumptionsDirty] = useState(false)
  const [assumptionsSaving, setAssumptionsSaving] = useState(false)
  const [assumptionsError, setAssumptionsError] = useState<string | null>(null)

  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)
  const evidenceComplete = compliance.evidenceItems.filter(item => item.status === 'complete').length
  const assumptionsInReview = sif.assumptions.filter(item => item.status !== 'validated').length

  useEffect(() => {
    if (selectedRightPanelTab && PANEL_TABS.some(tab => tab.id === selectedRightPanelTab)) {
      setActiveTab(selectedRightPanelTab as PanelTab)
    }
  }, [selectedRightPanelTab])

  useEffect(() => {
    setAssumptionDrafts(normalizeSIFAssumptions(sif.assumptions))
    setAssumptionsDirty(false)
    setAssumptionsError(null)
  }, [sif.assumptions])

  const setGeneral = (patch: Partial<SIFAnalysisSettings['general']>) =>
    onChangeSettings({ ...settings, general: { ...settings.general, ...patch } })

  const setChart = (patch: Partial<SIFAnalysisSettings['chart']>) =>
    onChangeSettings({ ...settings, chart: { ...settings.chart, ...patch } })

  const setPie = (patch: Partial<SIFAnalysisSettings['pie']>) =>
    onChangeSettings({ ...settings, pie: { ...settings.pie, ...patch } })

  const updateAssumption = <K extends keyof SIFAssumption>(
    assumptionId: string,
    key: K,
    value: SIFAssumption[K],
  ) => {
    setAssumptionDrafts(prev =>
      prev.map(assumption =>
        assumption.id === assumptionId ? { ...assumption, [key]: value } : assumption,
      ),
    )
    setAssumptionsDirty(true)
    setAssumptionsError(null)
  }

  const addAssumption = () => {
    setAssumptionDrafts(prev => [...prev, createDraftAssumption()])
    setAssumptionsDirty(true)
    setAssumptionsError(null)
  }

  const removeAssumption = (assumptionId: string) => {
    setAssumptionDrafts(prev => prev.filter(assumption => assumption.id !== assumptionId))
    setAssumptionsDirty(true)
    setAssumptionsError(null)
  }

  const resetAssumptions = () => {
    setAssumptionDrafts(normalizeSIFAssumptions(sif.assumptions))
    setAssumptionsDirty(false)
    setAssumptionsError(null)
  }

  const saveAssumptions = async () => {
    setAssumptionsSaving(true)
    setAssumptionsError(null)
    try {
      const normalized = normalizeSIFAssumptions(assumptionDrafts)
      await onUpdateAssumptions(normalized)
      setAssumptionDrafts(normalized)
      setAssumptionsDirty(false)
    } catch (error) {
      setAssumptionsError(error instanceof Error ? error.message : 'Unable to save assumptions.')
    } finally {
      setAssumptionsSaving(false)
    }
  }

  return (
    <RightPanelShell
      items={PANEL_TABS}
      active={activeTab}
      onSelect={nextTab => {
        setActiveTab(nextTab)
        setRightPanelTab('verification', nextTab)
      }}
      contentBg={PANEL_BG}
    >
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarGutter: 'stable' }}>
        <div className="space-y-3">
          {activeTab === 'summary' && (
            <>
              <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionTitle>Ready</SectionTitle>
                <div className="space-y-2">
                  {[
                    { label: 'Phase', value: '3 / 4', tone: TEXT },
                    { label: 'Ready', value: `${compliance.score}%`, tone: result.meetsTarget ? semantic.success : semantic.warning },
                    { label: 'Blockers', value: String(openGaps + assumptionsInReview), tone: openGaps + assumptionsInReview === 0 ? semantic.success : semantic.warning },
                    { label: 'Preuves', value: `${evidenceComplete}/${compliance.evidenceItems.length}`, tone: evidenceComplete === compliance.evidenceItems.length ? semantic.success : TEXT },
                    { label: 'Proof test', value: sif.proofTestProcedure ? 'Defini' : 'Manquant', tone: sif.proofTestProcedure ? semantic.success : semantic.error },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border px-2.5 py-2" style={{ borderColor: BORDER, background: CARD_BG }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{item.label}</p>
                      <p className="text-sm font-semibold font-mono" style={{ color: item.tone }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionTitle>Blockers</SectionTitle>
                {openGaps > 0 || assumptionsInReview > 0 ? (
                  <>
                    {compliance.technicalFindings.slice(0, 3).map(finding => (
                      <div key={finding.id} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: `${semantic.warning}44`, background: `${semantic.warning}10`, color: TEXT }}>
                        {finding.title} · {finding.subsystemLabel}
                      </div>
                    ))}
                    {assumptionsInReview > 0 && (
                      <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: `${semantic.warning}44`, background: `${semantic.warning}10`, color: TEXT }}>
                        {assumptionsInReview} hypothese{assumptionsInReview > 1 ? 's' : ''} a revoir
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border px-3 py-3 text-xs" style={{ borderColor: `${semantic.success}44`, background: `${semantic.success}10`, color: semantic.success }}>
                    Aucun blocage technique ouvert.
                  </div>
                )}
              </div>

              <PFDContributionDonut result={result} settings={settings} />

              <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionTitle>CTA</SectionTitle>
                <Button size="sm" className="w-full justify-between" onClick={() => onSelectTab('exploitation')}>
                  Traiter / passer en Exploitation
                  <ArrowRight size={12} />
                </Button>
              </div>
            </>
          )}

          {activeTab === 'graph' && (
            <>
              <SectionCard
                title="Mission de calcul"
                hint="Horizon et unite utilises pour la courbe PFD."
              >
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Mission time</FieldLabel>
                    <NumberField
                      value={settings.general.missionTime}
                      min={1}
                      max={100000}
                      step={settings.general.missionTimeUnit === 'yr' ? 1 : 24}
                      onChange={next => setGeneral({ missionTime: Math.max(1, next || 1) })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Unite</FieldLabel>
                    <FieldSelect
                      value={settings.general.missionTimeUnit}
                      onChange={value => setGeneral({ missionTimeUnit: value === 'hr' ? 'hr' : 'yr' })}
                      options={[
                        { value: 'yr', label: 'Years' },
                        { value: 'hr', label: 'Hours' },
                      ]}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Courbe PFD"
                hint="Titres, densite, echelle et overlays du graphe principal."
              >
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Chart title</FieldLabel>
                    <TextField value={settings.chart.title} onChange={next => setChart({ title: next })} />
                  </div>
                  <div>
                    <FieldLabel>Chart subtitle</FieldLabel>
                    <TextField value={settings.chart.subtitle} onChange={next => setChart({ subtitle: next })} />
                  </div>
                  <div>
                    <FieldLabel>Scale</FieldLabel>
                    <FieldSelect
                      value={settings.chart.yScale}
                      onChange={value => setChart({ yScale: value === 'linear' ? 'linear' : 'log' })}
                      options={[
                        { value: 'log', label: 'Log' },
                        { value: 'linear', label: 'Linear' },
                      ]}
                    />
                  </div>
                  <div>
                    <FieldLabel>Curve points</FieldLabel>
                    <NumberField
                      value={settings.chart.curvePoints}
                      min={60}
                      max={2000}
                      step={20}
                      onChange={next => setChart({ curvePoints: Math.max(60, next || 60) })}
                    />
                  </div>
                  <ToggleRow
                    label="Show grid"
                    hint="Affiche la grille du graphe."
                    checked={settings.chart.showGrid}
                    onCheckedChange={next => setChart({ showGrid: next })}
                  />
                  <ToggleRow
                    label="Show legend"
                    hint="Affiche la legende de la courbe."
                    checked={settings.chart.showLegend}
                    onCheckedChange={next => setChart({ showLegend: next })}
                  />
                  <ToggleRow
                    label="Show SIL bands"
                    hint="Affiche les zones SIL sur l axe Y."
                    checked={settings.chart.showSILBands}
                    onCheckedChange={next => setChart({ showSILBands: next })}
                  />
                  <ToggleRow
                    label="Show subsystem lines"
                    hint="Affiche sensor / logic / actuator en plus du total."
                    checked={settings.chart.showSubsystems}
                    onCheckedChange={next => setChart({ showSubsystems: next })}
                  />
                  <div className="grid grid-cols-1 gap-2">
                    <ColorField label="Total" value={settings.chart.totalColor} onChange={next => setChart({ totalColor: next })} />
                    <ColorField label="Sensors" value={settings.chart.sensorColor} onChange={next => setChart({ sensorColor: next })} />
                    <ColorField label="Solver" value={settings.chart.logicColor} onChange={next => setChart({ logicColor: next })} />
                    <ColorField label="Actuators" value={settings.chart.actuatorColor} onChange={next => setChart({ actuatorColor: next })} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Camembert de contribution"
                hint="Le donut redevient visible ici, avec ses reglages."
              >
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Pie title</FieldLabel>
                    <TextField value={settings.pie.title} onChange={next => setPie({ title: next })} />
                  </div>
                  <div>
                    <FieldLabel>Pie subtitle</FieldLabel>
                    <TextField value={settings.pie.subtitle} onChange={next => setPie({ subtitle: next })} />
                  </div>
                  <ToggleRow
                    label="Show labels"
                    hint="Affiche les pourcentages sur le donut."
                    checked={settings.pie.showLabels}
                    onCheckedChange={next => setPie({ showLabels: next })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>Inner radius</FieldLabel>
                      <NumberField value={settings.pie.innerRadius} min={24} max={120} step={2} onChange={next => setPie({ innerRadius: next })} />
                    </div>
                    <div>
                      <FieldLabel>Outer radius</FieldLabel>
                      <NumberField value={settings.pie.outerRadius} min={48} max={160} step={2} onChange={next => setPie({ outerRadius: next })} />
                    </div>
                  </div>
                </div>
              </SectionCard>

              <PFDContributionDonut result={result} settings={settings} />

              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <button
                  type="button"
                  onClick={onResetSettings}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-colors"
                  style={{ borderColor: `${TEAL}55`, color: TEAL, background: `${TEAL}10` }}
                >
                  <RotateCcw size={12} />
                  Reinitialiser les reglages du graphe
                </button>
              </div>
            </>
          )}

          {activeTab === 'assumptions' && (
            <>
              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SectionTitle>Registre hypotheses</SectionTitle>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                      Edition restauree du registre explicite d hypotheses SIF.
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                    style={assumptionsInReview === 0
                      ? { borderColor: `${semantic.success}44`, color: semantic.success, background: `${semantic.success}10` }
                      : { borderColor: `${semantic.warning}44`, color: semantic.warning, background: `${semantic.warning}10` }}
                  >
                    {assumptionsInReview === 0 ? 'OK' : 'Review'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: CARD_BG }}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>Items</p>
                    <p className="mt-1 text-sm font-bold font-mono" style={{ color: TEXT }}>{assumptionDrafts.length}</p>
                  </div>
                  <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: CARD_BG }}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>Pending review</p>
                    <p className="mt-1 text-sm font-bold font-mono" style={{ color: assumptionsInReview === 0 ? semantic.success : semantic.warning }}>
                      {assumptionsInReview}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addAssumption}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                    style={{ borderColor: `${TEAL}55`, color: TEAL, background: `${TEAL}10` }}
                  >
                    <Plus size={12} />
                    Add assumption
                  </button>
                  <button
                    type="button"
                    onClick={resetAssumptions}
                    disabled={!assumptionsDirty || assumptionsSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
                    style={{ borderColor: BORDER, color: TEXT_DIM, background: CARD_BG }}
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={saveAssumptions}
                    disabled={!assumptionsDirty || assumptionsSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
                    style={{ borderColor: `${semantic.success}55`, color: semantic.success, background: `${semantic.success}10` }}
                  >
                    <Save size={12} />
                    {assumptionsSaving ? 'Saving...' : 'Save assumptions'}
                  </button>
                </div>

                {assumptionsError && (
                  <div
                    className="mt-3 rounded-lg border px-3 py-2 text-xs leading-relaxed"
                    style={{ borderColor: `${semantic.error}44`, background: `${semantic.error}10`, color: semantic.error }}
                  >
                    {assumptionsError}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {assumptionDrafts.map(assumption => (
                  <div key={assumption.id} className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <FieldLabel>Title</FieldLabel>
                        <TextField
                          value={assumption.title}
                          onChange={next => updateAssumption(assumption.id, 'title', next)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAssumption(assumption.id)}
                        className="mt-5 inline-flex items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors"
                        style={{ borderColor: `${semantic.error}44`, color: semantic.error, background: `${semantic.error}10` }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className="mt-3">
                      <FieldLabel>Statement</FieldLabel>
                      <FieldTextArea
                        value={assumption.statement}
                        onChange={event => updateAssumption(assumption.id, 'statement', event.target.value)}
                      />
                    </div>

                    <div className="mt-3">
                      <FieldLabel>Rationale</FieldLabel>
                      <FieldTextArea
                        value={assumption.rationale}
                        onChange={event => updateAssumption(assumption.id, 'rationale', event.target.value)}
                      />
                    </div>

                    <div className="mt-3 grid gap-3">
                      <div>
                        <FieldLabel>Owner</FieldLabel>
                        <TextField
                          value={assumption.owner}
                          onChange={next => updateAssumption(assumption.id, 'owner', next)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Review date</FieldLabel>
                        <FieldInput
                          type="date"
                          value={assumption.reviewDate}
                          onChange={event => updateAssumption(assumption.id, 'reviewDate', event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Status</FieldLabel>
                        <FieldSelect
                          value={assumption.status}
                          onChange={value => updateAssumption(assumption.id, 'status', value as SIFAssumptionStatus)}
                          options={ASSUMPTION_STATUS_OPTIONS}
                        />
                      </div>
                      <div>
                        <FieldLabel>Category</FieldLabel>
                        <FieldSelect
                          value={assumption.category}
                          onChange={value => updateAssumption(assumption.id, 'category', value as SIFAssumptionCategory)}
                          options={ASSUMPTION_CATEGORY_OPTIONS}
                        />
                      </div>
                      <div>
                        <FieldLabel>Linked tab</FieldLabel>
                        <FieldSelect
                          value={assumption.linkedTab}
                          onChange={value => updateAssumption(assumption.id, 'linkedTab', value as SIFReferenceTab)}
                          options={ASSUMPTION_TAB_OPTIONS}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {assumptionDrafts.length === 0 && (
                  <div className="rounded-xl border px-3 py-3 text-xs" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}>
                    Aucun registre d hypothese renseigne.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </RightPanelShell>
  )
}
