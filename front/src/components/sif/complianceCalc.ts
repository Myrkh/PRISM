/**
 * sif/complianceCalc.ts — PRISM
 *
 * Pure computation of compliance checks for a SIF.
 * Extracted from SIFDashboard for reuse and testability.
 */
import type { SIF, SIFCalcResult, SILLevel } from '@/core/types'
import type { SIFTab } from '@/store/types'
import { formatPct } from '@/core/math/pfdCalc'

export type ComplianceItemStatus = 'complete' | 'review' | 'missing'
export type AssumptionStatus = 'validated' | 'review'

export interface ComplianceSubsystemCheck {
  id: string
  label: string
  type: string
  sil: SILLevel
  checks: { label: string; value: string; ok: boolean }[]
  allOk: boolean
}

export interface ComplianceTechnicalFinding {
  id: string
  subsystemId: string
  subsystemLabel: string
  title: string
  value: string
  expected: string
  detail: string
  tab: SIFTab
}

export interface ComplianceEvidenceItem {
  id: string
  label: string
  status: ComplianceItemStatus
  summary: string
  detail: string
  tab: SIFTab
}

export interface ComplianceAssumptionItem {
  id: string
  label: string
  status: AssumptionStatus
  summary: string
  detail: string
  tab: SIFTab
}

export interface ComplianceResult {
  subsystemChecks: ComplianceSubsystemCheck[]
  score: number
  passedChecks: number
  totalChecks: number
  metadataCompletion: number
  missingMetadata: string[]
  technicalFindings: ComplianceTechnicalFinding[]
  evidenceItems: ComplianceEvidenceItem[]
  assumptions: ComplianceAssumptionItem[]
  actions: { title: string; hint: string; tab: SIFTab }[]
}

