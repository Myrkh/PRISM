import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { InstrumentationIcon } from './InstrumentationIcons'
import {
  calcComponentDC,
  calcComponentSFF,
  calcSubComponentPFDValue,
  developedToFactorized,
  factorizedToDeveloped,
  formatPFD,
  formatPct,
} from '@/core/math/pfdCalc'
import type { DeterminedCharacter, InstrumentCategory, SIFComponent, SubElement, SubsystemType } from '@/core/types'
import { normalizeSubComponent, type NormalizedSubElement } from '@/core/models/subComponents'
import { InspectorBlock, RightPanelBody } from '@/components/layout/RightPanelShell'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { CAT_LABELS, INSTRUMENT_CATEGORIES, INSTRUMENT_TYPES } from './componentCatalog'
import {
  CheckboxField,
  ComputedRow,
  DETERMINED_CHARACTER_OPTIONS,
  DEVELOPED_LAMBDA_UNITS,
  FACTORIZED_LAMBDA_UNITS,
  FieldRow,
  PANEL_FORM_GRID,
  PANEL_WIDE_GRID,
  ScientificInput,
  SectionTitle,
  SliderField,
  StyledInput,
  StyledSelect,
  developedLambdaToDisplay,
  displayToDevelopedLambda,
  displayToFactorizedLambda,
  displayToHours,
  factorizedLambdaToDisplay,
  hoursToDisplay,
  parseNumericText,
} from './ComponentParamsPanel'

const HOURS_PER_YEAR = 8760

const TYPE_META: Record<SubsystemType, { color: string; label: string }> = {
  sensor: { color: '#0284C7', label: 'Capteur' },
  logic: { color: '#7C3AED', label: 'Logique' },
  actuator: { color: '#EA580C', label: 'Actionneur' },
}

const SUBCOMPONENT_SOURCE_OPTIONS = [
  { value: 'SIL-DB', label: 'Base SIL certifiée' },
  { value: 'OREDA', label: 'OREDA' },
  { value: 'EXIDA', label: 'exida' },
  { value: 'Manufacturer', label: 'Constructeur' },
  { value: 'Custom', label: 'Données propres' },
]

interface Props {
  component: SIFComponent
  subComponent: SubElement
  subsystemType: SubsystemType
  projectId: string
  sifId: string
  subsystemId: string
  channelId: string
  onClose: () => void
}

function synchronizeSubComponentParams(subComponent: NormalizedSubElement): NormalizedSubElement {
  if (subComponent.paramMode === 'factorized') {
    return {
      ...subComponent,
      developed: factorizedToDeveloped(subComponent.factorized),
    }
  }

  return {
    ...subComponent,
    factorized: developedToFactorized(subComponent.developed, subComponent.factorized),
  }
}

function LiveMetric({ label, value }: { label: string; value: string }) {
  const { BORDER, SHADOW_SOFT, SURFACE, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div
      className="min-w-0 rounded-lg px-2.5 py-2"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, boxShadow: SHADOW_SOFT }}
    >
      <p className="text-[8px] uppercase tracking-widest" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 truncate text-[11px] font-semibold" style={{ color: TEXT }}>{value}</p>
    </div>
  )
}

