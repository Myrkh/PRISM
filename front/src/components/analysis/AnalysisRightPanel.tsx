import { useMemo, useState } from 'react'
import { Clock3, LineChart, PieChart, RotateCcw } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  IntercalaireCard,
  IntercalaireTabBar,
} from '@/components/layout/SIFWorkbenchLayout'
import type { SIFAnalysisSettings } from '@/core/models/analysisSettings'
import { BORDER, CARD_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM, dark } from '@/styles/tokens'

const BG = dark.page
const CARD = dark.card2

type PanelTab = 'general' | 'chart' | 'pie'

const PANEL_TABS: { id: PanelTab; label: string; Icon: React.ElementType }[] = [
  { id: 'general', label: 'General', Icon: Clock3 },
  { id: 'chart', label: 'Curve', Icon: LineChart },
  { id: 'pie', label: 'Pie', Icon: PieChart },
]

interface Props {
  settings: SIFAnalysisSettings
  onChange: (settings: SIFAnalysisSettings) => void
  onReset: () => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </p>
  )
}

function FieldCard({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: CARD }}>
      <p className="text-sm font-semibold" style={{ color: TEXT }}>{label}</p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>
      <div className="mt-3">{children}</div>
    </div>
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
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
      style={{ borderColor: BORDER, background: BG, color: TEXT }}
    />
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
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(Number(e.target.value))}
      className="h-9 w-full rounded-lg border px-2.5 text-sm font-mono outline-none"
      style={{ borderColor: BORDER, background: BG, color: TEXT }}
    />
  )
}

function SegmentedField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (next: T) => void
  options: readonly { label: string; value: T }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border p-1" style={{ borderColor: BORDER, background: BG }}>
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="rounded px-3 py-1.5 text-xs font-semibold transition-colors"
            style={active
              ? { background: TEAL, color: '#fff' }
              : { background: 'transparent', color: TEXT_DIM }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
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
    <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: BG }}>
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
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: BG }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-8 w-10 rounded border-0 bg-transparent p-0"
        />
        <span className="text-xs font-mono" style={{ color: TEXT }}>{value}</span>
      </div>
    </div>
  )
}

