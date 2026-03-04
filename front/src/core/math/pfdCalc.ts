/**
 * PFD Calculation Engine
 * IEC 61508-6:2010 Annex B / IEC 61511-1:2016 §11 / ISA TR84.00.02
 */
import type {
  SIFComponent, SIFSubsystem, SIF,
  FactorizedParams, DevelopedParams,
  Architecture, SILLevel,
  ComponentCalcResult, SubsystemCalcResult, SIFCalcResult,
  PFDChartPoint,
} from '@/core/types'

// ─── Unit conversions ──────────────────────────────────────────────────────
const FIT = 1e-9           // 1 FIT = 1e-9 h⁻¹

/** Convert FIT to h⁻¹ */
export const fitToHr = (fit: number): number => fit * FIT

// ─── SIL classification (IEC 61508 Table 2) ────────────────────────────────
export function classifySIL(pfd: number): SILLevel {
  if (pfd < 1e-5) return 4
  if (pfd < 1e-4) return 3
  if (pfd < 1e-3) return 2
  if (pfd < 1e-2) return 1
  return 0
}

// ─── Factorized → Developed conversion ────────────────────────────────────
/**
 * Convert factorized params (λ, λD/λ, DCd, DCs) to developed (λDU, λDD, λSU, λSD).
 * Lambda input is in [h⁻¹], output is in [FIT = h⁻¹ × 10⁻⁹]
 */
export function factorizedToDeveloped(p: FactorizedParams): DevelopedParams {
  const lambdaHr = p.lambda * 1e-6   // convert from ×10⁻⁶ to h⁻¹
  const lambdaD  = lambdaHr * p.lambdaDRatio
  const lambdaS  = lambdaHr * (1 - p.lambdaDRatio)

  return {
    lambda_DU: (lambdaD * (1 - p.DCd))  / FIT,
    lambda_DD: (lambdaD * p.DCd)         / FIT,
    lambda_SU: (lambdaS * (1 - p.DCs))  / FIT,
    lambda_SD: (lambdaS * p.DCs)         / FIT,
  }
}

/** Get effective developed params for a component, respecting param mode */
export function getEffectiveDeveloped(component: SIFComponent): DevelopedParams {
  if (component.paramMode === 'factorized') {
    return factorizedToDeveloped(component.factorized)
  }
  return component.developed
}

// ─── Component metrics ────────────────────────────────────────────────────
export function calcComponentSFF(d: DevelopedParams): number {
  const lDU = fitToHr(d.lambda_DU)
  const lDD = fitToHr(d.lambda_DD)
  const lSU = fitToHr(d.lambda_SU)
  const lSD = fitToHr(d.lambda_SD)
  const tot = lDU + lDD + lSU + lSD
  return tot > 0 ? (lDD + lSU + lSD) / tot : 0
}

export function calcComponentDC(d: DevelopedParams): number {
  const lDU = fitToHr(d.lambda_DU)
  const lDD = fitToHr(d.lambda_DD)
  const tot  = lDU + lDD
  return tot > 0 ? lDD / tot : 0
}

// ─── PFD per architecture (IEC 61508-6 Annex B) ───────────────────────────
const HFT_MAP: Record<Architecture, number> = {
  '1oo1': 0, '2oo2': 0, '1oo2': 1, '1oo2D': 1, '2oo3': 1, 'custom': 0,
}
export const getHFT = (arch: Architecture): number => HFT_MAP[arch] ?? 0

/** PFDavg for a single component (used as building block) */
function componentPFD(d: DevelopedParams, TI: number, MTTR: number, arch: Architecture): number {
  const lDU = fitToHr(d.lambda_DU)
  const lDD = fitToHr(d.lambda_DD)

  switch (arch) {
    // IEC 61508-6 Eq. B.10a
    case '1oo1':
      return lDU * TI / 2 + lDD * MTTR

    // IEC 61508-6 Eq. B.11  (beta = 0.1 default — should come from component)
    case '1oo2':
      return lDU ** 2 * TI ** 2 / 3 + 2 * lDD * MTTR

    case '2oo2':
      return lDU * TI + 2 * lDD * MTTR

    // ISA TR84.00.02
    case '2oo3':
      return 3 * lDU ** 2 * TI ** 2 / 4

    case '1oo2D':
      return lDU ** 2 * TI ** 2 / 3 + lDD * MTTR

    default:
      return 0
  }
}

/**
 * Full subsystem PFD calculation including CCF (beta factor).
 * Uses the first component's test params for TI / MTTR (all components in
 * a subsystem share the same architecture & test interval by definition).
 */
