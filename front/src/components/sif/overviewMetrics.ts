import type { SIF, SIFCalcResult, TestCampaign } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { ComplianceResult } from './complianceCalc'

export type OperationalHealth = 'healthy' | 'watch' | 'critical' | 'unknown'

export interface OverviewAction {
  id: string
  title: string
  hint: string
  tab: SIFTab
}

export interface OverviewMetrics {
  recentCampaigns: TestCampaign[]
  lastCampaign: TestCampaign | null
  nextDue: Date | null
  isOverdue: boolean
  bypassHours: number
  openFaults: number
  failCount: number
  conditionalCount: number
  operationalScore: number
  operationalHealth: OperationalHealth
  tracePct: number
  traceCompletedCount: number
  traceFieldCount: number
  metadataPct: number
  evidenceCompleteCount: number
  evidenceTotalCount: number
  reviewedAssumptions: number
  pendingAssumptions: number
  approvalFilledCount: number
  actions: OverviewAction[]
}

const pushAction = (actions: OverviewAction[], action: OverviewAction) => {
  if (actions.some(existing => existing.id === action.id)) return
  actions.push(action)
}

export function getOverviewMetrics(
  sif: SIF,
  result: SIFCalcResult,
  compliance: ComplianceResult,
): OverviewMetrics {
  const recentCampaigns = [...(sif.testCampaigns ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const lastCampaign = recentCampaigns[0] ?? null
  const periodicityMs = (sif.proofTestProcedure?.periodicityMonths ?? 12) * 30.44 * 24 * 3_600_000
  const nextDue = lastCampaign ? new Date(new Date(lastCampaign.date).getTime() + periodicityMs) : null
  const isOverdue = nextDue ? nextDue.getTime() < Date.now() : false

  const events = sif.operationalEvents ?? []
  const bypassHours = events
    .filter(event => event.type === 'bypass' || event.type === 'inhibit' || event.type === 'override')
    .reduce((acc, event) => acc + (event.duration ?? 0), 0)
  const openFaults = events.filter(event => event.type === 'fault_detected' && !event.resolvedDate).length
  const failCount = recentCampaigns.filter(campaign => campaign.verdict === 'fail').length
  const conditionalCount = recentCampaigns.filter(campaign => campaign.verdict === 'conditional').length

  const operationalScore = Math.max(0, Math.min(100,
    100
    - (isOverdue ? 30 : 0)
    - failCount * 20
    - conditionalCount * 8
    - Math.min(20, openFaults * 10)
    - Math.min(15, Math.round(bypassHours / 8)),
  ))

  const operationalHealth: OperationalHealth = recentCampaigns.length === 0 && events.length === 0
    ? 'unknown'
    : operationalScore >= 85
      ? 'healthy'
      : operationalScore >= 65
        ? 'watch'
        : 'critical'

  const traceFields = [
    sif.hazopTrace?.hazopNode,
    sif.hazopTrace?.scenarioId,
    sif.hazopTrace?.lopaRef,
    sif.hazopTrace?.initiatingEvent,
    sif.hazopTrace?.iplList,
    sif.hazopTrace?.hazopFacilitator,
  ]
  const traceFieldCount = traceFields.length
  const traceCompletedCount = traceFields.filter(Boolean).length
  const tracePct = Math.round((traceCompletedCount / traceFieldCount) * 100)

  const metadataPct = Math.round(compliance.metadataCompletion * 100)
  const evidenceCompleteCount = compliance.evidenceItems.filter(item => item.status === 'complete').length
  const evidenceTotalCount = compliance.evidenceItems.length
  const reviewedAssumptions = compliance.assumptions.filter(item => item.status === 'validated').length
  const pendingAssumptions = compliance.assumptions.filter(item => item.status === 'review').length
  const approvalFilledCount = [sif.madeBy, sif.verifiedBy, sif.approvedBy].filter(Boolean).length

  const actions: OverviewAction[] = []

  if (!sif.proofTestProcedure) {
    pushAction(actions, {
      id: 'proof-procedure',
      title: 'Document the proof test procedure',
      hint: 'No procedure is attached to this SIF yet.',
      tab: 'prooftest',
    })
  } else if (!recentCampaigns.length) {
    pushAction(actions, {
      id: 'proof-evidence',
      title: 'Record a proof test campaign',
      hint: 'A procedure exists, but no executed campaign is linked as evidence.',
      tab: 'prooftest',
    })
  } else if (isOverdue && nextDue) {
    pushAction(actions, {
      id: 'proof-overdue',
      title: 'Proof test campaign is overdue',
      hint: `Next due date was ${nextDue.toLocaleDateString()}.`,
      tab: 'prooftest',
    })
  }

  if (openFaults > 0 || bypassHours > 0) {
    pushAction(actions, {
      id: 'operational-exposure',
      title: 'Review operational exposure',
      hint: `${openFaults} open fault${openFaults > 1 ? 's' : ''} and ${bypassHours.toFixed(1)} h of bypass / inhibit exposure.`,
      tab: 'prooftest',
    })
  }

  if (!result.meetsTarget || compliance.technicalFindings.length > 0) {
    pushAction(actions, {
      id: 'technical-findings',
      title: 'Resolve technical findings',
      hint: `${compliance.technicalFindings.length} compliance finding${compliance.technicalFindings.length > 1 ? 's' : ''} need review.`,
      tab: 'compliance',
    })
  }

  if (pendingAssumptions > 0) {
    pushAction(actions, {
      id: 'assumptions',
      title: 'Review the assumption register',
      hint: `${pendingAssumptions} assumption${pendingAssumptions > 1 ? 's' : ''} still require validation.`,
      tab: 'compliance',
    })
  }

  if (tracePct < 100) {
    pushAction(actions, {
      id: 'hazop-trace',
      title: 'Complete HAZOP / LOPA traceability',
      hint: `${traceCompletedCount}/${traceFieldCount} traceability fields are currently filled.`,
      tab: 'overview',
    })
  }

  if (metadataPct < 100) {
    pushAction(actions, {
      id: 'context-fields',
      title: 'Complete core context fields',
      hint: `${metadataPct}% of the overview metadata required for audit readiness is filled.`,
      tab: 'overview',
    })
  }

  if (!actions.length) {
    actions.push({
      id: 'stable-overview',
      title: 'Overview is in a stable state',
      hint: 'The current design, operations, and governance signals look aligned.',
      tab: 'report',
    })
  }

  return {
    recentCampaigns,
    lastCampaign,
    nextDue,
    isOverdue,
    bypassHours,
    openFaults,
    failCount,
    conditionalCount,
    operationalScore,
    operationalHealth,
    tracePct,
    traceCompletedCount,
    traceFieldCount,
    metadataPct,
    evidenceCompleteCount,
    evidenceTotalCount,
    reviewedAssumptions,
    pendingAssumptions,
    approvalFilledCount,
    actions,
  }
}
