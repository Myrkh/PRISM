/**
 * sif/complianceCalc.ts — PRISM
 *
 * Pure computation of compliance checks for a SIF.
 * Extracted from SIFDashboard for reuse and testability.
 */
import type { SIF, SIFCalcResult, SILLevel } from '@/core/types'
import type { SIFTab } from '@/store/types'
import { formatPct } from '@/core/math/pfdCalc'

export interface ComplianceSubsystemCheck {
  id: string
  label: string
  type: string
  sil: SILLevel
  checks: { label: string; value: string; ok: boolean }[]
  allOk: boolean
}

export interface ComplianceResult {
  subsystemChecks: ComplianceSubsystemCheck[]
  score: number
  passedChecks: number
  totalChecks: number
  metadataCompletion: number
  actions: { title: string; hint: string; tab: SIFTab }[]
}

export function computeCompliance(sif: SIF, result: SIFCalcResult): ComplianceResult {
  const subsystemChecks = result.subsystems.map((sub, i) => {
    const subsystem = sif.subsystems[i]
    const sffReq = sub.HFT === 0 ? 0.6 : 0.9

    const checks = [
      { label: `SFF ≥ ${formatPct(sffReq)}`, value: formatPct(sub.SFF), ok: sub.SFF >= sffReq },
      { label: `HFT ≥ ${sub.SIL >= 2 ? 1 : 0}`, value: String(sub.HFT), ok: sub.HFT >= (sub.SIL >= 2 ? 1 : 0) },
      { label: 'DC ≥ 60 %', value: formatPct(sub.DC), ok: sub.DC >= 0.6 },
      { label: 'Architecture', value: subsystem?.architecture ?? '—', ok: true },
    ]

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
    sif.pid, sif.location, sif.processTag, sif.hazardousEvent,
    sif.madeBy, sif.verifiedBy, sif.approvedBy,
  ]
  const metadataCompletion = metadataFields.filter(Boolean).length / metadataFields.length

  const targetScore = result.meetsTarget ? 1 : 0
  const score = Math.round((targetScore * 45 + subsystemPassRate * 40 + metadataCompletion * 15) * 100) / 100

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
      tab: 'analysis',
    })
  }

  if (metadataCompletion < 1) {
    actions.push({
      title: 'Complete traceability fields',
      hint: 'Fill P&ID, hazard description, and approver fields for audit readiness.',
      tab: 'overview',
    })
  }

  if (!actions.length) {
    actions.push({
      title: 'Compliance baseline looks solid',
      hint: 'Proceed with independent review and export a report package.',
      tab: 'compliance',
    })
  }

  return {
    subsystemChecks,
    score,
    passedChecks,
    totalChecks,
    metadataCompletion,
    actions: actions.slice(0, 3),
  }
}