export function SubComponentParamsPanel({
  component,
  subComponent,
  subsystemType,
  projectId,
  sifId,
  subsystemId,
  channelId,
  onClose,
}: Props) {
  const { BORDER, PAGE_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const BG = PAGE_BG
  const BORDER2 = BORDER
  const updateComponent = useAppStore(s => s.updateComponent)
  const [local, setLocal] = useState<NormalizedSubElement>(() =>
    synchronizeSubComponentParams(normalizeSubComponent(component, subComponent)),
  )
  const [factorizedLambdaUnit, setFactorizedLambdaUnit] = useState<'FIT' | 'PER_HOUR'>('FIT')
  const [developedLambdaUnit, setDevelopedLambdaUnit] = useState<'FIT' | 'PER_HOUR'>('FIT')
  const [lambdaStarUnit, setLambdaStarUnit] = useState<'FIT' | 'PER_HOUR'>('PER_HOUR')
  const [lifetimeUnit, setLifetimeUnit] = useState<'hr' | 'yr'>('yr')

  useEffect(() => {
    const normalized = synchronizeSubComponentParams(normalizeSubComponent(component, subComponent))
    setLocal(normalized)
    setLambdaStarUnit('PER_HOUR')
    setLifetimeUnit(normalized.advanced.lifetime && normalized.advanced.lifetime < HOURS_PER_YEAR ? 'hr' : 'yr')
  }, [component, subComponent])

  const commit = (updater: (prev: NormalizedSubElement) => NormalizedSubElement) => {
    setLocal(prev => {
      const next = synchronizeSubComponentParams(updater(prev))
      updateComponent(projectId, sifId, subsystemId, channelId, {
        ...component,
        subComponents: (component.subComponents ?? []).map(item =>
          item.id === next.id ? next : item,
        ),
      })
      return next
    })
  }

  const upd = (patch: Partial<NormalizedSubElement>) => commit(prev => ({ ...prev, ...patch }))
  const updF = (patch: Partial<NormalizedSubElement['factorized']>) =>
    commit(prev => ({ ...prev, factorized: { ...prev.factorized, ...patch } }))
  const updD = (patch: Partial<NormalizedSubElement['developed']>) =>
    commit(prev => ({ ...prev, developed: { ...prev.developed, ...patch } }))
  const updT = (patch: Partial<NormalizedSubElement['test']>) =>
    commit(prev => ({ ...prev, test: { ...prev.test, ...patch } }))
  const updA = (patch: Partial<NormalizedSubElement['advanced']>) =>
    commit(prev => ({ ...prev, advanced: { ...prev.advanced, ...patch } }))

  const effective = local.paramMode === 'factorized'
    ? factorizedToDeveloped(local.factorized)
    : local.developed
  const sff = calcComponentSFF(effective)
  const dc = calcComponentDC(effective)
  const componentPFD = calcSubComponentPFDValue(component, local)
  const sffOk = sff >= 0.6
  const dcOk = dc >= 0.6

  const meta = TYPE_META[subsystemType]
  const partialTestActive = local.test.testType === 'partial' || local.advanced.partialTest.enabled
  const onlineDuringTest = local.test.testType === 'online'
  const headerTypeLabel = local.instrumentType || CAT_LABELS[local.instrumentCategory] || meta.label

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-3 py-3" style={{ borderColor: `${BORDER}A6` }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${meta.color}18`, boxShadow: SHADOW_SOFT, color: meta.color }}
            >
              <InstrumentationIcon
                subsystemType={subsystemType}
                instrumentCategory={local.instrumentCategory}
                instrumentType={local.instrumentType}
                size={13}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold tracking-[0.01em]" style={{ color: TEXT }}>{local.tagName}</p>
              <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
                Sous-composant de {component.tagName} · {headerTypeLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="prism-action shrink-0 rounded-md border p-1.5"
            style={{ color: TEXT_DIM, borderColor: BORDER }}
          >
            <X size={12} />
          </button>
        </div>

        <div className="grid gap-2">
          <LiveMetric label="PFD" value={formatPFD(componentPFD)} />
        </div>
      </div>

      <RightPanelBody compact className="space-y-3">
        <InspectorBlock title="Identification">
          <div className="space-y-3">
            <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_FORM_GRID }}>
              <FieldRow label="Tag">
                <StyledInput value={local.tagName} onChange={v => upd({ tagName: v })} placeholder="XV-101-SOV1" />
              </FieldRow>
              <FieldRow label="Label">
                <StyledInput value={local.label} onChange={v => upd({ label: v })} placeholder="Electrovanne 1" />
              </FieldRow>
              <FieldRow label="Catégorie">
                <StyledSelect
                  value={local.instrumentCategory}
                  onChange={v => upd({ instrumentCategory: v as InstrumentCategory })}
                  options={INSTRUMENT_CATEGORIES.map(item => ({ value: item, label: CAT_LABELS[item] }))}
                />
              </FieldRow>
              <FieldRow label="Type d'instrument">
                <StyledSelect
                  value={local.instrumentType}
                  onChange={v => upd({ instrumentType: v })}
                  options={(INSTRUMENT_TYPES[local.instrumentCategory] ?? INSTRUMENT_TYPES.other).map(item => ({ value: item, label: item }))}
                />
              </FieldRow>
              <FieldRow label="Fabricant">
                <StyledInput value={local.manufacturer} onChange={v => upd({ manufacturer: v })} placeholder="ASCO, Bürkert…" />
              </FieldRow>
              <FieldRow label="Source des données">
                <StyledSelect
                  value={local.dataSource}
                  onChange={v => upd({ dataSource: v })}
                  options={SUBCOMPONENT_SOURCE_OPTIONS}
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
                onChange={event => upd({ description: event.target.value })}
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
              {(['factorized', 'developed'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => upd({ paramMode: mode })}
                  className="prism-action flex-1 rounded-md py-1.5 text-[11px] font-bold transition-all"
                  style={local.paramMode === mode
                    ? { background: TEAL, color: '#FFF' }
                    : { color: TEXT_DIM }}
                >
                  {mode === 'factorized' ? 'Factorisé' : 'Développé'}
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
              {[
                { value: 'stopped', label: 'Arrêt unité', desc: "Testé lors d'un arrêt unité" },
                { value: 'online', label: 'En ligne', desc: 'Test complet en service' },
                { value: 'partial', label: 'PST (partiel)', desc: 'Course partielle (vanne)' },
                { value: 'none', label: 'Aucun test', desc: 'Pas de test de preuve' },
              ].map(testType => (
                <button key={testType.value} type="button"
                  onClick={() => updT({ testType: testType.value as NormalizedSubElement['test']['testType'] })}
                  className="prism-action flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-all"
                  style={local.test.testType === testType.value ? {
                    borderColor: TEAL, background: `${TEAL}12`, color: TEXT,
                  } : {
                    borderColor: BORDER2, background: BG, color: TEXT_DIM,
                  }}
                >
                  <div className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: local.test.testType === testType.value ? TEAL : BORDER2 }}>
                    {local.test.testType === testType.value && (
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold">{testType.label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: TEXT_DIM }}>{testType.desc}</p>
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
                    onChange={value => setLifetimeUnit(value as 'hr' | 'yr')}
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
    </div>
  )
}