export function AnalysisRightPanel({ settings, onChange, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>('general')

  const activeIdx = useMemo(
    () => PANEL_TABS.findIndex(tab => tab.id === activeTab),
    [activeTab],
  )

  const setGeneral = (patch: Partial<SIFAnalysisSettings['general']>) =>
    onChange({ ...settings, general: { ...settings.general, ...patch } })
  const setChart = (patch: Partial<SIFAnalysisSettings['chart']>) =>
    onChange({ ...settings, chart: { ...settings.chart, ...patch } })
  const setPie = (patch: Partial<SIFAnalysisSettings['pie']>) =>
    onChange({ ...settings, pie: { ...settings.pie, ...patch } })

  return (
    <div
      className="flex h-full flex-col overflow-hidden border-l"
      style={{ borderColor: BORDER, background: PANEL_BG }}
    >
      <div className="px-3 pt-3 shrink-0">
        <IntercalaireTabBar
          tabs={PANEL_TABS}
          active={activeTab}
          onSelect={id => setActiveTab(id as PanelTab)}
          cardBg={CARD_BG}
          labelSize="sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <IntercalaireCard tabCount={PANEL_TABS.length} activeIdx={activeIdx} className="p-3 space-y-3">
          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: BG }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionLabel>Calculation Settings</SectionLabel>
                <h3 className="mt-1 text-sm font-semibold" style={{ color: TEXT }}>
                  {activeTab === 'general'
                    ? 'Mission profile'
                    : activeTab === 'chart'
                      ? 'PFD curve display'
                      : 'Contribution display'}
                </h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  Réglages visuels et horizon de calcul pour cette SIF.
                </p>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                style={{ borderColor: `${TEAL}55`, color: TEAL, background: `${TEAL}10` }}
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>
          </div>

          {activeTab === 'general' && (
            <>
              <FieldCard
                label="Mission time"
                hint="Définit l’horizon utilisé pour la courbe affichée dans Calculation."
              >
                <div className="space-y-2">
                  <NumberField
                    value={settings.general.missionTime}
                    min={1}
                    max={100000}
                    step={settings.general.missionTimeUnit === 'yr' ? 1 : 24}
                    onChange={next => setGeneral({ missionTime: next })}
                  />
                  <SegmentedField
                    value={settings.general.missionTimeUnit}
                    onChange={next => setGeneral({ missionTimeUnit: next })}
                    options={[
                      { label: 'Years', value: 'yr' },
                      { label: 'Hours', value: 'hr' },
                    ]}
                  />
                </div>
              </FieldCard>

              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: CARD }}>
                <SectionLabel>Current snapshot</SectionLabel>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span style={{ color: TEXT_DIM }}>Mission</span>
                    <span className="font-mono font-semibold" style={{ color: TEXT }}>
                      {settings.general.missionTime} {settings.general.missionTimeUnit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: TEXT_DIM }}>Scale</span>
                    <span className="font-mono font-semibold" style={{ color: TEXT }}>
                      {settings.chart.yScale}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: TEXT_DIM }}>Curve points</span>
                    <span className="font-mono font-semibold" style={{ color: TEXT }}>
                      {settings.chart.curvePoints}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'chart' && (
            <>
              <FieldCard
                label="Chart titles"
                hint="Titres affichés au-dessus de la courbe PFD."
              >
                <div className="space-y-2">
                  <TextField
                    value={settings.chart.title}
                    onChange={next => setChart({ title: next })}
                    placeholder="Chart title"
                  />
                  <TextField
                    value={settings.chart.subtitle}
                    onChange={next => setChart({ subtitle: next })}
                    placeholder="Chart subtitle"
                  />
                </div>
              </FieldCard>

              <FieldCard
                label="Scale and density"
                hint="Pilotage de l’échelle Y et du nombre de points calculés."
              >
                <div className="space-y-2">
                  <SegmentedField
                    value={settings.chart.yScale}
                    onChange={next => setChart({ yScale: next })}
                    options={[
                      { label: 'Log', value: 'log' },
                      { label: 'Linear', value: 'linear' },
                    ]}
                  />
                  <NumberField
                    value={settings.chart.curvePoints}
                    min={60}
                    max={2000}
                    step={20}
                    onChange={next => setChart({ curvePoints: next })}
                  />
                </div>
              </FieldCard>

              <div className="space-y-2">
                <ToggleRow
                  label="Show grid"
                  hint="Affiche la grille du graphe."
                  checked={settings.chart.showGrid}
                  onCheckedChange={next => setChart({ showGrid: next })}
                />
                <ToggleRow
                  label="Show legend"
                  hint="Affiche la légende du graphe."
                  checked={settings.chart.showLegend}
                  onCheckedChange={next => setChart({ showLegend: next })}
                />
                <ToggleRow
                  label="Show SIL bands"
                  hint="Affiche les zones SIL sur l’axe Y."
                  checked={settings.chart.showSILBands}
                  onCheckedChange={next => setChart({ showSILBands: next })}
                />
                <ToggleRow
                  label="Show subsystem lines"
                  hint="Affiche capteurs, logique et actionneurs en plus du total."
                  checked={settings.chart.showSubsystems}
                  onCheckedChange={next => setChart({ showSubsystems: next })}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <ColorField
                  label="Total"
                  value={settings.chart.totalColor}
                  onChange={next => setChart({ totalColor: next })}
                />
                <ColorField
                  label="Sensors"
                  value={settings.chart.sensorColor}
                  onChange={next => setChart({ sensorColor: next })}
                />
                <ColorField
                  label="Solver"
                  value={settings.chart.logicColor}
                  onChange={next => setChart({ logicColor: next })}
                />
                <ColorField
                  label="Actuators"
                  value={settings.chart.actuatorColor}
                  onChange={next => setChart({ actuatorColor: next })}
                />
              </div>
            </>
          )}

          {activeTab === 'pie' && (
            <>
              <FieldCard
                label="Pie titles"
                hint="Titres affichés au-dessus du camembert de contribution."
              >
                <div className="space-y-2">
                  <TextField
                    value={settings.pie.title}
                    onChange={next => setPie({ title: next })}
                    placeholder="Pie title"
                  />
                  <TextField
                    value={settings.pie.subtitle}
                    onChange={next => setPie({ subtitle: next })}
                    placeholder="Pie subtitle"
                  />
                </div>
              </FieldCard>

              <div className="space-y-2">
                <ToggleRow
                  label="Show labels"
                  hint="Affiche les pourcentages directement sur le camembert."
                  checked={settings.pie.showLabels}
                  onCheckedChange={next => setPie({ showLabels: next })}
                />
              </div>

              <FieldCard
                label="Donut geometry"
                hint="Réglage des rayons interne et externe."
              >
                <div className="space-y-2">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                      Inner radius
                    </p>
                    <NumberField
                      value={settings.pie.innerRadius}
                      min={24}
                      max={120}
                      step={2}
                      onChange={next => setPie({ innerRadius: next })}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                      Outer radius
                    </p>
                    <NumberField
                      value={settings.pie.outerRadius}
                      min={48}
                      max={160}
                      step={2}
                      onChange={next => setPie({ outerRadius: next })}
                    />
                  </div>
                </div>
              </FieldCard>
            </>
          )}
        </IntercalaireCard>
      </div>
    </div>
  )
}
