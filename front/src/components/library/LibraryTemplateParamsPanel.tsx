import { useEffect, useState, type ElementType } from 'react'
import {
  Activity,
  ClipboardList,
  Cpu,
  FlaskConical,
  Save,
  Settings2,
  Tag,
  X,
  Zap,
} from 'lucide-react'
import { DEFAULT_COMPONENT } from '@/core/models/defaults'
import { hydrateComponentSnapshot } from '@/core/models/hydrate'
import {
  calcComponentDC,
  calcComponentPFDValue,
  calcComponentSFF,
  developedToFactorized,
  factorizedToDeveloped,
  formatPFD,
  formatPct,
  getEffectiveDeveloped,
} from '@/core/math/pfdCalc'
import type {
  ComponentTemplate,
  ComponentTemplateUpsertInput,
  DeterminedCharacter,
  InstrumentCategory,
  ParamMode,
  SIFComponent,
  SubsystemType,
  TestType,
} from '@/core/types'
import {
  CheckboxField,
  ComputedRow,
  DETERMINED_CHARACTER_OPTIONS,
  DEVELOPED_LAMBDA_UNITS,
  developedLambdaToDisplay,
  displayToDevelopedLambda,
  displayToFactorizedLambda,
  displayToHours,
  FACTORIZED_LAMBDA_UNITS,
  factorizedLambdaToDisplay,
  FieldRow,
  hoursToDisplay,
  PANEL_FORM_GRID,
  PANEL_WIDE_GRID,
  parseNumericText,
  ScientificInput,
  SectionTitle,
  SliderField,
  StyledInput,
  StyledSelect,
} from '@/components/architecture/ComponentParamsPanel'
import { CAT_LABELS, INSTRUMENT_CATEGORIES, INSTRUMENT_TYPES } from '@/components/architecture/componentCatalog'
import { InstrumentationIcon } from '@/components/architecture/InstrumentationIcons'
import { RightPanelSection, RightPanelShell } from '@/components/layout/RightPanelShell'
import { useAppStore } from '@/store/appStore'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import type { LibraryOriginBadge } from './LibraryTemplateCard'

type FactorizedLambdaUnit = 'FIT' | 'PER_HOUR'
type DevelopedLambdaUnit = 'FIT' | 'PER_HOUR'
type TimeDisplayUnit = 'hr' | 'yr'
type TemplateEditorMode = 'create' | 'edit' | 'clone'

const TYPE_META: Record<SubsystemType, { color: string; label: string; Icon: ElementType }> = {
  sensor: { color: '#0284C7', label: 'Capteur', Icon: Activity },
  logic: { color: '#7C3AED', label: 'Logique', Icon: Cpu },
  actuator: { color: '#EA580C', label: 'Actionneur', Icon: Zap },
}