export function computeCompliance(sif: SIF, result: SIFCalcResult): ComplianceResult {
  const technicalFindings: ComplianceResult['technicalFindings'] = []

  const subsystemChecks = result.subsystems.map((sub, i) => {
    const subsystem = sif.subsystems[i]
    const sffReq = sub.HFT === 0 ? 0.6 : 0.9

    const checks = [
      { label: `SFF ≥ ${formatPct(sffReq)}`, value: formatPct(sub.SFF), ok: sub.SFF >= sffReq },
      { label: `HFT ≥ ${sub.SIL >= 2 ? 1 : 0}`, value: String(sub.HFT), ok: sub.HFT >= (sub.SIL >= 2 ? 1 : 0) },
      { label: 'DC ≥ 60 %', value: formatPct(sub.DC), ok: sub.DC >= 0.6 },
      { label: 'Architecture', value: subsystem?.architecture ?? '—', ok: true },
    ]

    for (const check of checks.filter(check => !check.ok)) {
      const isHFT = check.label.startsWith('HFT')
      const isSFF = check.label.startsWith('SFF')
      technicalFindings.push({
        id: `${sub.subsystemId}-${check.label}`,
        subsystemId: sub.subsystemId,
        subsystemLabel: subsystem?.label ?? 'Subsystem',
        title: check.label,
        value: check.value,
        expected: check.label,
        detail: isHFT
          ? 'The subsystem hardware fault tolerance is below the current architectural rule.'
          : isSFF
            ? 'Safe Failure Fraction is below the threshold required by the current architectural route.'
            : 'Diagnostic coverage is below the minimum currently enforced by the compliance rule set.',
        tab: isHFT || check.label === 'Architecture' ? 'architecture' : 'verification',
      })
    }

    return {
      id: sub.subsystemId,
      label: subsystem?.label ?? 'Subsystem',
      type: sub.type,
      sil: sub.SIL,
      checks,
      allOk: checks.every(c => c.ok),
    }
  })

  const totalChecks = subsystemChecks.reduce((acc, sub) => acc + sub.checks.length, 0)
  const passedChecks = subsystemChecks.reduce((acc, sub) => acc + sub.checks.filter(c => c.ok).length, 0)
  const subsystemPassRate = totalChecks ? passedChecks / totalChecks : 0

  const metadataFields = [
    { label: 'P&ID', value: sif.pid },
    { label: 'Location', value: sif.location },
    { label: 'Process tag', value: sif.processTag },
    { label: 'Hazardous event', value: sif.hazardousEvent },
    { label: 'Made by', value: sif.madeBy },
    { label: 'Verified by', value: sif.verifiedBy },
    { label: 'Approved by', value: sif.approvedBy },
  ]
  const metadataCompletion = metadataFields.filter(field => Boolean(field.value)).length / metadataFields.length
  const missingMetadata = metadataFields
    .filter(field => !field.value)
    .map(field => field.label)

  const allComponents = sif.subsystems.flatMap(subsystem =>
    subsystem.channels.flatMap(channel =>
      channel.components.map(component => ({ subsystem, component })),
    ),
  )

  const redundantSubsystems = sif.subsystems.filter(subsystem => subsystem.channels.length > 1)
  const componentsWithProofInterval = allComponents.filter(({ component }) => component.test.T1 > 0).length
  const componentsWithDataSource = allComponents.filter(({ component }) => component.dataSource.trim().length > 0).length
  const redundantWithCCFConfigured = redundantSubsystems.filter(subsystem => subsystem.ccf.beta > 0 || subsystem.ccf.betaD > 0).length

  const targetScore = result.meetsTarget ? 1 : 0
  const score = Math.round((targetScore * 45 + subsystemPassRate * 40 + metadataCompletion * 15) * 100) / 100

  const hasHazopTrace = Boolean(sif.hazopTrace?.scenarioId || sif.hazopTrace?.hazopNode)
  const hasProofProcedure = Boolean(sif.proofTestProcedure)
  const proofProcedureHasSteps = Boolean((sif.proofTestProcedure?.steps?.length ?? 0) > 0)
  const proofProcedureApproved = sif.proofTestProcedure?.status === 'approved'
  const hasCampaigns = sif.testCampaigns.length > 0
  const hasApprovalChain = Boolean(sif.madeBy && sif.verifiedBy && sif.approvedBy)
  const hasAnyApproval = Boolean(sif.madeBy || sif.verifiedBy || sif.approvedBy)

  const evidenceItems: ComplianceEvidenceItem[] = [
    {
      id: 'hazop-link',
      label: 'HAZOP / LOPA link',
      status: hasHazopTrace ? 'complete' : 'missing',
      summary: hasHazopTrace
        ? `${sif.hazopTrace?.scenarioId || sif.hazopTrace?.hazopNode}`
        : 'No scenario linked to this SIF.',
      detail: hasHazopTrace
        ? 'This SIF is linked to a HAZOP / LOPA traceable scenario.'
        : 'Compliance readiness is reduced because the initiating scenario is not linked to the SIF record.',
      tab: 'context',
    },
    {
      id: 'proof-procedure',
      label: 'Proof test procedure',
      status: !hasProofProcedure
        ? 'missing'
        : proofProcedureHasSteps && proofProcedureApproved
          ? 'complete'
          : 'review',
      summary: !hasProofProcedure
        ? 'No procedure documented.'
        : `${sif.proofTestProcedure?.ref || 'Procedure'} · ${sif.proofTestProcedure?.status || 'draft'}`,
      detail: !hasProofProcedure
        ? 'No proof test procedure is attached to this SIF.'
        : proofProcedureHasSteps
          ? 'A procedure exists, but it still needs execution or approval review.'
          : 'A procedure record exists, but the step set is incomplete.',
      tab: 'exploitation',
    },
    {
      id: 'proof-evidence',
      label: 'Proof test evidence',
      status: hasCampaigns ? 'complete' : hasProofProcedure ? 'review' : 'missing',
      summary: hasCampaigns
        ? `${sif.testCampaigns.length} recorded campaign${sif.testCampaigns.length > 1 ? 's' : ''}`
        : 'No recorded proof test campaign.',
      detail: hasCampaigns
        ? 'Execution evidence exists for this SIF.'
        : 'The proof strategy may exist, but no executed campaign is currently linked as evidence.',
      tab: 'exploitation',
    },
    {
      id: 'approval-chain',
      label: 'Approval chain',
      status: hasApprovalChain ? 'complete' : hasAnyApproval ? 'review' : 'missing',
      summary: hasApprovalChain
        ? 'Made / Verified / Approved complete.'
        : hasAnyApproval
          ? 'Approval chain partially filled.'
          : 'No accountable sign-off fields filled.',
      detail: hasApprovalChain
        ? 'Governance ownership is fully documented.'
        : 'Named accountability is incomplete, which weakens governance readiness.',
      tab: 'context',
    },
    {
      id: 'report-package',
      label: 'Report package readiness',
      status: result.meetsTarget && metadataCompletion === 1 && hasProofProcedure ? 'complete' : 'review',
      summary: result.meetsTarget && metadataCompletion === 1 && hasProofProcedure
        ? 'Core inputs for the report package are present.'
        : 'Some inputs still need review before final issue.',
      detail: 'This is a compact governance check for whether the report workspace is likely to produce a defensible package.',
      tab: 'report',
    },
  ]

  const assumptions: ComplianceAssumptionItem[] = [
    {
      id: 'low-demand-mode',
      label: 'Low demand mode applicability',
      status: sif.demandRate > 0 && sif.demandRate <= 1 ? 'validated' : 'review',
      summary: sif.demandRate > 0
        ? `${sif.demandRate.toExponential(2)} yr⁻¹ demand rate`
        : 'No demand rate documented.',
      detail: sif.demandRate > 0 && sif.demandRate <= 1
        ? 'The documented demand rate remains in a range usually compatible with low-demand reasoning.'
        : 'The current demand rate should be reviewed against the low-demand assumption used by the present compliance view.',
      tab: 'context',
    },
    {
      id: 'proof-test-effectiveness',
      label: 'Proof test effectiveness is assumed',
      status: hasProofProcedure && proofProcedureHasSteps && componentsWithProofInterval === allComponents.length
        ? 'validated'
        : 'review',
      summary: `${componentsWithProofInterval}/${allComponents.length || 0} components define a proof interval`,
      detail: hasProofProcedure
        ? 'The current model assumes the entered proof test intervals are achievable and effective in operation.'
        : 'Intervals exist in the component model, but no formal procedure currently governs their execution.',
      tab: 'exploitation',
    },
    {
      id: 'ccf-modelling',
      label: 'CCF treatment for redundant subsystems',
      status: redundantSubsystems.length === 0 || redundantWithCCFConfigured === redundantSubsystems.length
        ? 'validated'
        : 'review',
      summary: redundantSubsystems.length === 0
        ? 'No redundant subsystem requires CCF justification.'
        : `${redundantWithCCFConfigured}/${redundantSubsystems.length} redundant subsystem(s) with beta configured`,
      detail: redundantSubsystems.length === 0
        ? 'The current architecture has no redundant channel set requiring beta justification.'
        : 'Redundant architectures should document beta / betaD assumptions to avoid implicit independence claims.',
      tab: 'architecture',
    },
    {
      id: 'failure-data-provenance',
      label: 'Failure data provenance',
      status: componentsWithDataSource === allComponents.length ? 'validated' : 'review',
      summary: `${componentsWithDataSource}/${allComponents.length || 0} components reference a data source`,
      detail: componentsWithDataSource === allComponents.length
        ? 'Every component currently references a data source field.'
        : 'Some component failure data has no explicit provenance recorded, which should be justified before formal issue.',
      tab: 'architecture',
    },
  ]

  const actions: { title: string; hint: string; tab: SIFTab }[] = []

  if (!result.meetsTarget) {
    actions.push({
      title: 'Increase architectural robustness',
      hint: 'Adjust MooN architecture, diagnostics, and proof test interval to reach target SIL.',
      tab: 'architecture',
    })
  }

  if (subsystemChecks.some(sub => sub.checks.some(check => check.label.startsWith('DC') && !check.ok))) {
    actions.push({
      title: 'Improve diagnostic coverage',
      hint: 'Review DC assumptions and improve test strategy in component parameters.',
      tab: 'verification',
    })
  }

  if (metadataCompletion < 1) {
    actions.push({
      title: 'Complete traceability fields',
      hint: 'Fill P&ID, hazard description, and approver fields for audit readiness.',
      tab: 'context',
    })
  }

  if (sif.assumptions.some(assumption => assumption.status !== 'validated')) {
    actions.push({
      title: 'Review the assumption register',
      hint: 'Validate or justify the explicit SIF assumptions before formal issue.',
      tab: 'verification',
    })
  }

  if (!actions.length) {
    actions.push({
      title: 'Compliance baseline looks solid',
      hint: 'Proceed with independent review and export a report package.',
      tab: 'verification',
    })
  }

  return {
    subsystemChecks,
    score,
    passedChecks,
    totalChecks,
    metadataCompletion,
    missingMetadata,
    technicalFindings,
    evidenceItems,
    assumptions,
    actions: actions.slice(0, 3),
  }
}
