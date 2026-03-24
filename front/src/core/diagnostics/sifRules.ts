/**
 * core/diagnostics/sifRules.ts — PRISM SIF validation rules
 *
 * Pure functions: (SIF, calc?) → DiagnosticItem[]
 * Each rule checks one concern and returns 0–N diagnostics.
 * Rules are grouped by IEC 61511 lifecycle phase.
 */
import type { SIF } from '@/core/types'
import type { SIFCalcResult } from '@/core/types/calc.types'
import type { SILLevel } from '@/core/types/sil.types'
import type { DiagnosticItem } from './types'

// IEC 61511 PFD upper bounds per SIL level (PFDavg < limit → meets SIL)
const SIL_PFD_UPPER: Partial<Record<SILLevel, number>> = {
  1: 1e-1,
  2: 1e-2,
  3: 1e-3,
  4: 1e-4,
}

// ─── Context rules ────────────────────────────────────────────────────────────

function ruleContextSILTarget(sif: SIF): DiagnosticItem[] {
  if (sif.targetSIL && sif.targetSIL > 0) return []
  return [{
    id: 'ctx-sil-target-missing',
    severity: 'error',
    phase: 'context',
    title: 'SIL cible non défini',
    detail: 'Le SIL cible de la SIF doit être renseigné avant le calcul.',
    action: { label: 'Aller au contexte', tab: 'context' },
  }]
}

function ruleContextProcessTag(sif: SIF): DiagnosticItem[] {
  if (sif.processTag?.trim()) return []
  return [{
    id: 'ctx-process-tag-missing',
    severity: 'warning',
    phase: 'context',
    title: 'Tag process non renseigné',
    detail: 'Le tag process (ex: PT-101) est requis pour la traçabilité HAZOP.',
    action: { label: 'Aller au contexte', tab: 'context' },
  }]
}

function ruleContextHazardousEvent(sif: SIF): DiagnosticItem[] {
  if (sif.hazardousEvent?.trim()) return []
  return [{
    id: 'ctx-hazardous-event-missing',
    severity: 'warning',
    phase: 'context',
    title: 'Événement dangereux non renseigné',
    detail: 'Décrire l\'événement dangereux couvert par la SIF (lien HAZOP/LOPA).',
    action: { label: 'Aller au contexte', tab: 'context' },
  }]
}

// ─── Architecture rules ───────────────────────────────────────────────────────

function ruleArchSubsystemsExist(sif: SIF): DiagnosticItem[] {
  if (sif.subsystems.length > 0) return []
  return [{
    id: 'arch-no-subsystems',
    severity: 'error',
    phase: 'architecture',
    title: 'Aucun sous-système dans l\'architecture',
    detail: 'La SIF doit avoir au moins un sous-système (capteur, logique, actionneur).',
    action: { label: 'Aller à l\'architecture', tab: 'architecture' },
  }]
}

function ruleArchEmptySubsystems(sif: SIF): DiagnosticItem[] {
  const empty = sif.subsystems.filter(sub =>
    sub.channels.every(ch => ch.components.length === 0),
  )
  return empty.map(sub => ({
    id: `arch-empty-subsystem-${sub.id}`,
    severity: 'error',
    phase: 'architecture',
    title: `Sous-système "${sub.label}" sans composant`,
    detail: 'Chaque sous-système doit avoir au moins un composant pour le calcul PFD.',
    action: { label: 'Aller à l\'architecture', tab: 'architecture' },
  }))
}

function ruleArchMissingLambda(sif: SIF): DiagnosticItem[] {
  const items: DiagnosticItem[] = []
  for (const sub of sif.subsystems) {
    for (const ch of sub.channels) {
      for (const comp of ch.components) {
        const hasData = comp.paramMode === 'factorized'
          ? comp.factorized.lambda > 0
          : (comp.developed.lambda_DU + comp.developed.lambda_DD) > 0
        if (!hasData) {
          items.push({
            id: `arch-no-lambda-${comp.id}`,
            severity: 'warning',
            phase: 'architecture',
            title: `Taux de défaillance nul — ${comp.tagName || comp.instrumentType}`,
            detail: 'λ = 0 : ce composant ne contribue pas au calcul PFD.',
            action: { label: 'Aller à l\'architecture', tab: 'architecture' },
          })
        }
      }
    }
  }
  return items
}

// ─── Verification rules ───────────────────────────────────────────────────────

