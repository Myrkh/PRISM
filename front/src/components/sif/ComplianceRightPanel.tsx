import { useEffect, useMemo, useState, type ElementType, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
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
import {
  RightPanelShell,
} from '@/components/layout/RightPanelShell'
import { normalizeSIFAssumptions } from '@/core/models/sifAssumptions'
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
import { useAppStore } from '@/store/appStore'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'

type PanelTab = 'summary' | 'gap' | 'assumptions' | 'evidence'

const PANEL_TABS: { id: PanelTab; label: string; Icon: ElementType }[] = [
  { id: 'summary', label: 'Summary', Icon: ClipboardCheck },
  { id: 'gap', label: 'Gap', Icon: FileWarning },
  { id: 'assumptions', label: 'Assumptions', Icon: Lightbulb },
  { id: 'evidence', label: 'Evidence', Icon: ShieldCheck },
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
  { value: 'overview', label: 'Overview' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'analysis', label: 'Calculation' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'prooftest', label: 'Proof Test' },
  { value: 'report', label: 'Report' },
]

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
}: {
  status: ComplianceItemStatus | AssumptionStatus | SIFAssumptionStatus | 'ok' | 'review'
}) {
  const { TEXT_DIM } = usePrismTheme()
  const tone =
    status === 'complete' || status === 'validated' || status === 'ok'
      ? { color: semantic.success, bg: `${semantic.success}12`, border: `${semantic.success}44`, label: 'OK' }
      : status === 'missing'
        ? { color: semantic.error, bg: `${semantic.error}12`, border: `${semantic.error}44`, label: 'Missing' }
        : status === 'draft'
          ? { color: TEXT_DIM, bg: `${TEXT_DIM}14`, border: `${TEXT_DIM}44`, label: 'Draft' }
          : { color: semantic.warning, bg: `${semantic.warning}12`, border: `${semantic.warning}44`, label: 'Review' }

  return (
    <span
      className="rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}
    >
      {tone.label}
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
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
      style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
    />
  )
}

function FieldTextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { BORDER, PAGE_BG, TEXT } = usePrismTheme()
  return (
    <textarea
      {...props}
      className="min-h-[76px] w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors resize-y"
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
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
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
      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
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
}: {
  finding: ComplianceTechnicalFinding
  selected: boolean
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
        <StatusPill status="review" />
      </div>
      <p className="mt-2 text-[11px] font-mono" style={{ color: TEXT_DIM }}>
        Current {finding.value} · Expected {finding.expected}
      </p>
    </div>
  )
}

function EvidenceRow({
  item,
  selected,
}: {
  item: ComplianceEvidenceItem
  selected: boolean
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
        <StatusPill status={item.status} />
      </div>
    </div>
  )
}