const TEST_TYPES: { value: TestType; label: string; desc: string }[] = [
  { value: 'stopped', label: 'Arrêt unité', desc: 'Testé lors d\'un arrêt unité' },
  { value: 'online', label: 'En ligne', desc: 'Test complet en service' },
  { value: 'partial', label: 'PST (partiel)', desc: 'Course partielle (vanne)' },
  { value: 'none', label: 'Aucun test', desc: 'Pas de test de preuve' },
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

const DEFAULT_TAG_BY_SUBSYSTEM: Record<SubsystemType, string> = {
  sensor: 'LIB-S-001',
  logic: 'LIB-L-001',
  actuator: 'LIB-A-001',
}

function tagsToInput(tags: string[]) {
  return tags.join(', ')
}

function inputToTags(raw: string) {
  return raw
    .split(',')
    .map(tag => tag.trim())
    .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index)
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

function buildInitialComponent(subsystemType: SubsystemType, template?: ComponentTemplate | null) {
  if (!template) {
    return DEFAULT_COMPONENT(subsystemType, DEFAULT_TAG_BY_SUBSYSTEM[subsystemType])
  }

  return hydrateComponentSnapshot(
    template.componentSnapshot,
    subsystemType,
    template.componentSnapshot.tagName || DEFAULT_TAG_BY_SUBSYSTEM[subsystemType],
  )
}

function LibraryLiveMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
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

export function LibraryTemplateParamsPanel({
  mode,
  template,
  origin,
  subsystemType,
  defaultProjectId,
  defaultLibraryName,
  onSaved,
  onClose,
}: {
  mode: TemplateEditorMode
  template?: ComponentTemplate | null
  origin?: LibraryOriginBadge
  subsystemType: SubsystemType
  defaultProjectId: string | null
  defaultLibraryName: string | null
  onSaved: (template: ComponentTemplate) => void
  onClose: () => void
}) {
  const { BORDER, CARD_BG, PAGE_BG, SHADOW_SOFT, TEAL, TEAL_DIM, TEXT, TEXT_DIM } = usePrismTheme()
  const BG = PAGE_BG
  const BORDER2 = BORDER
  const projects = useAppStore(state => state.projects)
  const saveComponentTemplate = useAppStore(state => state.saveComponentTemplate)
  const setSyncError = useAppStore(state => state.setSyncError)

  const [local, setLocal] = useState<SIFComponent>(() => synchronizeComponentParams(buildInitialComponent(subsystemType, template)))
  const [factorizedLambdaUnit, setFactorizedLambdaUnit] = useState<FactorizedLambdaUnit>('FIT')
  const [developedLambdaUnit, setDevelopedLambdaUnit] = useState<DevelopedLambdaUnit>('FIT')
  const [lambdaStarUnit, setLambdaStarUnit] = useState<DevelopedLambdaUnit>('PER_HOUR')
  const [lifetimeUnit, setLifetimeUnit] = useState<TimeDisplayUnit>('yr')
  const [templateScope, setTemplateScope] = useState<ComponentTemplateUpsertInput['scope']>(
    template?.scope === 'project' ? 'project' : defaultProjectId ? 'project' : 'user',
  )
  const [templateProjectId, setTemplateProjectId] = useState<string | null>(template?.projectId ?? defaultProjectId ?? null)
  const [templateName, setTemplateName] = useState(template?.name ?? template?.componentSnapshot.instrumentType ?? '')
  const [templateDescription, setTemplateDescription] = useState(template?.description ?? template?.componentSnapshot.description ?? '')
  const [templateTags, setTemplateTags] = useState(tagsToInput(template?.tags ?? []))
  const [templateLibraryName, setTemplateLibraryName] = useState(template?.libraryName ?? defaultLibraryName ?? '')
  const [templateSourceReference, setTemplateSourceReference] = useState(template?.sourceReference ?? '')
  const [templateReviewStatus, setTemplateReviewStatus] = useState<NonNullable<ComponentTemplateUpsertInput['reviewStatus']>>(
    template?.reviewStatus === 'approved' || template?.reviewStatus === 'review' ? template.reviewStatus : 'draft',
  )
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)

  useEffect(() => {
    const nextComponent = synchronizeComponentParams(buildInitialComponent(subsystemType, template))
    setLocal(nextComponent)
    setFactorizedLambdaUnit('FIT')
    setDevelopedLambdaUnit('FIT')
    setLambdaStarUnit('PER_HOUR')
    setLifetimeUnit(nextComponent.advanced.lifetime && nextComponent.advanced.lifetime < 8760 ? 'hr' : 'yr')
    setTemplateScope(template?.scope === 'project' ? 'project' : defaultProjectId ? 'project' : 'user')
    setTemplateProjectId(template?.projectId ?? defaultProjectId ?? null)
    setTemplateName(template?.name ?? (nextComponent.instrumentType || nextComponent.tagName))
    setTemplateDescription(template?.description ?? nextComponent.description)
    setTemplateTags(tagsToInput(template?.tags ?? [
      nextComponent.subsystemType,
      nextComponent.instrumentCategory,
      nextComponent.manufacturer,
    ].filter(Boolean)))
    setTemplateLibraryName(template?.libraryName ?? defaultLibraryName ?? '')
    setTemplateSourceReference(template?.sourceReference ?? '')
    setTemplateReviewStatus(
      template?.reviewStatus === 'approved' || template?.reviewStatus === 'review'
        ? template.reviewStatus
        : 'draft',
    )
    setSaveBusy(false)
    setSaveError(null)
    setSaveNotice(null)
  }, [defaultLibraryName, defaultProjectId, subsystemType, template, mode])

  useEffect(() => {
    if (templateScope === 'project' && projects.length === 0) {
      setTemplateScope('user')
      setTemplateProjectId(null)
    }
  }, [projects.length, templateScope])

  const commit = (updater: (prev: SIFComponent) => SIFComponent) => {
    setLocal(prev => synchronizeComponentParams(updater(prev)))
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

  const effective = getEffectiveDeveloped(local)
  const sff = calcComponentSFF(effective)
  const dc = calcComponentDC(effective)
  const componentPFD = calcComponentPFDValue(local)
  const sffOk = sff >= 0.6
  const dcOk = dc >= 0.6

  const meta = TYPE_META[subsystemType]
  const partialTestActive = local.test.testType === 'partial' || local.advanced.partialTest.enabled
  const onlineDuringTest = local.test.testType === 'online'
  const headerTypeLabel = local.instrumentType || CAT_LABELS[local.instrumentCategory] || meta.label
  const modeLabel = mode === 'edit'
    ? 'Édition template'
    : mode === 'clone'
      ? 'Duplication standard'
      : 'Nouveau template'
  const saveLabel = mode === 'edit' ? 'Enregistrer' : mode === 'clone' ? 'Créer copie' : 'Créer template'
  const selectedProjectName = templateProjectId
    ? projects.find(project => project.id === templateProjectId)?.name ?? null
    : null
  const sourceOrigin = origin ?? (template?.scope === 'project' ? 'project' : 'user')

  const submitSave = async () => {
    const trimmedName = templateName.trim()
    if (!trimmedName) {
      setSaveError('Le nom du template est requis.')
      return
    }
    if (templateScope === 'project' && !templateProjectId) {
      setSaveError('Sélectionnez un projet pour enregistrer ce template dans une bibliothèque projet.')
      return
    }

    setSaveBusy(true)
    setSaveError(null)
    setSyncError(null)

    try {
      const saved = await saveComponentTemplate({
        id: mode === 'edit' ? template?.id : undefined,
        scope: templateScope,
        projectId: templateScope === 'project' ? templateProjectId : null,
        name: trimmedName,
        description: templateDescription.trim(),
        libraryName: templateLibraryName.trim() || null,
        sourceReference: templateSourceReference.trim() || null,
        tags: inputToTags(templateTags),
        reviewStatus: templateReviewStatus,
        componentSnapshot: local,
      })
      setSaveNotice(mode === 'edit'
        ? 'Template mis à jour.'
        : `Template enregistré dans ${templateScope === 'project' ? 'Project' : 'My Library'}${saved.libraryName ? ` · ${saved.libraryName}` : ''}.`)
      onSaved(saved)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setSaveError(message)
      setSyncError(message)
    } finally {
      setSaveBusy(false)
    }
  }

  return (
    <RightPanelShell>
      {/* ── Pinned header — always visible ── */}
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
                <p className="truncate text-[11px] font-bold tracking-[0.01em]" style={{ color: TEXT }}>
                  {local.tagName}
                </p>
                <p className="truncate text-[9px]" style={{ color: TEXT_DIM }}>
                  {modeLabel} · {headerTypeLabel}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void submitSave()}
                disabled={saveBusy}
                className="prism-action inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: `${meta.color}45`, background: `${meta.color}12`, color: meta.color }}
              >
                <Save size={11} />
                {saveBusy ? 'Enregistrement…' : saveLabel}
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
            <div
              className="mb-3 rounded-md border px-2.5 py-2 text-[10px]"
              style={{ background: `${TEAL}08`, borderColor: `${TEAL}25`, color: TEAL_DIM }}
            >
              {saveNotice}
            </div>
          )}

          {saveError && (
            <div
              className="mb-3 rounded-md border px-2.5 py-2 text-[10px]"
              style={{ background: `${semantic.error}12`, borderColor: `${semantic.error}28`, color: semantic.error }}
            >
              {saveError}
            </div>
          )}

          <div className="grid gap-2">
            <LibraryLiveMetric label="PFD" value={formatPFD(componentPFD)} />
          </div>
      </div>

      {/* ── Template metadata ── */}
      <RightPanelSection id="template" label="Template" Icon={Tag}>
        <div className="space-y-3">
          {mode === 'clone' && (
                <div
                  className="rounded-lg border px-3 py-2 text-[11px] leading-relaxed"
                  style={{ borderColor: `${meta.color}28`, background: `${meta.color}08`, color: TEXT_DIM }}
                >
                  Ce standard validé reste en lecture seule dans le catalogue maître. Enregistrer crée une copie dans votre bibliothèque personnelle ou projet.
                </div>
              )}

              <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_FORM_GRID }}>
                <FieldRow label="Nom du template">
                  <StyledInput value={templateName} onChange={setTemplateName} placeholder="Pressure transmitter — Rosemount 3051S" />
                </FieldRow>
                <FieldRow label="Scope">
                  <StyledSelect
                    value={templateScope}
                    onChange={value => setTemplateScope(value as ComponentTemplateUpsertInput['scope'])}
                    options={TEMPLATE_SCOPE_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
                  />
                </FieldRow>
                <FieldRow label="Projet cible">
                  {templateScope === 'project' ? (
                    <StyledSelect
                      value={templateProjectId ?? ''}
                      onChange={value => setTemplateProjectId(value || null)}
                      options={[
                        { value: '', label: projects.length > 0 ? 'Sélectionner un projet' : 'Aucun projet disponible' },
                        ...projects.map(project => ({ value: project.id, label: project.name })),
                      ]}
                    />
                  ) : (
                    <StyledInput value={selectedProjectName ?? 'Bibliothèque personnelle'} onChange={() => {}} />
                  )}
                </FieldRow>
                <FieldRow label="Bibliothèque nommée">
                  <StyledInput value={templateLibraryName} onChange={setTemplateLibraryName} placeholder="Ex. Client TotalEnergies / Tank farm" />
                </FieldRow>
                <FieldRow label="Review status">
                  <StyledSelect
                    value={templateReviewStatus}
                    onChange={value => setTemplateReviewStatus(value as NonNullable<ComponentTemplateUpsertInput['reviewStatus']>)}
                    options={TEMPLATE_REVIEW_OPTIONS}
                  />
                </FieldRow>
                <FieldRow label="Référence source">
                  <StyledInput value={templateSourceReference} onChange={setTemplateSourceReference} placeholder="FMEDA ref, certificat, note interne…" />
                </FieldRow>
                <FieldRow label="Origine">
                  <StyledInput
                    value={sourceOrigin === 'builtin' ? 'Standard validé' : sourceOrigin === 'project' ? 'Template projet' : 'Bibliothèque personnelle'}
                    onChange={() => {}}
                  />
                </FieldRow>
              </div>

              <FieldRow label="Tags">
                <StyledInput value={templateTags} onChange={setTemplateTags} placeholder="pressure, transmitter, rosemount, SIL2" />
              </FieldRow>

              <FieldRow label="Description bibliothèque">
                <textarea
                  value={templateDescription}
                  onChange={event => setTemplateDescription(event.target.value)}
                  rows={3}
                  className="prism-field w-full resize-none rounded-md border px-2 py-1.5 text-xs outline-none"
                  style={{ background: BG, borderColor: BORDER2, color: TEXT }}
                  placeholder="Contexte d'usage, hypothèses, source de validation…"
                />
              </FieldRow>
        </div>
      </RightPanelSection>

      <RightPanelSection id="identification" label="Identification" Icon={Tag}>
        <div className="space-y-3">
                <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_FORM_GRID }}>
                  <FieldRow label="Tag">
                    <StyledInput value={local.tagName} onChange={v => upd({ tagName: v })} placeholder="PT-001" />
                  </FieldRow>
                  <FieldRow label="Catégorie">
                    <StyledSelect
                      value={local.instrumentCategory}
                      onChange={v => upd({ instrumentCategory: v as InstrumentCategory })}
                      options={INSTRUMENT_CATEGORIES.map(category => ({ value: category, label: CAT_LABELS[category] }))}
                    />
                  </FieldRow>
                  <FieldRow label="Type d'instrument">
                    <StyledSelect
                      value={local.instrumentType}
                      onChange={v => upd({ instrumentType: v })}
                      options={(INSTRUMENT_TYPES[local.instrumentCategory] ?? ['Other']).map(type => ({ value: type, label: type }))}
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

                <FieldRow label="Description composant">
                  <textarea
                    value={local.description}
                    onChange={event => upd({ description: event.target.value })}
                    rows={3}
                    className="prism-field w-full resize-none rounded-md border px-2 py-1.5 text-xs outline-none"
                    style={{ background: BG, borderColor: BORDER2, color: TEXT }}
                    placeholder="Description technique optionnelle…"
                  />
                </FieldRow>
        </div>
      </RightPanelSection>

      <RightPanelSection id="parameters" label="Paramètres" Icon={FlaskConical}>
        <div className="space-y-3">
                <div className="flex gap-1 rounded-lg p-0.5" style={{ background: BG }}>
                  {(['factorized', 'developed'] as ParamMode[]).map(nextMode => (
                    <button
                      key={nextMode}
                      type="button"
                      onClick={() => upd({ paramMode: nextMode })}
                      className="prism-action flex-1 rounded-md py-1.5 text-[11px] font-bold transition-all"
                      style={local.paramMode === nextMode
                        ? { background: TEAL, color: '#FFF' }
                        : { color: TEXT_DIM }}
                    >
                      {nextMode === 'factorized' ? 'Factorisé' : 'Développé'}
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
                      <p className="mt-1 text-[10px]" style={{ color: TEXT_DIM }}>
                        {factorizedLambdaUnit === 'FIT'
                          ? 'Saisie libre en FIT. Exemple equivalent: 1500 FIT = 1.50E-6 h^-1.'
                          : 'Saisie libre en h^-1 absolu. Exemple: 1.50E-6 h^-1 = 1500 FIT.'}
                      </p>
                    </div>
                    <SliderField
                      label="λD/λ ratio"
                      value={local.factorized.lambdaDRatio}
                      min={0}
                      max={1}
                      step={0.01}
                      format={v => formatPct(v)}
                      onChange={value => updF({ lambdaDRatio: value })}
                      color={meta.color}
                    />
                    <SectionTitle>Couverture diagnostic</SectionTitle>
                    <SliderField
                      label="DCd — Dangerous"
                      value={local.factorized.DCd}
                      min={0}
                      max={1}
                      step={0.01}
                      format={formatPct}
                      onChange={value => updF({ DCd: value })}
                    />
                    <SliderField
                      label="DCs — Safe"
                      value={local.factorized.DCs}
                      min={0}
                      max={1}
                      step={0.01}
                      format={formatPct}
                      onChange={value => updF({ DCs: value })}
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
                        { key: 'lambda_DU', label: 'λDU' },
                        { key: 'lambda_DD', label: 'λDD' },
                        { key: 'lambda_SU', label: 'λSU' },
                        { key: 'lambda_SD', label: 'λSD' },
                      ].map(({ key, label }) => (
                        <FieldRow key={key} label={`${label} [${developedLambdaUnit === 'FIT' ? 'FIT' : 'h^-1'}]`}>
                          <ScientificInput
                            value={developedLambdaToDisplay(local.developed[key as keyof typeof local.developed] as number, developedLambdaUnit)}
                            onCommit={value => updD({ [key]: displayToDevelopedLambda(value, developedLambdaUnit) })}
                            placeholder={developedLambdaUnit === 'FIT' ? 'Ex. 1.13E2' : 'Ex. 1.13E-7'}
                          />
                        </FieldRow>
                      ))}
                    </div>
                    <p className="-mt-1 text-[10px]" style={{ color: TEXT_DIM }}>
                      Saisie libre, avec ou sans notation scientifique.
                    </p>
                  </>
                )}

                <SectionTitle>Métriques calculées</SectionTitle>
                <ComputedRow label="SFF" value={formatPct(sff)} ok={sffOk} />
                <ComputedRow label="DC eff" value={formatPct(dc)} ok={dcOk} />
        </div>
      </RightPanelSection>

      <RightPanelSection id="test" label="Test" Icon={ClipboardList}>
        <div className="space-y-3">
                <SectionTitle>Intervalle de test de preuve</SectionTitle>
                <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_WIDE_GRID }}>
                  <FieldRow label="T1">
                    <div className="flex gap-2">
                      <StyledInput
                        type="number"
                        step="0.1"
                        value={local.test.T1}
                        onChange={value => updT({ T1: parseFloat(value) || 1 })}
                      />
                      <div className="w-24 shrink-0">
                        <StyledSelect
                          value={local.test.T1Unit}
                          onChange={value => updT({ T1Unit: value as 'hr' | 'yr' })}
                          options={[{ value: 'yr', label: 'années' }, { value: 'hr', label: 'heures' }]}
                        />
                      </div>
                    </div>
                  </FieldRow>

                  <FieldRow label="T0 — Premier test">
                    <div className="flex gap-2">
                      <StyledInput
                        type="number"
                        step="0.1"
                        value={local.test.T0}
                        onChange={value => updT({ T0: parseFloat(value) || 0 })}
                      />
                      <div className="w-24 shrink-0">
                        <StyledSelect
                          value={local.test.T0Unit}
                          onChange={value => updT({ T0Unit: value as 'hr' | 'yr' })}
                          options={[{ value: 'yr', label: 'années' }, { value: 'hr', label: 'heures' }]}
                        />
                      </div>
                    </div>
                  </FieldRow>
                </div>

                <SectionTitle>Type de test</SectionTitle>
                <div className="space-y-1.5">
                  {TEST_TYPES.map(testType => (
                    <button
                      key={testType.value}
                      type="button"
                      onClick={() => updT({ testType: testType.value })}
                      className="prism-action flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-all"
                      style={local.test.testType === testType.value
                        ? { borderColor: TEAL, background: `${TEAL}12`, color: TEXT }
                        : { borderColor: BORDER2, background: BG, color: TEXT_DIM }}
                    >
                      <div
                        className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2"
                        style={{ borderColor: local.test.testType === testType.value ? TEAL : BORDER2 }}
                      >
                        {local.test.testType === testType.value && (
                          <div className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} />
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold">{testType.label}</p>
                        <p className="mt-0.5 text-[9px]" style={{ color: TEXT_DIM }}>{testType.desc}</p>
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
      </RightPanelSection>

      <RightPanelSection id="advanced" label="Avancé" Icon={Settings2}>
        <div className="space-y-3">
                <SectionTitle>Réparation</SectionTitle>
                <div className="grid gap-3" style={{ gridTemplateColumns: PANEL_WIDE_GRID }}>
                  <FieldRow label="MTTR [heures]">
                    <StyledInput
                      type="number"
                      step="1"
                      value={local.advanced.MTTR}
                      onChange={value => updA({ MTTR: parseFloat(value) || 0 })}
                    />
                  </FieldRow>
                  <FieldRow label="Durée test (π) [heures]">
                    <StyledInput
                      type="number"
                      step="0.1"
                      value={local.advanced.testDuration}
                      onChange={value => updA({ testDuration: parseFloat(value) || 0 })}
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
                  label="γ — Défaillance due au test"
                  value={local.advanced.gamma}
                  min={0}
                  max={0.2}
                  step={0.005}
                  format={formatPct}
                  onChange={value => updA({ gamma: value })}
                />
                <SliderField
                  label="ω₁ — Erreur de remise en état"
                  value={local.advanced.omega1}
                  min={0}
                  max={1}
                  step={0.005}
                  format={formatPct}
                  onChange={value => updA({ omega1: value })}
                />
                <SliderField
                  label="ω₂ — Erreur de réparation"
                  value={local.advanced.omega2}
                  min={0}
                  max={1}
                  step={0.005}
                  format={formatPct}
                  onChange={value => updA({ omega2: value })}
                />

                <SectionTitle>Couverture test de preuve</SectionTitle>
                <SliderField
                  label="Couverture (%)"
                  value={local.advanced.proofTestCoverage}
                  min={0}
                  max={1}
                  step={0.01}
                  format={formatPct}
                  onChange={value => updA({ proofTestCoverage: value })}
                  color={meta.color}
                />
                <SliderField
                  label="DC alarmed only"
                  value={local.advanced.DCalarmedOnly}
                  min={0}
                  max={1}
                  step={0.01}
                  format={formatPct}
                  onChange={value => updA({ DCalarmedOnly: value })}
                />

                <SectionTitle>Durée de vie</SectionTitle>
                <FieldRow label="Durée de vie composant">
                  <div className="flex gap-2">
                    <StyledInput
                      value={hoursToDisplay(local.advanced.lifetime, lifetimeUnit)}
                      onChange={value => {
                        const parsed = parseNumericText(value)
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
                    type="number"
                    step="0.1"
                    value={local.advanced.sigma}
                    onChange={value => updA({ sigma: parseFloat(value) || 1 })}
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
                    <div className="space-y-3 rounded-lg border p-3" style={{ borderColor: `${TEAL}35`, background: `${TEAL}08` }}>
                      <FieldRow label="Durée (π) [heures]">
                        <StyledInput
                          type="number"
                          step="0.1"
                          value={local.advanced.partialTest.duration}
                          onChange={value => updA({ partialTest: { ...local.advanced.partialTest, duration: parseFloat(value) || 0 } })}
                        />
                      </FieldRow>
                      <SliderField
                        label="Couverture PST"
                        value={local.advanced.partialTest.detectedFaultsPct}
                        min={0}
                        max={1}
                        step={0.01}
                        format={formatPct}
                        onChange={value => updA({ partialTest: { ...local.advanced.partialTest, detectedFaultsPct: value } })}
                        color={TEAL}
                      />
                      <FieldRow label="Nb de tests / période">
                        <StyledInput
                          type="number"
                          step="1"
                          value={local.advanced.partialTest.numberOfTests}
                          onChange={value => updA({ partialTest: { ...local.advanced.partialTest, numberOfTests: parseInt(value) || 1 } })}
                        />
                      </FieldRow>
                    </div>
                  )}
                </div>
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}