function ruleVerifCalcAvailable(calc: SIFCalcResult | null): DiagnosticItem[] {
  if (!calc) return []
  if (!Number.isNaN(calc.PFD_avg)) return []
  return [{
    id: 'verif-calc-nan',
    severity: 'error',
    phase: 'verification',
    title: 'Calcul PFD impossible',
    detail: 'Le moteur ne peut pas calculer la PFD — vérifiez les paramètres de l\'architecture.',
    action: { label: 'Aller à la vérification', tab: 'verification' },
  }]
}

function ruleVerifMeetsTarget(sif: SIF, calc: SIFCalcResult | null): DiagnosticItem[] {
  if (!calc || Number.isNaN(calc.PFD_avg)) return []
  if (calc.meetsTarget) return []

  const target = SIL_PFD_UPPER[sif.targetSIL as SILLevel]
  const pfdStr = calc.PFD_avg.toExponential(2)
  const targetStr = target ? `< ${target.toExponential(0)}` : `SIL ${sif.targetSIL}`

  return [{
    id: 'verif-pfd-exceeds-target',
    severity: 'error',
    phase: 'verification',
    title: `PFD ${pfdStr} dépasse la cible ${targetStr}`,
    detail: `La SIF n'atteint pas SIL ${sif.targetSIL}. Revoir l'architecture ou les intervalles de tests.`,
    action: { label: 'Aller à la vérification', tab: 'verification' },
  }]
}

function ruleVerifRRF(sif: SIF, calc: SIFCalcResult | null): DiagnosticItem[] {
  if (!calc || Number.isNaN(calc.PFD_avg) || !sif.rrfRequired) return []
  if (calc.RRF >= sif.rrfRequired) return []
  return [{
    id: 'verif-rrf-below-required',
    severity: 'warning',
    phase: 'verification',
    title: `RRF ${calc.RRF.toFixed(0)} < requis ${sif.rrfRequired}`,
    detail: 'Le Facteur de Réduction de Risque calculé est inférieur à l\'exigence.',
    action: { label: 'Aller à la vérification', tab: 'verification' },
  }]
}

// ─── Exploitation rules ────────────────────────────────────────────────────────

function ruleExplProofTestDefined(sif: SIF): DiagnosticItem[] {
  if (sif.proofTestProcedure?.ref?.trim()) return []
  return [{
    id: 'expl-no-proof-test-procedure',
    severity: 'warning',
    phase: 'exploitation',
    title: 'Procédure de test de validation non définie',
    detail: 'IEC 61511-1 §16 requiert une procédure de proof test documentée.',
    action: { label: 'Aller à l\'exploitation', tab: 'exploitation' },
  }]
}

function ruleExplNoCampaigns(sif: SIF): DiagnosticItem[] {
  if (sif.status === 'draft' || sif.status === 'in_review') return []
  if (sif.testCampaigns.length > 0) return []
  return [{
    id: 'expl-no-campaigns',
    severity: 'info',
    phase: 'exploitation',
    title: 'Aucune campagne de tests enregistrée',
    detail: 'Les campagnes de proof test doivent être tracées pour la conformité en exploitation.',
    action: { label: 'Aller à l\'exploitation', tab: 'exploitation' },
  }]
}

function ruleExplFailedCampaign(sif: SIF): DiagnosticItem[] {
  const failed = sif.testCampaigns.filter(c => c.verdict === 'fail')
  return failed.map(c => ({
    id: `expl-failed-campaign-${c.id}`,
    severity: 'error',
    phase: 'exploitation',
    title: `Campagne du ${c.date} — Échec`,
    detail: 'Une campagne de proof test a échoué. La SIF peut ne plus être en conformité SIL.',
    action: { label: 'Aller à l\'exploitation', tab: 'exploitation' },
  }))
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function runSIFDiagnosticRules(
  sif: SIF,
  calc: SIFCalcResult | null,
): DiagnosticItem[] {
  return [
    // Context
    ...ruleContextSILTarget(sif),
    ...ruleContextProcessTag(sif),
    ...ruleContextHazardousEvent(sif),
    // Architecture
    ...ruleArchSubsystemsExist(sif),
    ...ruleArchEmptySubsystems(sif),
    ...ruleArchMissingLambda(sif),
    // Verification
    ...ruleVerifCalcAvailable(calc),
    ...ruleVerifMeetsTarget(sif, calc),
    ...ruleVerifRRF(sif, calc),
    // Exploitation
    ...ruleExplProofTestDefined(sif),
    ...ruleExplNoCampaigns(sif),
    ...ruleExplFailedCampaign(sif),
  ]
}