function DerivedAssumptionRow({ assumption }: { assumption: ComplianceResult['assumptions'][number] }) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM } = usePrismTheme()
  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>{assumption.label}</p>
          <p className="mt-0.5 text-xs" style={{ color: TEXT_DIM }}>{assumption.summary}</p>
        </div>
        <StatusPill status={assumption.status} />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{assumption.detail}</p>
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
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const [activeTab, setActiveTab] = useState<PanelTab>('summary')
  const selectedRightPanelTab = useAppStore(s => s.rightPanelTabs.compliance)
  const setRightPanelTab = useAppStore(s => s.setRightPanelTab)
  const [assumptionDrafts, setAssumptionDrafts] = useState<SIFAssumption[]>(() => normalizeSIFAssumptions(sif.assumptions))
  const [assumptionsDirty, setAssumptionsDirty] = useState(false)
  const [assumptionsSaving, setAssumptionsSaving] = useState(false)
  const [assumptionsError, setAssumptionsError] = useState<string | null>(null)

  const selectedGap = compliance.technicalFindings.find(finding => finding.id === selectedGapId) ?? null
  const selectedEvidence = compliance.evidenceItems.find(item => item.id === selectedEvidenceId) ?? null
  const registerReviews = assumptionDrafts.filter(item => item.status !== 'validated').length
  const derivedAssumptionReviews = compliance.assumptions.filter(item => item.status === 'review').length
  const openGaps = Math.max(0, compliance.totalChecks - compliance.passedChecks)
  const statusLabel =
    !result.meetsTarget ? 'Non-compliant' :
    openGaps > 0 || compliance.missingMetadata.length > 0 ? 'Review' :
    'Compliant'

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

  useEffect(() => {
    if (selectedGapId) {
      setActiveTab('gap')
      setRightPanelTab('compliance', 'gap')
    }
  }, [selectedGapId, setRightPanelTab])

  useEffect(() => {
    if (selectedEvidenceId) {
      setActiveTab('evidence')
      setRightPanelTab('compliance', 'evidence')
    }
  }, [selectedEvidenceId, setRightPanelTab])

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
        setRightPanelTab('compliance', nextTab)
      }}
      contentBg={PANEL_BG}
    >
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarGutter: 'stable' }}>
        <div className="space-y-3">
          {activeTab === 'summary' && (
            <>
              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionLabel>Compliance Summary</SectionLabel>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{statusLabel}</p>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                      This panel explains why the SIF is compliant, under review, or non-compliant on the current rule set.
                    </p>
                  </div>
                  <StatusPill status={statusLabel === 'Compliant' ? 'ok' : 'review'} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <InfoCard label="Target SIL" value={`SIL ${sif.targetSIL}`} />
                <InfoCard label="Achieved" value={`SIL ${result.SIL}`} tone={result.meetsTarget ? 'success' : 'warning'} />
                <InfoCard label="Open gaps" value={String(openGaps)} tone={openGaps === 0 ? 'success' : 'warning'} />
                <InfoCard label="Register" value={`${registerReviews} pending`} tone={registerReviews === 0 ? 'success' : 'warning'} />
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionLabel>Priority Actions</SectionLabel>
                <div className="mt-2 space-y-2">
                  {compliance.actions.map(action => (
                    <button
                      key={action.title}
                      type="button"
                      onClick={() => onSelectTab(action.tab)}
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
                <SectionLabel>Assumption Signals</SectionLabel>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <InfoCard
                    label="Explicit register"
                    value={`${assumptionDrafts.length} item${assumptionDrafts.length > 1 ? 's' : ''}`}
                    tone={registerReviews === 0 ? 'success' : 'warning'}
                  />
                  <InfoCard
                    label="Derived signals"
                    value={`${derivedAssumptionReviews} review`}
                    tone={derivedAssumptionReviews === 0 ? 'success' : 'warning'}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'gap' && (
            <>
              {selectedGap ? (
                <div className="space-y-3">
                  <FindingRow finding={selectedGap} selected />

                  <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                    <SectionLabel>Why It Matters</SectionLabel>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT }}>{selectedGap.detail}</p>
                    <div className="mt-3 space-y-1 text-[11px] font-mono" style={{ color: TEXT_DIM }}>
                      <p>Current: {selectedGap.value}</p>
                      <p>Expected: {selectedGap.expected}</p>
                    </div>
                    <div className="mt-3">
                      <JumpButton label="Go to fix location" tab={selectedGap.tab} onSelectTab={onSelectTab} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <SectionLabel>Gap Inspector</SectionLabel>
                  <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}>
                    <AlertTriangle size={14} />
                    Select a gap from the Compliance center view to inspect it here.
                  </div>
                </div>
              )}

              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionLabel>Open Gaps</SectionLabel>
                <div className="mt-2 space-y-2">
                  {compliance.technicalFindings.length > 0 ? (
                    compliance.technicalFindings.map(finding => (
                      <FindingRow key={finding.id} finding={finding} selected={finding.id === selectedGapId} />
                    ))
                  ) : (
                    <div className="flex items-center gap-2 text-sm" style={{ color: semantic.success }}>
                      <CheckCircle2 size={14} />
                      No technical gap is currently open on this rule set.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'assumptions' && (
            <>
              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <div className="flex items-start justify-between gap-3">
                  <SectionLabel>Assumption Register</SectionLabel>
                  <StatusPill status={registerReviews === 0 ? 'ok' : 'review'} />
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  This is the explicit SIF assumption register used for proof and governance. Keep it short, defensible, and auditable.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <InfoCard label="Register items" value={String(assumptionDrafts.length)} />
                  <InfoCard
                    label="Pending review"
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
                    Reset draft
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
                    <div className="space-y-2">
                      <SectionLabel>Register Item</SectionLabel>
                      <p className="text-sm font-semibold" style={{ color: TEXT }}>
                        {assumption.title || 'Untitled assumption'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={assumption.status} />
                        <button
                          type="button"
                          onClick={() => removeAssumption(assumption.id)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors"
                          style={{ borderColor: `${semantic.error}44`, color: semantic.error, background: `${semantic.error}10` }}
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <FieldLabel>Title</FieldLabel>
                          <FieldInput
                            value={assumption.title}
                            onChange={event => updateAssumption(assumption.id, 'title', event.target.value)}
                            placeholder="Assumption title"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>Status</FieldLabel>
                          <FieldSelect
                            value={assumption.status}
                            onChange={value => updateAssumption(assumption.id, 'status', value as SIFAssumptionStatus)}
                            options={ASSUMPTION_STATUS_OPTIONS}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <FieldLabel>Statement</FieldLabel>
                        <FieldTextArea
                          value={assumption.statement}
                          onChange={event => updateAssumption(assumption.id, 'statement', event.target.value)}
                          placeholder="State the assumption explicitly."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <FieldLabel>Rationale</FieldLabel>
                        <FieldTextArea
                          value={assumption.rationale}
                          onChange={event => updateAssumption(assumption.id, 'rationale', event.target.value)}
                          placeholder="Why is this assumption defensible?"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <FieldLabel>Category</FieldLabel>
                          <FieldSelect
                            value={assumption.category}
                            onChange={value => updateAssumption(assumption.id, 'category', value as SIFAssumptionCategory)}
                            options={ASSUMPTION_CATEGORY_OPTIONS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>Linked Tab</FieldLabel>
                          <FieldSelect
                            value={assumption.linkedTab}
                            onChange={value => updateAssumption(assumption.id, 'linkedTab', value as SIFReferenceTab)}
                            options={ASSUMPTION_TAB_OPTIONS}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <FieldLabel>Owner</FieldLabel>
                          <FieldInput
                            value={assumption.owner}
                            onChange={event => updateAssumption(assumption.id, 'owner', event.target.value)}
                            placeholder="Owner / reviewer"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>Review Date</FieldLabel>
                          <FieldInput
                            type="date"
                            value={assumption.reviewDate}
                            onChange={event => updateAssumption(assumption.id, 'reviewDate', event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border px-3 py-2" style={{ borderColor: BORDER, background: CARD_BG }}>
                        <p className="text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                          Link this assumption to the most relevant SIF workspace so reviewers can jump to the source context.
                        </p>
                        <div className="mt-2">
                          <JumpButton label="Open linked tab" tab={assumption.linkedTab} onSelectTab={onSelectTab} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {assumptionDrafts.length === 0 && (
                  <div className="rounded-xl border p-3 text-sm" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}>
                    No explicit assumption has been documented for this SIF yet.
                  </div>
                )}
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionLabel>Derived Signals</SectionLabel>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_DIM }}>
                  These items are inferred from the current record and calculation setup. They help reviewers challenge the explicit register, but they do not replace it.
                </p>
              </div>

              <div className="space-y-2">
                {compliance.assumptions.map(assumption => (
                  <div key={assumption.id}>
                    <DerivedAssumptionRow assumption={assumption} />
                    <div className="mt-2">
                      <JumpButton label="Open source tab" tab={assumption.tab} onSelectTab={onSelectTab} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'evidence' && (
            <>
              {selectedEvidence ? (
                <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <SectionLabel>Selected Evidence</SectionLabel>
                  <div className="mt-2">
                    <EvidenceRow item={selectedEvidence} selected />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: TEXT }}>{selectedEvidence.detail}</p>
                  <div className="mt-3">
                    <JumpButton label="Open source tab" tab={selectedEvidence.tab} onSelectTab={onSelectTab} />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                  <SectionLabel>Evidence Inspector</SectionLabel>
                  <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}>
                    <ShieldCheck size={14} />
                    Select an evidence item from the center view to inspect it here.
                  </div>
                </div>
              )}

              <div className="rounded-xl border p-3" style={{ borderColor: BORDER, background: PAGE_BG }}>
                <SectionLabel>Evidence Status</SectionLabel>
                <div className="mt-2 space-y-2">
                  {compliance.evidenceItems.map(item => (
                    <div key={item.id}>
                      <EvidenceRow item={item} selected={item.id === selectedEvidenceId} />
                      <div className="mt-2">
                        <JumpButton label="Open source tab" tab={item.tab} onSelectTab={onSelectTab} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </RightPanelShell>
  )
}
