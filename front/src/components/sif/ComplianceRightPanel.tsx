import { useEffect, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Lightbulb,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { RightPanelSection, RightPanelShell } from '@/components/layout/RightPanelShell'
import { normalizeSIFAssumptions } from '@/core/models/sifAssumptions'
import { getSifComplianceStrings } from '@/i18n/sifCompliance'
import { getSifVerificationStrings } from '@/i18n/sifVerification'
import { useLocaleStrings } from '@/i18n/useLocale'
import type {
  SIF,
  SIFAssumption,
  SIFAssumptionCategory,
  SIFAssumptionStatus,
  SIFCalcResult,
  SIFReferenceTab,
} from '@/core/types'
import type { SIFTab } from '@/store/types'
import type {
  AssumptionStatus,
  ComplianceEvidenceItem,
  ComplianceItemStatus,
  ComplianceResult,
  ComplianceTechnicalFinding,
} from './complianceCalc'
import {
  getComplianceOverallStatusKey,
  getCompliancePillLabel,
  localizeComplianceAction,
  localizeComplianceAssumption,
  localizeComplianceEvidence,
  localizeTechnicalFinding,
} from './complianceUi'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface Props {
  sif: SIF
  result: SIFCalcResult
  compliance: ComplianceResult
  selectedGapId: string | null
  selectedEvidenceId: string | null
  onSelectTab: (tab: SIFTab) => void
  onUpdateAssumptions: (assumptions: SIFAssumption[]) => Promise<void> | void
}

function SectionLabel({ children }: { children: ReactNode }) {
  const { TEAL } = usePrismTheme()
  return (
    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
      {children}
    </p>
  )
}

function StatusPill({
  status,
  label,
}: {
  status: ComplianceItemStatus | AssumptionStatus | SIFAssumptionStatus | 'ok' | 'review'
  label: string
}) {
  const { TEXT_DIM } = usePrismTheme()
  const tone =
    status === 'complete' || status === 'validated' || status === 'ok'
      ? { color: semantic.success, bg: `${semantic.success}12`, border: `${semantic.success}44` }
      : status === 'missing'
        ? { color: semantic.error, bg: `${semantic.error}12`, border: `${semantic.error}44` }
        : status === 'draft'
          ? { color: TEXT_DIM, bg: `${TEXT_DIM}14`, border: `${TEXT_DIM}44` }
          : { color: semantic.warning, bg: `${semantic.warning}12`, border: `${semantic.warning}44` }

  return (
    <span
      className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}
    >
      {label}
    </span>
  )
}

function InfoCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning'
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  const color =
    tone === 'success' ? semantic.success :
    tone === 'warning' ? semantic.warning :
    TEXT

  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: TEXT_DIM }}>{label}</p>
      <p className="mt-1 text-sm font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  const { TEXT_DIM } = usePrismTheme()
  return (
    <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
      {children}
    </label>
  )
}

function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { BORDER, PAGE_BG, TEXT } = usePrismTheme()
  return (
    <input
      {...props}
      className="prism-field w-full rounded-lg border px-3 py-2 text-sm outline-none"
      style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
    />
  )
}

function FieldTextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { BORDER, PAGE_BG, TEXT } = usePrismTheme()
  return (
    <textarea
      {...props}
      className="prism-field min-h-[76px] w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
      style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
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
  const { BORDER, PAGE_BG, TEXT } = usePrismTheme()
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="prism-field w-full rounded-lg border px-3 py-2 text-sm outline-none"
      style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function JumpButton({
  label,
  tab,
  onSelectTab,
}: {
  label: string
  tab: SIFTab
  onSelectTab: (tab: SIFTab) => void
}) {
  const { TEAL } = usePrismTheme()
  return (
    <button
      type="button"
      onClick={() => onSelectTab(tab)}
      className="prism-action inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
      style={{ borderColor: `${TEAL}55`, color: TEAL, background: `${TEAL}10` }}
    >
      {label}
      <ArrowRight size={12} />
    </button>
  )
}

function FindingRow({
  finding,
  selected,
  reviewLabel,
  currentExpected,
}: {
  finding: ComplianceTechnicalFinding
  selected: boolean
  reviewLabel: string
  currentExpected: string
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{
        borderColor: selected ? `${semantic.warning}55` : BORDER,
        background: selected ? `${semantic.warning}10` : PAGE_BG,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>{finding.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>{finding.subsystemLabel}</p>
        </div>
        <StatusPill status="review" label={reviewLabel} />
      </div>
      <p className="mt-2 text-[11px] font-mono" style={{ color: TEXT_DIM }}>
        {currentExpected}
      </p>
    </div>
  )
}

function EvidenceRow({
  item,
  selected,
  pillLabel,
}: {
  item: ComplianceEvidenceItem
  selected: boolean
  pillLabel: string
}) {
  const { BORDER, PAGE_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{
        borderColor: selected ? `${TEAL}55` : BORDER,
        background: selected ? `${TEAL}10` : PAGE_BG,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>{item.label}</p>
          <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>{item.summary}</p>
        </div>
        <StatusPill status={item.status} label={pillLabel} />
      </div>
    </div>
  )
}

function DerivedAssumptionRow({
  assumption,
  pillLabel,
}: {
  assumption: ComplianceResult['assumptions'][number]
  pillLabel: string
}) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>{assumption.label}</p>
          <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>{assumption.summary}</p>
        </div>
        <StatusPill status={assumption.status} label={pillLabel} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{assumption.detail}</p>
    </div>
  )
}

function createDraftAssumption(title: string): SIFAssumption {
  return {
    id: nanoid(),
    title,
    statement: '',
    rationale: '',
    status: 'draft',
    owner: '',
    reviewDate: '',
    category: 'other',
    linkedTab: 'compliance',
  }
}

export function ComplianceRightPanel({
  sif,
  result,
  compliance,
  selectedGapId,
  selectedEvidenceId,
  onSelectTab,
  onUpdateAssumptions,
}: Props) {
  const strings = useLocaleStrings(getSifVerificationStrings)
  const complianceStrings = useLocaleStrings(getSifComplianceStrings)
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const [assumptionDrafts, setAssumptionDrafts] = useState<SIFAssumption[]>(() => normalizeSIFAssumptions(sif.assumptions))
  const [assumptionsDirty, setAssumptionsDirty] = useState(false)
  const [assumptionsSaving, setAssumptionsSaving] = useState(false)
  const [assumptionsError, setAssumptionsError] = useState<string | null>(null)

  const assumptionStatusOptions: { value: SIFAssumptionStatus; label: string }[] = [
    { value: 'draft', label: strings.rightPanel.assumptions.statusOptions.draft },
    { value: 'review', label: strings.rightPanel.assumptions.statusOptions.review },
    { value: 'validated', label: strings.rightPanel.assumptions.statusOptions.validated },
  ]
  const assumptionCategoryOptions: { value: SIFAssumptionCategory; label: string }[] = [
    { value: 'process', label: strings.rightPanel.assumptions.categoryOptions.process },
    { value: 'proof', label: strings.rightPanel.assumptions.categoryOptions.proof },
    { value: 'architecture', label: strings.rightPanel.assumptions.categoryOptions.architecture },
    { value: 'data', label: strings.rightPanel.assumptions.categoryOptions.data },
    { value: 'governance', label: strings.rightPanel.assumptions.categoryOptions.governance },
    { value: 'other', label: strings.rightPanel.assumptions.categoryOptions.other },
  ]
  const assumptionTabOptions: { value: SIFReferenceTab; label: string }[] = [
    { value: 'overview', label: strings.rightPanel.assumptions.linkedTabOptions.cockpit },
    { value: 'architecture', label: strings.rightPanel.assumptions.linkedTabOptions.architecture },
    { value: 'analysis', label: strings.rightPanel.assumptions.linkedTabOptions.verification },
    { value: 'compliance', label: complianceStrings.panel.sections.summary },
    { value: 'prooftest', label: strings.rightPanel.assumptions.linkedTabOptions.exploitation },
    { value: 'report', label: strings.rightPanel.assumptions.linkedTabOptions.report },
  ]

  const localizedActions = compliance.actions.map(action => localizeComplianceAction(complianceStrings, action))
  const localizedFindings = compliance.technicalFindings.map(finding => localizeTechnicalFinding(complianceStrings, finding))
  const localizedEvidence = compliance.evidenceItems.map(item => localizeComplianceEvidence(complianceStrings, sif, result, compliance, item))
  const localizedDerivedAssumptions = compliance.assumptions.map(item => localizeComplianceAssumption(complianceStrings, sif, item))

  const selectedGap = localizedFindings.find(finding => finding.id === selectedGapId) ?? null
  const selectedEvidence = localizedEvidence.find(item => item.id === selectedEvidenceId) ?? null
  const registerReviews = assumptionDrafts.filter(item => item.status !== 'validated').length
  const derivedAssumptionReviews = localizedDerivedAssumptions.filter(item => item.status === 'review').length
  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)
  const statusKey = getComplianceOverallStatusKey(result, compliance)
  const statusLabel = complianceStrings.overallStatus[statusKey]

  useEffect(() => {
    setAssumptionDrafts(normalizeSIFAssumptions(sif.assumptions))
    setAssumptionsDirty(false)
    setAssumptionsError(null)
  }, [sif.assumptions])

  const updateAssumption = <K extends keyof SIFAssumption>(
    assumptionId: string,
    key: K,
    value: SIFAssumption[K],
  ) => {
    setAssumptionDrafts(prev =>
      prev.map(assumption =>
        assumption.id === assumptionId
          ? { ...assumption, [key]: value }
          : assumption,
      ),
    )
    setAssumptionsDirty(true)
    setAssumptionsError(null)
  }

  const addAssumption = () => {
    setAssumptionDrafts(prev => [...prev, createDraftAssumption(strings.rightPanel.assumptions.newAssumptionTitle)])
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
      setAssumptionsError(error instanceof Error ? error.message : strings.rightPanel.assumptions.saveFallback)
    } finally {
      setAssumptionsSaving(false)
    }
  }

  return (
    <RightPanelShell contentBg={PANEL_BG} persistKey="compliance">
      <RightPanelSection id="summary" label={complianceStrings.panel.sections.summary} Icon={ClipboardCheck}>
        <div className="space-y-3">
          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <SectionLabel>{complianceStrings.panel.summary.title}</SectionLabel>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{statusLabel}</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  {complianceStrings.panel.summary.description}
                </p>
              </div>
              <StatusPill
                status={statusKey === 'compliant' ? 'ok' : 'review'}
                label={statusKey === 'compliant' ? complianceStrings.statusPills.ok : complianceStrings.statusPills.review}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoCard label={complianceStrings.panel.summary.targetSil} value={`SIL ${sif.targetSIL}`} />
            <InfoCard label={complianceStrings.panel.summary.achieved} value={`SIL ${result.SIL}`} tone={result.meetsTarget ? 'success' : 'warning'} />
            <InfoCard label={complianceStrings.panel.summary.openGaps} value={String(openGaps)} tone={openGaps === 0 ? 'success' : 'warning'} />
            <InfoCard label={complianceStrings.panel.summary.register} value={complianceStrings.panel.summary.registerPending(registerReviews)} tone={registerReviews === 0 ? 'success' : 'warning'} />
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <SectionLabel>{complianceStrings.panel.summary.priorityActions}</SectionLabel>
            <div className="mt-2 space-y-2">
              {localizedActions.map(action => (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => onSelectTab(action.tab as SIFTab)}
                  className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                  style={{ borderColor: BORDER, background: CARD_BG }}
                >
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{action.title}</p>
                  <p className="mt-1 text-xs" style={{ color: TEXT_DIM }}>{action.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <SectionLabel>{complianceStrings.panel.summary.assumptionSignals}</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <InfoCard
                label={strings.rightPanel.assumptions.title}
                value={complianceStrings.panel.summary.explicitRegister(assumptionDrafts.length)}
                tone={registerReviews === 0 ? 'success' : 'warning'}
              />
              <InfoCard
                label={strings.rightPanel.assumptions.helper.derivedSignalsTitle}
                value={complianceStrings.panel.summary.derivedSignals(derivedAssumptionReviews)}
                tone={derivedAssumptionReviews === 0 ? 'success' : 'warning'}
              />
            </div>
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection id="gap" label={complianceStrings.panel.sections.gap} Icon={FileWarning}>
        <div className="space-y-3">
          {selectedGap ? (
            <div className="space-y-3">
              <FindingRow
                finding={selectedGap}
                selected
                reviewLabel={complianceStrings.statusPills.review}
                currentExpected={complianceStrings.panel.gap.currentExpected(selectedGap.value, selectedGap.expected)}
              />

              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionLabel>{complianceStrings.panel.gap.whyItMatters}</SectionLabel>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT }}>{selectedGap.detail}</p>
                <div className="mt-3 space-y-1 text-[11px] font-mono" style={{ color: TEXT_DIM }}>
                  <p>{complianceStrings.panel.gap.current}: {selectedGap.value}</p>
                  <p>{complianceStrings.panel.gap.expected}: {selectedGap.expected}</p>
                </div>
                <div className="mt-3">
                  <JumpButton label={complianceStrings.panel.gap.goToFix} tab={selectedGap.tab} onSelectTab={onSelectTab} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
              <SectionLabel>{complianceStrings.panel.gap.inspector}</SectionLabel>
              <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}>
                <AlertTriangle size={14} />
                {complianceStrings.panel.gap.inspectorHint}
              </div>
            </div>
          )}

          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <SectionLabel>{complianceStrings.panel.gap.openGaps}</SectionLabel>
            <div className="mt-2 space-y-2">
              {localizedFindings.length > 0 ? (
                localizedFindings.map(finding => (
                  <FindingRow
                    key={finding.id}
                    finding={finding}
                    selected={finding.id === selectedGapId}
                    reviewLabel={complianceStrings.statusPills.review}
                    currentExpected={complianceStrings.panel.gap.currentExpected(finding.value, finding.expected)}
                  />
                ))
              ) : (
                <div className="flex items-center gap-2 text-sm" style={{ color: semantic.success }}>
                  <CheckCircle2 size={14} />
                  {complianceStrings.panel.gap.noOpenGaps}
                </div>
              )}
            </div>
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection id="assumptions" label={complianceStrings.panel.sections.assumptions} Icon={Lightbulb}>
        <div className="space-y-3">
          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <div className="flex items-start justify-between gap-3">
              <SectionLabel>{strings.rightPanel.assumptions.title}</SectionLabel>
              <StatusPill
                status={registerReviews === 0 ? 'ok' : 'review'}
                label={registerReviews === 0 ? complianceStrings.statusPills.ok : complianceStrings.statusPills.review}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {strings.rightPanel.assumptions.hint}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <InfoCard label={strings.rightPanel.assumptions.metrics.items} value={String(assumptionDrafts.length)} />
              <InfoCard
                label={strings.rightPanel.assumptions.metrics.pendingReview}
                value={String(registerReviews)}
                tone={registerReviews === 0 ? 'success' : 'warning'}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addAssumption}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                style={{ borderColor: `${TEAL}55`, color: TEAL, background: `${TEAL}10` }}
              >
                <Plus size={12} />
                {strings.rightPanel.assumptions.actions.add}
              </button>
              <button
                type="button"
                onClick={resetAssumptions}
                disabled={!assumptionsDirty || assumptionsSaving}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
                style={{ borderColor: BORDER, color: TEXT_DIM, background: CARD_BG }}
              >
                <RotateCcw size={12} />
                {strings.rightPanel.assumptions.actions.reset}
              </button>
              <button
                type="button"
                onClick={saveAssumptions}
                disabled={!assumptionsDirty || assumptionsSaving}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
                style={{ borderColor: `${semantic.success}55`, color: semantic.success, background: `${semantic.success}10` }}
              >
                <Save size={12} />
                {assumptionsSaving ? strings.rightPanel.assumptions.actions.saving : strings.rightPanel.assumptions.actions.save}
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
                <div className="space-y-2">
                  <SectionLabel>{strings.rightPanel.assumptions.itemTitle}</SectionLabel>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>
                    {assumption.title || strings.rightPanel.assumptions.helper.untitled}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={assumption.status} label={getCompliancePillLabel(complianceStrings, assumption.status)} />
                    <button
                      type="button"
                      onClick={() => removeAssumption(assumption.id)}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors"
                      style={{ borderColor: `${semantic.error}44`, color: semantic.error, background: `${semantic.error}10` }}
                    >
                      <Trash2 size={12} />
                      {strings.rightPanel.assumptions.remove}
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel>{strings.rightPanel.assumptions.fields.title}</FieldLabel>
                      <FieldInput
                        value={assumption.title}
                        onChange={event => updateAssumption(assumption.id, 'title', event.target.value)}
                        placeholder={strings.rightPanel.assumptions.placeholders.title}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>{strings.rightPanel.assumptions.fields.status}</FieldLabel>
                      <FieldSelect
                        value={assumption.status}
                        onChange={value => updateAssumption(assumption.id, 'status', value as SIFAssumptionStatus)}
                        options={assumptionStatusOptions}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>{strings.rightPanel.assumptions.fields.statement}</FieldLabel>
                    <FieldTextArea
                      value={assumption.statement}
                      onChange={event => updateAssumption(assumption.id, 'statement', event.target.value)}
                      placeholder={strings.rightPanel.assumptions.placeholders.statement}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>{strings.rightPanel.assumptions.fields.rationale}</FieldLabel>
                    <FieldTextArea
                      value={assumption.rationale}
                      onChange={event => updateAssumption(assumption.id, 'rationale', event.target.value)}
                      placeholder={strings.rightPanel.assumptions.placeholders.rationale}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel>{strings.rightPanel.assumptions.fields.category}</FieldLabel>
                      <FieldSelect
                        value={assumption.category}
                        onChange={value => updateAssumption(assumption.id, 'category', value as SIFAssumptionCategory)}
                        options={assumptionCategoryOptions}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>{strings.rightPanel.assumptions.fields.linkedTab}</FieldLabel>
                      <FieldSelect
                        value={assumption.linkedTab}
                        onChange={value => updateAssumption(assumption.id, 'linkedTab', value as SIFReferenceTab)}
                        options={assumptionTabOptions}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <FieldLabel>{strings.rightPanel.assumptions.fields.owner}</FieldLabel>
                      <FieldInput
                        value={assumption.owner}
                        onChange={event => updateAssumption(assumption.id, 'owner', event.target.value)}
                        placeholder={strings.rightPanel.assumptions.placeholders.owner}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>{strings.rightPanel.assumptions.fields.reviewDate}</FieldLabel>
                      <FieldInput
                        type="date"
                        value={assumption.reviewDate}
                        onChange={event => updateAssumption(assumption.id, 'reviewDate', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG }}>
                    <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                      {strings.rightPanel.assumptions.helper.linkHint}
                    </p>
                    <div className="mt-2">
                      <JumpButton label={strings.rightPanel.assumptions.helper.openLinkedTab} tab={assumption.linkedTab as SIFTab} onSelectTab={onSelectTab} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {assumptionDrafts.length === 0 && (
              <div className="rounded-xl border p-3 text-sm" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}>
                {strings.rightPanel.assumptions.empty}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <SectionLabel>{strings.rightPanel.assumptions.helper.derivedSignalsTitle}</SectionLabel>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
              {strings.rightPanel.assumptions.helper.derivedSignalsDescription}
            </p>
          </div>

          <div className="space-y-2">
            {localizedDerivedAssumptions.map(assumption => (
              <div key={assumption.id}>
                <DerivedAssumptionRow
                  assumption={assumption}
                  pillLabel={getCompliancePillLabel(complianceStrings, assumption.status)}
                />
                <div className="mt-2">
                  <JumpButton label={strings.rightPanel.assumptions.helper.openSourceTab} tab={assumption.tab} onSelectTab={onSelectTab} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection id="evidence" label={complianceStrings.panel.sections.evidence} Icon={ShieldCheck}>
        <div className="space-y-3">
          {selectedEvidence ? (
            <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
              <SectionLabel>{complianceStrings.panel.evidence.selectedEvidence}</SectionLabel>
              <div className="mt-2">
                <EvidenceRow
                  item={selectedEvidence}
                  selected
                  pillLabel={getCompliancePillLabel(complianceStrings, selectedEvidence.status)}
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: TEXT }}>{selectedEvidence.detail}</p>
              <div className="mt-3">
                <JumpButton label={complianceStrings.panel.evidence.openSourceTab} tab={selectedEvidence.tab} onSelectTab={onSelectTab} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
              <SectionLabel>{complianceStrings.panel.evidence.inspector}</SectionLabel>
              <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}>
                <ShieldCheck size={14} />
                {complianceStrings.panel.evidence.inspectorHint}
              </div>
            </div>
          )}

          <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <SectionLabel>{complianceStrings.panel.evidence.statusTitle}</SectionLabel>
            <div className="mt-2 space-y-2">
              {localizedEvidence.map(item => (
                <div key={item.id}>
                  <EvidenceRow
                    item={item}
                    selected={item.id === selectedEvidenceId}
                    pillLabel={getCompliancePillLabel(complianceStrings, item.status)}
                  />
                  <div className="mt-2">
                    <JumpButton label={complianceStrings.panel.evidence.openSourceTab} tab={item.tab} onSelectTab={onSelectTab} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </RightPanelSection>
    </RightPanelShell>
  )
}
