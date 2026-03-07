import type {
  Architecture,
  BetaAssessmentConfig,
  BetaAssessmentProfile,
  BetaDiagnosticIntervalUnit,
  SubsystemType,
} from '@/core/types'

export interface BetaChecklistItem {
  id: string
  section: string
  label: string
  scores: {
    logic?: { x: number; y: number }
    field?: { x: number; y: number }
  }
}

export interface BetaAssessmentResult {
  profile: BetaAssessmentProfile
  x: number
  y: number
  z: number
  score: number
  s: number
  sd: number
  betaInt: number
  betaDInt: number
  scaleFactor: number | null
  beta: number | null
  betaD: number | null
  acceptable: boolean
  scaleSupported: boolean
  warnings: string[]
}

const BETA_SCALE_FACTORS: Record<number, Partial<Record<number, number>>> = {
  2: { 1: 1, 2: 1 },
  3: { 1: 0.5, 2: 1.5 },
  4: { 1: 0.3, 2: 0.6, 3: 1.75 },
  5: { 1: 0.2, 2: 0.4, 3: 0.8, 4: 2 },
}

const LOGIC_SCORE_MAP = [
  { min: 120, beta: 0.005 },
  { min: 70, beta: 0.01 },
  { min: 45, beta: 0.02 },
  { min: Number.NEGATIVE_INFINITY, beta: 0.05 },
]

const FIELD_SCORE_MAP = [
  { min: 120, beta: 0.01 },
  { min: 70, beta: 0.02 },
  { min: 45, beta: 0.05 },
  { min: Number.NEGATIVE_INFINITY, beta: 0.1 },
]

