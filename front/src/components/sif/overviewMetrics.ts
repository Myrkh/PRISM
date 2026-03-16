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
      title: 'Documenter la procédure de proof test',
      hint: 'Aucune procédure n’est encore rattachée à cette SIF.',
      tab: 'exploitation',
    })
  } else if (!recentCampaigns.length) {
    pushAction(actions, {
      id: 'proof-evidence',
      title: 'Enregistrer une campagne de proof test',
      hint: 'Une procédure existe, mais aucune campagne exécutée n’est reliée comme preuve.',
      tab: 'exploitation',
    })
  } else if (isOverdue && nextDue) {
    pushAction(actions, {
      id: 'proof-overdue',
      title: 'La campagne de proof test est en retard',
      hint: `L’échéance prévue était le ${nextDue.toLocaleDateString()}.`,
      tab: 'exploitation',
    })
  }

  if (openFaults > 0 || bypassHours > 0) {
    pushAction(actions, {
      id: 'operational-exposure',
      title: 'Revoir l’exposition en exploitation',
      hint: `${openFaults} défaut${openFaults > 1 ? 's' : ''} ouvert${openFaults > 1 ? 's' : ''} et ${bypassHours.toFixed(1)} h de bypass / inhibit.`,
      tab: 'exploitation',
    })
  }

  if (!result.meetsTarget || compliance.technicalFindings.length > 0) {
    pushAction(actions, {
      id: 'technical-findings',
      title: 'Traiter les écarts techniques',
      hint: `${compliance.technicalFindings.length} écart${compliance.technicalFindings.length > 1 ? 's' : ''} de conformité demande${compliance.technicalFindings.length > 1 ? 'nt' : ''} une revue.`,
      tab: 'verification',
    })
  }

  if (pendingAssumptions > 0) {
    pushAction(actions, {
      id: 'assumptions',
      title: 'Revoir le registre d’hypothèses',
      hint: `${pendingAssumptions} hypothèse${pendingAssumptions > 1 ? 's' : ''} reste${pendingAssumptions > 1 ? 'nt' : ''} à valider.`,
      tab: 'verification',
    })
  }

  if (tracePct < 100) {
    pushAction(actions, {
      id: 'hazop-trace',
      title: 'Compléter la traçabilité HAZOP / LOPA',
      hint: `${traceCompletedCount}/${traceFieldCount} champs de traçabilité sont renseignés.`,
      tab: 'context',
    })
  }

  if (metadataPct < 100) {
    pushAction(actions, {
      id: 'context-fields',
      title: 'Compléter le socle de contexte',
      hint: `${metadataPct}% des métadonnées de base requises pour l’audit sont renseignées.`,
      tab: 'context',
    })
  }

  if (!actions.length) {
    actions.push({
      id: 'stable-overview',
      title: 'Cockpit stabilisé',
      hint: 'Calcul, exploitation et gouvernance semblent alignés.',
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