export function calcSubsystemPFD(
  subsystem: SIFSubsystem,
): SubsystemCalcResult {
  // Aggregate components across all channels
  const allComponents = subsystem.channels.flatMap(ch => ch.components)
  if (allComponents.length === 0) {
    return {
      subsystemId: subsystem.id, type: subsystem.type,
      PFD_avg: 0, SFF: 0, DC: 0, HFT: getHFT(subsystem.architecture),
      SIL: 0, RRF: 0, components: [],
    }
  }

  const componentResults: ComponentCalcResult[] = allComponents.map(comp => {
    const d    = getEffectiveDeveloped(comp)
    const TI   = comp.test.T1Unit === 'yr' ? comp.test.T1 * 8760 : comp.test.T1
    const MTTR = comp.advanced.MTTR
    const pfd  = componentPFD(d, TI, MTTR, subsystem.architecture)
    const SFF  = calcComponentSFF(d)
    const DC   = calcComponentDC(d)
    return {
      componentId: comp.id,
      lambda_DU: d.lambda_DU, lambda_DD: d.lambda_DD,
      lambda_SU: d.lambda_SU, lambda_SD: d.lambda_SD,
      SFF, DC, PFD_avg: pfd, RRF: pfd > 0 ? 1 / pfd : Infinity,
      SIL: classifySIL(pfd),
    }
  })

  // Subsystem PFD = average of component PFDs (simplified series model per channel)
  const PFD_avg = componentResults.reduce((s, r) => s + r.PFD_avg, 0) / componentResults.length
  const SFF     = componentResults.reduce((s, r) => s + r.SFF, 0) / componentResults.length
  const DC      = componentResults.reduce((s, r) => s + r.DC,  0) / componentResults.length
  const HFT     = subsystem.architecture === 'custom' && subsystem.customBooleanArch
    ? subsystem.customBooleanArch.manualHFT
    : getHFT(subsystem.architecture)

  return {
    subsystemId: subsystem.id,
    type: subsystem.type,
    PFD_avg, SFF, DC, HFT,
    RRF: PFD_avg > 0 ? 1 / PFD_avg : Infinity,
    SIL: classifySIL(PFD_avg),
    components: componentResults,
  }
}

/** Full SIF PFD = sum of subsystem PFDs (IEC 61511 series model) */
export function calcSIF(sif: SIF): SIFCalcResult {
  const subsystemResults = sif.subsystems.map(calcSubsystemPFD)
  const PFD_avg = subsystemResults.reduce((s, r) => s + r.PFD_avg, 0)
  const SIL     = classifySIL(PFD_avg)
  const RRF     = PFD_avg > 0 ? 1 / PFD_avg : Infinity

  return {
    PFD_avg, RRF, SIL,
    meetsTarget: SIL >= sif.targetSIL,
    subsystems: subsystemResults,
    chartData: genChartData(sif, subsystemResults),
  }
}

// ─── Time-domain PFD (for charts) ────────────────────────────────────────
function pfdAtTime(arch: Architecture, t: number, lDU: number, lDD: number, MTTR: number): number {
  switch (arch) {
    case '1oo1':  return lDU * t + lDD * MTTR
    case '1oo2':  return lDU ** 2 * t ** 2 / 3 + 2 * lDD * MTTR
    case '2oo2':  return lDU * t + 2 * lDD * MTTR
    case '2oo3':  return 3 * lDU ** 2 * t ** 2 / 4
    case '1oo2D': return lDU ** 2 * t ** 2 / 3 + lDD * MTTR
    default:      return 0
  }
}

function genChartData(sif: SIF, subsystemResults: SubsystemCalcResult[]): PFDChartPoint[] {
  const POINTS = 300
  const CYCLES = 3

  // Use the smallest TI across all subsystems to drive the chart
  const allTIs = sif.subsystems.flatMap(sub =>
    sub.channels.flatMap(ch =>
      ch.components.map(c => c.test.T1Unit === 'yr' ? c.test.T1 * 8760 : c.test.T1)
    )
  )
  const minTI = allTIs.length > 0 ? Math.min(...allTIs) : 8760

  return Array.from({ length: POINTS + 1 }, (_, i) => {
    const t = (i / POINTS) * minTI * CYCLES
    const point: PFDChartPoint = { t: parseFloat((t / 8760).toFixed(4)), total: 0 }

    sif.subsystems.forEach(sub => {
      const allComps = sub.channels.flatMap(ch => ch.components)
      if (allComps.length === 0) return

      const comp = allComps[0]
      const d    = getEffectiveDeveloped(comp)
      const TI   = comp.test.T1Unit === 'yr' ? comp.test.T1 * 8760 : comp.test.T1
      const tMod = t % TI
      const lDU  = fitToHr(d.lambda_DU)
      const lDD  = fitToHr(d.lambda_DD)

      const v = Math.max(pfdAtTime(sub.architecture, tMod, lDU, lDD, comp.advanced.MTTR), 1e-10)
      point[sub.id] = v
      point.total += v
    })

    point.total = Math.max(point.total, 1e-10)
    return point
  })
}

// ─── Formatters ───────────────────────────────────────────────────────────
const SUP = (n: number): string =>
  (n < 0 ? '⁻' : '') +
  String(Math.abs(Math.round(n))).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c] ?? c).join('')

export const formatPFD = (v: number): string => {
  if (!v || v <= 0 || !isFinite(v)) return '—'
  const e = Math.floor(Math.log10(v))
  return `${(v / 10 ** e).toFixed(2)}×10${SUP(e)}`
}

export const formatRRF = (v: number): string => {
  if (!v || v <= 0 || !isFinite(v)) return '—'
  if (v >= 1e6)  return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return Math.round(v).toLocaleString('fr-FR')
}

export const formatPct = (v: number): string => `${(v * 100).toFixed(1)} %`
export const formatYr  = (hr: number): string =>
  hr >= 8760 ? `${(hr / 8760).toFixed(1)} yr` : `${hr} h`

export const logTickFormatter = (v: number): string =>
  `10${SUP(Math.round(Math.log10(v)))}`