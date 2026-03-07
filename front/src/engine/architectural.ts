// =============================================================================
// PRISM Calc Engine — Contraintes Architecturales
// Source : 06_ARCHITECTURAL_CONSTRAINTS.md
//
// Le SIL architectural est un PLAFOND indépendant du calcul PFD.
// SIL_final = min(SIL_PFD, SIL_architectural)
// =============================================================================

import type {
  SILLevel,
  IECStandard,
  ChannelDef,
  SubsystemDef,
  DeterminedCharacter,
} from './types/engine'
import { resolveFailureRates, worstDeterminedCharacter } from './resolver'
import { weightedAverage } from './utils/stats'

// ---------------------------------------------------------------------------
// Lookup tables Route 1H
// ---------------------------------------------------------------------------

// IEC 61508 Route 1H — Type A
// Table[sffClass][HFT] = SIL max
const ROUTE1H_TYPE_A: Record<string, number[]> = {
  // [HFT=0, HFT=1, HFT=2]
  lt60:   [1, 2, 3],
  '60_90':  [2, 3, 4],
  '90_99':  [3, 4, 4],
  gte99:  [3, 4, 4],
}

// IEC 61508 Route 1H — Type B
const ROUTE1H_TYPE_B: Record<string, number[]> = {
  lt60:   [0, 1, 2], // 0 = non autorisé
  '60_90':  [1, 2, 3],
  '90_99':  [2, 3, 4],
  gte99:  [3, 4, 4],
}

// ---------------------------------------------------------------------------
// Classement SFF
// ---------------------------------------------------------------------------

type SFFClass = 'lt60' | '60_90' | '90_99' | 'gte99'

function getSFFClass(sff: number): SFFClass {
  if (sff < 0.60) return 'lt60'
  if (sff < 0.90) return '60_90'
  if (sff < 0.99) return '90_99'
  return 'gte99'
}

// ---------------------------------------------------------------------------
// Calcul SIL Architectural par norme
// ---------------------------------------------------------------------------

/**
 * Calcule le SIL maximum atteignable selon la contrainte architecturale.
 *
 * @param HFT - Hardware Fault Tolerance = N - M
 * @param SFF - Safe Failure Fraction ∈ [0,1]
 * @param componentType - Type A / B / Non-Type-AB
 * @param standard - Norme IEC à appliquer
 * @returns SIL max architectural (0 = non autorisé)
 */
export function computeArchitecturalSIL(params: {
  HFT: number
  SFF: number
  componentType: DeterminedCharacter
  standard: IECStandard
}): SILLevel | null {
  const { HFT, SFF, componentType, standard } = params

  let silMax: number

  switch (standard) {
    case 'IEC61508_ROUTE1H':
      silMax = route1H(HFT, SFF, componentType)
      break
    case 'IEC61508_ROUTE2H':
      silMax = route2H(HFT)
      break
    case 'IEC61511_2016':
      silMax = iec61511_2016(HFT)
      break
    default:
      silMax = route1H(HFT, SFF, componentType)
  }

  if (silMax <= 0) return null
  return silMax as SILLevel
}

function route1H(HFT: number, SFF: number, type: DeterminedCharacter): number {
  const sffClass = getSFFClass(SFF)
  const hftIdx = Math.min(Math.max(HFT, 0), 2) // clamp [0, 2]

  if (type === 'NON_TYPE_AB') {
    // Traité comme Type B avec pénalité d'un niveau (conservatif)
    const base = (ROUTE1H_TYPE_B[sffClass] ?? [0, 0, 0])[hftIdx]
    return Math.max(0, base - 1)
  }

  const table = type === 'TYPE_A' ? ROUTE1H_TYPE_A : ROUTE1H_TYPE_B
  return (table[sffClass] ?? [0, 0, 0])[hftIdx] ?? 0
}

function route2H(HFT: number): number {
  // Route 2H — basée uniquement sur HFT, sans SFF
  if (HFT >= 2) return 4
  if (HFT === 1) return 3
  if (HFT === 0) return 2
  return 0
}

function iec61511_2016(HFT: number): number {
  // IEC 61511:2016 Clause 11.4 — pas de distinction Type A/B
  if (HFT >= 2) return 4
  if (HFT === 1) return 3
  if (HFT === 0) return 2 // SIL 1-2 avec justification
  return 0
}

// ---------------------------------------------------------------------------
// Calcul HFT et SFF d'un sous-système complet
// ---------------------------------------------------------------------------

/**
 * Calcule les propriétés architecturales d'un sous-système (HFT, SFF, type)
 * à partir de sa définition (canaux + vote MooN).
 */
export function computeSubsystemArchitecture(def: SubsystemDef): {
  HFT: number
  SFF: number
  componentType: DeterminedCharacter
} {
  const { N, M } = def.voting
  // HFT = N - M (nombre de défaillances tolérées)
  const HFT = N - M

  // Agréger les composants de tous les canaux
  const allComponents = def.channels.flatMap(ch => ch.components)

  if (allComponents.length === 0) {
    return { HFT, SFF: 0, componentType: 'TYPE_A' }
  }

  // SFF = moyenne pondérée par λ total de chaque composant
  const rates = allComponents.map(resolveFailureRates)
  const totalLambda = rates.reduce((s, r) => s + r.lambda, 0)

  const SFF = totalLambda > 0
    ? weightedAverage(
        rates.map(r => r.SFF),
        rates.map(r => r.lambda)
      )
    : 0

  // Type = le plus restrictif parmi tous les composants
  const types = allComponents.map(c => c.determinedCharacter)
  const componentType = worstDeterminedCharacter(types)

  return { HFT, SFF, componentType }
}

/**
 * Calcule le SIL architectural d'un sous-système.
 */
export function computeSubsystemArchitecturalSIL(
  def: SubsystemDef,
  standard: IECStandard
): SILLevel | null {
  const arch = computeSubsystemArchitecture(def)
  return computeArchitecturalSIL({
    HFT: arch.HFT,
    SFF: arch.SFF,
    componentType: arch.componentType,
    standard: def.standard ?? standard,
  })
}

// ---------------------------------------------------------------------------
// Vérification de cohérence
// ---------------------------------------------------------------------------

export interface ArchitecturalCheck {
  silFromPFD: SILLevel | null
  silArchitectural: SILLevel | null
  isLimitedByArchitecture: boolean
  /** true si le SIL architectural est le facteur limitant */
  silAchieved: SILLevel | null
  warning?: string
}

/**
 * Vérifie la cohérence entre SIL calculé par PFD et SIL architectural.
 * Produit un avertissement si l'architecture est le facteur limitant.
 */
export function checkArchitecturalConstraint(
  silFromPFD: SILLevel | null,
  silArchitectural: SILLevel | null
): ArchitecturalCheck {
  const silValues = [silFromPFD, silArchitectural].filter((s): s is SILLevel => s !== null)
  const silAchieved = silValues.length > 0 ? Math.min(...silValues) as SILLevel : null

  const isLimitedByArchitecture =
    silArchitectural !== null &&
    silFromPFD !== null &&
    silArchitectural < silFromPFD

  let warning: string | undefined
  if (isLimitedByArchitecture) {
    warning = `Le SIL architectural (SIL ${silArchitectural}) limite le résultat. ` +
              `Le calcul PFD atteint SIL ${silFromPFD} mais la contrainte HFT/SFF plafonne à SIL ${silArchitectural}. ` +
              `Améliorer l'architecture (HFT ou SFF) pour lever cette contrainte.`
  }

  return { silFromPFD, silArchitectural, isLimitedByArchitecture, silAchieved, warning }
}
