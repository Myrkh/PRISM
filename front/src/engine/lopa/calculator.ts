/**
 * engine/lopa/calculator.ts — PRISM
 *
 * Pure TypeScript LOPA calculation engine.
 * Implements IEC 61511 / CCPS LOPA methodology.
 *
 * Math:
 *   MEF = IEF × Π(conditional modifiers) × Π(IPL PFDs)
 *   RRF = MEF / TMEL
 *   SIL = f(RRF)  →  SIL1: 10, SIL2: 100, SIL3: 1000, SIL4: 10000
 */

import type {
  LOPAScenario,
  LOPAScenarioResult,
  LOPAWaterfallStep,
} from '@/core/types/lopa.types'

// ─── SIL from RRF ────────────────────────────────────────────────────────────

export function silFromRRF(rrf: number): 0 | 1 | 2 | 3 | 4 {
  if (!isFinite(rrf) || rrf <= 1) return 0
  if (rrf <= 10)    return 1
  if (rrf <= 100)   return 2
  if (rrf <= 1000)  return 3
  return 4
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatFrequency(value: number, precision = 2): string {
  if (value === 0) return '0'
  if (!isFinite(value)) return '—'
  return value.toExponential(precision)
}

export function formatRRF(rrf: number): string {
  if (!isFinite(rrf) || rrf <= 0) return '—'
  if (rrf < 1) return `${rrf.toFixed(2)}×`
  if (rrf < 10) return `${rrf.toFixed(1)}×`
  return `${Math.round(rrf)}×`
}

export function formatPFD(pfd: number): string {
  if (pfd <= 0 || pfd >= 1) return pfd.toString()
  return pfd.toExponential(0)
}

// ─── Core calculation ─────────────────────────────────────────────────────────

export function calculateLOPAScenario(scenario: LOPAScenario): LOPAScenarioResult {
  const { ief, ipls, tmel } = scenario

  // Conditional modifiers (each is a probability 0-1)
  const conditionalModifiers: number[] = []
  if (scenario.ignitionProbability !== null && scenario.ignitionProbability !== undefined) {
    conditionalModifiers.push(scenario.ignitionProbability)
  }
  if (scenario.occupancyFactor !== null && scenario.occupancyFactor !== undefined) {
    conditionalModifiers.push(scenario.occupancyFactor)
  }

  const conditionalModifierProduct = conditionalModifiers.reduce((acc, v) => acc * v, 1)
  const iplPfdProduct = ipls.reduce((acc, ipl) => acc * ipl.pfd, 1)
  const mef = ief * conditionalModifierProduct * iplPfdProduct

  const rrf = tmel > 0 ? mef / tmel : Infinity
  const silRequired = silFromRRF(rrf)

  // Build waterfall steps for visualization
  const waterfall = buildWaterfall(scenario, conditionalModifiers, conditionalModifierProduct)

  return {
    scenarioId: scenario.scenarioId,
    ief,
    conditionalModifierProduct,
    iplPfdProduct,
    mef,
    tmel,
    rrf,
    silRequired,
    isAdequate: mef <= tmel,
    needsSIF: rrf > 1,
    waterfall,
  }
}

function buildWaterfall(
  scenario: LOPAScenario,
  conditionalModifiers: number[],
  conditionalModifierProduct: number,
): LOPAWaterfallStep[] {
  const steps: LOPAWaterfallStep[] = []
  let running = scenario.ief

  // Step 0: IEF (starting point)
  steps.push({ label: 'IEF', pfd: 1, runningMef: running, isTarget: false })

  // Conditional modifiers
  if (scenario.ignitionProbability !== null && scenario.ignitionProbability !== undefined) {
    running *= scenario.ignitionProbability
    steps.push({
      label: `Ignition (×${scenario.ignitionProbability})`,
      pfd: scenario.ignitionProbability,
      runningMef: running,
      isTarget: false,
    })
  }
  if (scenario.occupancyFactor !== null && scenario.occupancyFactor !== undefined) {
    running *= scenario.occupancyFactor
    steps.push({
      label: `Occupancy (×${scenario.occupancyFactor})`,
      pfd: scenario.occupancyFactor,
      runningMef: running,
      isTarget: false,
    })
  }

  // Each IPL
  for (const ipl of scenario.ipls) {
    running *= ipl.pfd
    steps.push({
      label: ipl.tag ? `${ipl.tag} (×${formatPFD(ipl.pfd)})` : `IPL (×${formatPFD(ipl.pfd)})`,
      pfd: ipl.pfd,
      runningMef: running,
      isTarget: false,
    })
  }

  // TMEL target line
  steps.push({
    label: `TMEL target`,
    pfd: 1,
    runningMef: scenario.tmel,
    isTarget: true,
  })

  return steps
}

// ─── Worksheet calculation ────────────────────────────────────────────────────

export function calculateLOPAWorksheet(scenarios: LOPAScenario[]): LOPAScenarioResult[] {
  return scenarios.map(calculateLOPAScenario)
}

// ─── Adequacy checks (gamechanger: smart validation) ──────────────────────────

export interface LOPAAdequacyIssue {
  type: 'warning' | 'error'
  scenarioId?: string
  iplId?: string
  code: string
  message: string
}

/**
 * Run a battery of LOPA adequacy checks per IEC 61511 / CCPS rules:
 * 1. No PFD credit below minimum without justification
 * 2. Max 1 BPCS credit per scenario
 * 3. Max 1 alarm + operator response credit per scenario
 * 4. IPL independence — same tag used in multiple scenarios
 * 5. IEF > 1/yr — unrealistically high (likely input error)
 * 6. Unvalidated IPLs that are claiming high credit
 */
export function checkLOPAAdequacy(scenarios: LOPAScenario[]): LOPAAdequacyIssue[] {
  const issues: LOPAAdequacyIssue[] = []

  // Track IPL tags across all scenarios for independence check
  const tagToScenarios = new Map<string, string[]>()

  for (const scenario of scenarios) {
    const bpcsCount = scenario.ipls.filter(i => i.type === 'bpcs').length
    const alarmCount = scenario.ipls.filter(i => i.type === 'alarm_hloa').length

    if (bpcsCount > 1) {
      issues.push({
        type: 'error',
        scenarioId: scenario.scenarioId,
        code: 'MULTI_BPCS',
        message: `Scénario ${scenario.scenarioId} — plus d'un crédit BPCS. Un seul crédit BPCS est autorisé par scénario (CCPS LOPA, IEC 61511-3).`,
      })
    }

    if (alarmCount > 1) {
      issues.push({
        type: 'error',
        scenarioId: scenario.scenarioId,
        code: 'MULTI_ALARM',
        message: `Scénario ${scenario.scenarioId} — plus d'une alarme opérateur. Un seul crédit alarme est autorisé par scénario.`,
      })
    }

    if (scenario.ief > 1) {
      issues.push({
        type: 'warning',
        scenarioId: scenario.scenarioId,
        code: 'HIGH_IEF',
        message: `Scénario ${scenario.scenarioId} — IEF = ${formatFrequency(scenario.ief)} yr⁻¹ > 1/an. Vérifier la source de données.`,
      })
    }

    if (scenario.tmel <= 0) {
      issues.push({
        type: 'error',
        scenarioId: scenario.scenarioId,
        code: 'ZERO_TMEL',
        message: `Scénario ${scenario.scenarioId} — TMEL non défini ou nul. La fréquence cible est obligatoire.`,
      })
    }

    // IPL independence tracking
    for (const ipl of scenario.ipls) {
      if (ipl.tag) {
        const existing = tagToScenarios.get(ipl.tag) ?? []
        existing.push(scenario.scenarioId)
        tagToScenarios.set(ipl.tag, existing)
      }

      // Unvalidated IPL with strong credit
      if (!ipl.isValidated && ipl.pfd < 0.01) {
        issues.push({
          type: 'warning',
          scenarioId: scenario.scenarioId,
          iplId: ipl.id,
          code: 'UNVALIDATED_HIGH_CREDIT',
          message: `Scénario ${scenario.scenarioId} — IPL "${ipl.tag || ipl.description}" revendique PFD = ${formatPFD(ipl.pfd)} sans validation d'indépendance.`,
        })
      }
    }
  }

  // Cross-scenario IPL independence
  for (const [tag, usedIn] of tagToScenarios.entries()) {
    if (usedIn.length > 1) {
      issues.push({
        type: 'warning',
        code: 'IPL_SHARED',
        message: `IPL "${tag}" est utilisé dans plusieurs scénarios (${usedIn.join(', ')}). Vérifier l'indépendance de cet équipement dans chaque cas.`,
      })
    }
  }

  return issues
}

// ─── Dominant SIL from worksheet ─────────────────────────────────────────────

/**
 * Returns the highest SIL required across all scenarios.
 * This is the SIL that should drive ContextTab.targetSIL.
 */
export function dominantSILFromWorksheet(
  results: LOPAScenarioResult[],
): 0 | 1 | 2 | 3 | 4 {
  let max: 0 | 1 | 2 | 3 | 4 = 0
  for (const r of results) {
    if (r.silRequired > max) max = r.silRequired as 0 | 1 | 2 | 3 | 4
  }
  return max
}