export const BETA_CHECKLIST_ITEMS: readonly BetaChecklistItem[] = [
  {
    id: 'cables-separated-routing',
    section: 'Separation / Segregation',
    label: 'Tous les cables de signaux des canaux sont-ils achemines separement vers tous les points de connexion ?',
    scores: { logic: { x: 1.5, y: 1.5 }, field: { x: 1, y: 2 } },
  },
  {
    id: 'logic-pcb-separated',
    section: 'Separation / Segregation',
    label: 'Les canaux du sous-systeme logique sont-ils sur des cartes de circuits imprimes separees ?',
    scores: { logic: { x: 3, y: 1 } },
  },
  {
    id: 'logic-cabinets-separated',
    section: 'Separation / Segregation',
    label: 'Les canaux du sous-systeme logique sont-ils separes efficacement (par exemple dans des armoires separees) ?',
    scores: { logic: { x: 2.5, y: 0.5 } },
  },
  {
    id: 'field-dedicated-electronics-pcb',
    section: 'Separation / Segregation',
    label: "Si les capteurs/elements finaux disposent d'une electronique dediee, l'electronique de chaque canal est-elle sur une carte de circuit imprime separee ?",
    scores: { field: { x: 2.5, y: 1.5 } },
  },
  {
    id: 'field-electronics-cabinets-separated',
    section: 'Separation / Segregation',
    label: "Si les capteurs/elements finaux disposent d'une electronique de commande, l'electronique de chaque canal est-elle sous abri et dans des armoires separees ?",
    scores: { field: { x: 2.5, y: 0.5 } },
  },
  {
    id: 'electrical-diversity',
    section: 'Diversity / Redundancy',
    label: "Les canaux emploient-ils des technologies electriques differentes (par exemple un canal electronique ou programmable et l'autre a relais) ?",
    scores: { logic: { x: 8, y: 0 } },
  },
  {
    id: 'electronic-diversity',
    section: 'Diversity / Redundancy',
    label: 'Les canaux emploient-ils des technologies electroniques differentes (par exemple un canal electronique et lautre programmable) ?',
    scores: { logic: { x: 6, y: 0 } },
  },
  {
    id: 'field-physical-principles',
    section: 'Diversity / Redundancy',
    label: 'Les dispositifs emploient-ils des principes physiques differents pour les elements sensibles ?',
    scores: { field: { x: 9, y: 0 } },
  },
  {
    id: 'field-electrical-design-diversity',
    section: 'Diversity / Redundancy',
    label: 'Les dispositifs utilisent-ils des principes electriques ou conceptions differents (numerique vs analogique, fabricant different, etc.) ?',
    scores: { field: { x: 6.5, y: 0 } },
  },
  {
    id: 'low-diversity-diagnostics',
    section: 'Diversity / Redundancy',
    label: 'Une faible diversite est-elle utilisee (par exemple essais de diagnostic utilisant la meme technologie) ?',
    scores: { logic: { x: 2, y: 1 } },
  },
  {
    id: 'medium-diversity-diagnostics',
    section: 'Diversity / Redundancy',
    label: 'Une diversite moyenne est-elle utilisee (par exemple essais de diagnostic utilisant une technologie differente) ?',
    scores: { logic: { x: 3, y: 2 } },
  },
  {
    id: 'independent-designers',
    section: 'Diversity / Redundancy',
    label: 'Les canaux ont-ils ete concus par des concepteurs differents sans communication pendant la conception ?',
    scores: { logic: { x: 1.5, y: 1.5 } },
  },
  {
    id: 'different-commissioning-methods',
    section: 'Diversity / Redundancy',
    label: 'Des methodes dessai et des individus differents sont-ils utilises pour chaque canal pendant la mise en service ?',
    scores: { logic: { x: 1, y: 0.5 }, field: { x: 1, y: 2 } },
  },
  {
    id: 'maintenance-separated',
    section: 'Diversity / Redundancy',
    label: 'La maintenance de chaque canal est-elle realisee par des personnes differentes a des moments differents ?',
    scores: { logic: { x: 3, y: 3 } },
  },
  {
    id: 'interconnection-limited',
    section: 'Complexity / Design / Application / Maturity',
    label: "L'interconnexion entre des canaux previent-elle lechange dinformations autres que pour diagnostic ou logique majoritaire ?",
    scores: { logic: { x: 0.5, y: 0.5 }, field: { x: 0.5, y: 0.5 } },
  },
  {
    id: 'technique-mature',
    section: 'Complexity / Design / Application / Maturity',
    label: 'La conception se fonde-t-elle sur des techniques utilisees avec succes dans ce domaine depuis plus de 5 ans ?',
    scores: { logic: { x: 0.5, y: 1 }, field: { x: 1, y: 1 } },
  },
  {
    id: 'hardware-experience',
    section: 'Complexity / Design / Application / Maturity',
    label: 'Y a-t-il plus de 5 ans dexperience avec le meme materiel dans des environnements similaires ?',
    scores: { logic: { x: 1, y: 1.5 }, field: { x: 1.5, y: 1.5 } },
  },
  {
    id: 'logic-simple-system',
    section: 'Complexity / Design / Application / Maturity',
    label: 'Le systeme est-il simple (par exemple pas plus de 10 entrees ou sorties par canal) ?',
    scores: { logic: { x: 1, y: 0 } },
  },
  {
    id: 'io-protected',
    section: 'Complexity / Design / Application / Maturity',
    label: 'Les entrees et sorties sont-elles protegees contre surtensions et surintensites ?',
    scores: { logic: { x: 1.5, y: 0.5 }, field: { x: 1.5, y: 0.5 } },
  },
  {
    id: 'component-derating',
    section: 'Complexity / Design / Application / Maturity',
    label: 'Les caracteristiques assignees de tous les dispositifs ou composants sont-elles selectionnees avec prudence (facteur >= 2) ?',
    scores: { logic: { x: 2, y: 0 }, field: { x: 2, y: 0 } },
  },
  {
    id: 'fmea-fta-reviewed',
    section: 'Assessment / Analysis / Feedback',
    label: 'Les analyses FMEA / FTA ont-elles ete examinees pour identifier et eliminer les causes communes des la conception ?',
    scores: { field: { x: 3, y: 3 } },
  },
  {
    id: 'ccf-documented-in-design',
    section: 'Assessment / Analysis / Feedback',
    label: 'Les defaillances de cause commune ont-elles ete prises en compte dans la conception avec preuves documentaires ?',
    scores: { field: { x: 3, y: 3 } },
  },
  {
    id: 'field-failures-feedback',
    section: 'Assessment / Analysis / Feedback',
    label: 'Toutes les defaillances terrain sont-elles analysees avec retour dexperience vers la conception ?',
    scores: { logic: { x: 0.5, y: 3.5 }, field: { x: 0.5, y: 3.5 } },
  },
  {
    id: 'written-root-cause-procedure',
    section: 'Procedures / Human Interface',
    label: 'Existe-t-il une procedure de travail ecrite qui assure que toutes les defaillances ou degradations de composants sont detectees, que les causes initiales sont etablies et que des elements similaires sont inspectes ?',
    scores: { logic: { x: 0, y: 1.5 }, field: { x: 0.5, y: 1.5 } },
  },
  {
    id: 'staggered-maintenance-procedure',
    section: 'Procedures / Human Interface',
    label: 'Existe-t-il des procedures garantissant que la maintenance de canaux independants est echelonnee et que les diagnostics peuvent etre executes de maniere satisfaisante entre deux maintenances ?',
    scores: { logic: { x: 1.5, y: 0.5 }, field: { x: 2, y: 1 } },
  },
  {
    id: 'independence-maintained-after-maintenance',
    section: 'Procedures / Human Interface',
    label: 'Les procedures ecrites de maintenance specifient-elles que toutes les parties de systemes redondants concues pour etre independantes ne sont pas allouees differemment ?',
    scores: { logic: { x: 0.5, y: 0.5 }, field: { x: 0.5, y: 0.5 } },
  },
  {
    id: 'qualified-repair-center',
    section: 'Procedures / Human Interface',
    label: 'La maintenance des cartes de circuits imprimes est-elle effectuee par un centre de reparation qualifie avec essais de preinstallation complets ?',
    scores: { logic: { x: 0.5, y: 1 }, field: { x: 0.5, y: 1.5 } },
  },
  {
    id: 'logic-low-diagnostic-coverage',
    section: 'Procedures / Human Interface',
    label: 'Le systeme a-t-il une couverture de diagnostic faible (60 % a 90 %) et rend-il compte des defaillances au niveau d\'un module remplacable sur site ?',
    scores: { logic: { x: 0.5, y: 0 } },
  },
  {
    id: 'logic-medium-diagnostic-coverage',
    section: 'Procedures / Human Interface',
    label: 'Le systeme a-t-il une couverture de diagnostic moyenne (90 % a 99 %) et rend-il compte des defaillances au niveau d\'un module remplacable sur site ?',
    scores: { logic: { x: 1.5, y: 1 } },
  },
  {
    id: 'logic-high-diagnostic-coverage',
    section: 'Procedures / Human Interface',
    label: 'Le systeme a-t-il une couverture de diagnostic elevee (> 99 %) et rend-il compte des defaillances au niveau d\'un module remplacable sur site ?',
    scores: { logic: { x: 2.5, y: 1.5 } },
  },
  {
    id: 'field-diagnostic-reporting',
    section: 'Procedures / Human Interface',
    label: 'Les essais de diagnostic du systeme rapportent-ils les defaillances au niveau dun module remplacable sur site ?',
    scores: { field: { x: 1, y: 1 } },
  },
  {
    id: 'designer-training',
    section: 'Competence / Training / Safety Culture',
    label: 'Les concepteurs ont-ils ete formes pour mesurer les causes et les consequences de defaillances de cause commune ?',
    scores: { logic: { x: 2, y: 3 }, field: { x: 2, y: 3 } },
  },
  {
    id: 'maintenance-training',
    section: 'Competence / Training / Safety Culture',
    label: 'Les agents de maintenance ont-ils ete formes pour mesurer les causes et les consequences de defaillances de cause commune ?',
    scores: { logic: { x: 0.5, y: 4.5 }, field: { x: 0.5, y: 4.5 } },
  },
  {
    id: 'personnel-access-limited',
    section: 'Environment Control',
    label: "L'acces du personnel est-il limite (par exemple armoires verrouillees, points inaccessibles) ?",
    scores: { logic: { x: 0.5, y: 2.5 }, field: { x: 0.5, y: 2.5 } },
  },
  {
    id: 'environmental-operating-range',
    section: 'Environment Control',
    label: "Le systeme est-il en mesure de fonctionner toujours dans la plage de temperature, dhumidite, de corrosion, de poussiere et de vibrations pour laquelle il a ete soumis a essai, sans controle exterieur de l'environnement ?",
    scores: { logic: { x: 3, y: 1 }, field: { x: 3, y: 1 } },
  },
  {
    id: 'signal-and-power-separated',
    section: 'Environment Control',
    label: "Tous les cables de signaux et d'alimentation sont-ils separes en tous points de connexion ?",
    scores: { logic: { x: 2, y: 1 }, field: { x: 2, y: 1 } },
  },
  {
    id: 'environmental-immunity-tested',
    section: 'Environmental Testing',
    label: "L'immunite du systeme a-t-elle ete evaluee pour toutes les influences environnementales significatives a un niveau approprie comme specifie dans les normes reconnues ?",
    scores: { logic: { x: 10, y: 10 }, field: { x: 10, y: 10 } },
  },
]

export function profileForSubsystemType(type: SubsystemType): BetaAssessmentProfile {
  return type === 'logic' ? 'logic' : 'field'
}

export function defaultMooN(architecture: Architecture, channelCount: number): { m: number; n: number } {
  if (architecture === '2oo2') return { m: 2, n: Math.max(2, channelCount) }
  if (architecture === '2oo3') return { m: 2, n: Math.max(3, channelCount) }
  if (architecture === '1oo2' || architecture === '1oo2D') return { m: 1, n: Math.max(2, channelCount) }
  if (architecture === '1oo1') return { m: 1, n: 1 }
  return { m: 1, n: Math.max(2, channelCount) }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function defaultBetaAssessment(
  subsystemType: SubsystemType,
  architecture: Architecture,
  channelCount: number,
): BetaAssessmentConfig {
  const mooN = defaultMooN(architecture, channelCount)

  return {
    mode: 'manual',
    profile: profileForSubsystemType(subsystemType),
    selectedMeasureIds: [],
    diagnosticCoveragePct: 0,
    diagnosticInterval: 1,
    diagnosticIntervalUnit: profileForSubsystemType(subsystemType) === 'logic' ? 'min' : 'hr',
    allowZCredit: false,
    mooN_M: mooN.m,
    mooN_N: mooN.n,
  }
}

export function normalizeBetaAssessment(
  value: unknown,
  subsystemType: SubsystemType,
  architecture: Architecture,
  channelCount: number,
): BetaAssessmentConfig {
  const fallback = defaultBetaAssessment(subsystemType, architecture, channelCount)
  const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  const diagnosticIntervalUnit = source.diagnosticIntervalUnit

  return {
    mode: source.mode === 'iec61508' ? 'iec61508' : fallback.mode,
    profile: source.profile === 'logic' || source.profile === 'field' ? source.profile : fallback.profile,
    selectedMeasureIds: Array.isArray(source.selectedMeasureIds)
      ? source.selectedMeasureIds.filter((item): item is string => typeof item === 'string')
      : fallback.selectedMeasureIds,
    diagnosticCoveragePct: clamp(Number(source.diagnosticCoveragePct ?? fallback.diagnosticCoveragePct), 0, 100),
    diagnosticInterval: clamp(Number(source.diagnosticInterval ?? fallback.diagnosticInterval), 0, 999999),
    diagnosticIntervalUnit:
      diagnosticIntervalUnit === 'min' || diagnosticIntervalUnit === 'hr' || diagnosticIntervalUnit === 'day'
        ? diagnosticIntervalUnit
        : fallback.diagnosticIntervalUnit,
    allowZCredit: typeof source.allowZCredit === 'boolean' ? source.allowZCredit : fallback.allowZCredit,
    mooN_M: Math.round(clamp(Number(source.mooN_M ?? fallback.mooN_M), 1, 5)),
    mooN_N: Math.round(clamp(Number(source.mooN_N ?? fallback.mooN_N), 1, 5)),
  }
}

export function diagnosticIntervalToMinutes(value: number, unit: BetaDiagnosticIntervalUnit): number {
  if (unit === 'day') return value * 24 * 60
  if (unit === 'hr') return value * 60
  return value
}

function diagnosticIntervalToHours(value: number, unit: BetaDiagnosticIntervalUnit): number {
  if (unit === 'day') return value * 24
  if (unit === 'min') return value / 60
  return value
}

export function applicableBetaChecklistItems(profile: BetaAssessmentProfile): BetaChecklistItem[] {
  return BETA_CHECKLIST_ITEMS.filter(item => profile === 'logic' ? !!item.scores.logic : !!item.scores.field)
}

function zFactor(profile: BetaAssessmentProfile, coveragePct: number, interval: number, unit: BetaDiagnosticIntervalUnit): number {
  if (coveragePct < 60 || interval <= 0) return 0

  if (profile === 'logic') {
    const minutes = diagnosticIntervalToMinutes(interval, unit)

    if (coveragePct >= 99) {
      if (minutes < 1) return 2
      if (minutes <= 5) return 1
      return 0
    }
    if (coveragePct >= 90) {
      if (minutes < 1) return 1.5
      if (minutes <= 5) return 0.5
      return 0
    }
    if (minutes < 1) return 1
    return 0
  }

  const hours = diagnosticIntervalToHours(interval, unit)

  if (coveragePct >= 99) {
    if (hours < 2) return 2
    if (hours <= 48) return 1.5
    if (hours <= 168) return 1
    return 0
  }
  if (coveragePct >= 90) {
    if (hours < 2) return 1.5
    if (hours <= 48) return 1
    if (hours <= 168) return 0.5
    return 0
  }
  if (hours < 2) return 1
  if (hours <= 48) return 0.5
  return 0
}

function betaFromScore(profile: BetaAssessmentProfile, score: number): number {
  const table = profile === 'logic' ? LOGIC_SCORE_MAP : FIELD_SCORE_MAP
  const matched = table.find(row => score >= row.min)
  return matched?.beta ?? table[table.length - 1].beta
}

function scaleFactorForMooN(m: number, n: number): number | null {
  return BETA_SCALE_FACTORS[n]?.[m] ?? null
}

export function computeBetaAssessment(
  config: BetaAssessmentConfig,
  subsystemType: SubsystemType,
): BetaAssessmentResult {
  const profile = config.profile ?? profileForSubsystemType(subsystemType)
  const applicableItems = applicableBetaChecklistItems(profile)
  const selected = new Set(config.selectedMeasureIds)

  const sums = applicableItems.reduce((acc, item) => {
    if (!selected.has(item.id)) return acc
    const score = profile === 'logic' ? item.scores.logic : item.scores.field
    if (!score) return acc
    return {
      x: acc.x + score.x,
      y: acc.y + score.y,
    }
  }, { x: 0, y: 0 })

  const z = config.allowZCredit
    ? zFactor(profile, config.diagnosticCoveragePct, config.diagnosticInterval, config.diagnosticIntervalUnit)
    : 0
  const score = sums.x + sums.y + z
  const s = sums.x + sums.y
  const sd = sums.x * (z + 1) + sums.y
  const betaInt = betaFromScore(profile, s)
  const betaDInt = betaFromScore(profile, sd)
  const scaleFactor = scaleFactorForMooN(config.mooN_M, config.mooN_N)

  const warnings: string[] = []
  if (!config.allowZCredit && config.diagnosticCoveragePct >= 60) {
    warnings.push('Diagnostic credit Z is disabled. Enable it only when IEC note conditions are satisfied.')
  }
  if (config.mooN_N > 5) {
    warnings.push('Table D.5 only covers up to N = 5. Scaled beta is not computed for this architecture.')
  }
  if (config.mooN_M > config.mooN_N) {
    warnings.push('M cannot be greater than N in a MooN architecture.')
  }
  if (config.mooN_N > 1 && scaleFactor === null) {
    warnings.push('This MooN combination is not covered explicitly by the current Table D.5 mapping.')
  }

  return {
    profile,
    x: sums.x,
    y: sums.y,
    z,
    score,
    s,
    sd,
    betaInt,
    betaDInt,
    scaleFactor,
    beta: scaleFactor === null ? null : betaInt * scaleFactor,
    betaD: scaleFactor === null ? null : betaDInt * scaleFactor,
    acceptable: score >= 65,
    scaleSupported: scaleFactor !== null,
    warnings,
  }
}
