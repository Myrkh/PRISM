/**
 * PFD Calculation Facade
 *
 * Legacy PRISM API preserved for the UI, now backed by the real engine in
 * `src/engine`. This file performs:
 *   1. App-domain SIF -> engine input mapping
 *   2. Engine result -> legacy `SIFCalcResult` mapping
 *   3. Lightweight chart approximation for the existing chart component
 */
import {
  computeSIF as computeEngineSIF,
  type EngineInput,
  type EngineResult,
} from '@/engine'
import type {
  CCFMethod as EngineCCFMethod,
  ChannelDef as EngineChannelDef,
  ComponentParams as EngineComponentParams,
  DeterminedCharacter as EngineDeterminedCharacter,
  IECStandard as EngineStandard,
  SIFDefinition as EngineSIFDefinition,
  SolverDef as EngineSolverDef,
  SubsystemDef as EngineSubsystemDef,
  VoteType as EngineVoteType,
} from '@/engine/types/engine'
import type {
  SIFComponent, SIFSubsystem, SIF,
  FactorizedParams, DevelopedParams,
  Architecture, SILLevel, Project,
  ComponentCalcResult, SubsystemCalcResult, SIFCalcResult,
  PFDChartPoint,
} from '@/core/types'
import { hydrateSIF } from '@/core/models/hydrate'

const FIT = 1e-9
const HOURS_PER_YEAR = 8760
const DEFAULT_MISSION_TIME = 10 * HOURS_PER_YEAR

export interface CalcAdapterOptions {
  projectStandard?: Project['standard']
}

const engineCache = new WeakMap<SIF, Map<string, EngineResult>>()
const calcCache = new WeakMap<SIF, Map<string, SIFCalcResult>>()

// ─── Unit conversions ──────────────────────────────────────────────────────
export const fitToHr = (fit: number): number => fit * FIT
const hrToFIT = (rate: number): number => rate / FIT

function toHours(value: number, unit: 'hr' | 'yr'): number {
  return unit === 'yr' ? value * HOURS_PER_YEAR : value
}

function normalizeLifetime(value: number | null): number | undefined {
  if (!value || value <= 0) return undefined
  // Historic UI is inconsistent about the unit. Small values are almost
  // always years; larger ones are already stored as hours.
  return value <= 100 ? value * HOURS_PER_YEAR : value
}

// ─── SIL classification (legacy contract uses 0..4) ───────────────────────
export function classifySIL(pfd: number): SILLevel {
  if (!isFinite(pfd) || pfd >= 1e-1) return 0
  if (pfd < 1e-5) return 4
  if (pfd < 1e-4) return 3
  if (pfd < 1e-3) return 2
  if (pfd < 1e-2) return 1
  return 0
}

// ─── Factorized → Developed conversion ────────────────────────────────────
/**
 * Convert factorized params (λ, λD/λ, DCd, DCs) to developed (λDU, λDD, λSU, λSD).
 * Lambda input is in [h⁻¹ × 10⁻⁶], output is in [FIT = h⁻¹ × 10⁻⁹].
 */
export function factorizedToDeveloped(p: FactorizedParams): DevelopedParams {
  const lambdaHr = p.lambda * 1e-6
  const lambdaD  = lambdaHr * p.lambdaDRatio
  const lambdaS  = lambdaHr * (1 - p.lambdaDRatio)

  return {
    lambda_DU: (lambdaD * (1 - p.DCd)) / FIT,
    lambda_DD: (lambdaD * p.DCd) / FIT,
    lambda_SU: (lambdaS * (1 - p.DCs)) / FIT,
    lambda_SD: (lambdaS * p.DCs) / FIT,
  }
}

/** Get effective developed params for a component, respecting param mode */
export function getEffectiveDeveloped(component: SIFComponent): DevelopedParams | undefined {
  if (component.paramMode === 'factorized' && component.factorized) {
    return factorizedToDeveloped(component.factorized)
  }
  return component.developed
}

// ─── Component metrics ────────────────────────────────────────────────────
export function calcComponentSFF(d: DevelopedParams | undefined): number {
  if (!d) return 0
  const lDU = fitToHr(d.lambda_DU)
  const lDD = fitToHr(d.lambda_DD)
  const lSU = fitToHr(d.lambda_SU)
  const lSD = fitToHr(d.lambda_SD)
  const tot = lDU + lDD + lSU + lSD
  return tot > 0 ? (lDD + lSU + lSD) / tot : 0
}

export function calcComponentDC(d: DevelopedParams | undefined): number {
  if (!d) return 0
  const lDU = fitToHr(d.lambda_DU)
  const lDD = fitToHr(d.lambda_DD)
  const tot = lDU + lDD
  return tot > 0 ? lDD / tot : 0
}

// ─── Legacy HFT helpers ───────────────────────────────────────────────────
const HFT_MAP: Record<Architecture, number> = {
  '1oo1': 0,
  '2oo2': 0,
  '1oo2': 1,
  '1oo2D': 1,
  '2oo3': 1,
  'custom': 0,
}

export const getHFT = (arch: Architecture): number => HFT_MAP[arch] ?? 0

function getLegacyHFT(subsystem: SIFSubsystem): number {
  if (subsystem.architecture === 'custom' && subsystem.customBooleanArch) {
    return subsystem.customBooleanArch.manualHFT
  }
  return getHFT(subsystem.architecture)
}

// ─── Engine mapping ───────────────────────────────────────────────────────
function standardToEngine(projectStandard?: Project['standard']): EngineStandard {
  switch (projectStandard) {
    case 'IEC61508':
      return 'IEC61508_ROUTE1H'
    case 'IEC61511':
    case 'ISA84':
    default:
      return 'IEC61511_2016'
  }
}

function inferDeterminedCharacter(component: SIFComponent): EngineDeterminedCharacter {
  if (component.determinedCharacter) return component.determinedCharacter

  switch (component.subsystemType) {
    case 'actuator':
      return 'TYPE_A'
    case 'logic':
      return 'TYPE_B'
    case 'sensor':
    default:
      return component.instrumentCategory === 'valve' || component.instrumentCategory === 'relay'
        ? 'TYPE_A'
        : 'TYPE_B'
  }
}

function mapSubsystemTypeToEngine(
  subsystemType: SIFComponent['subsystemType']
): EngineComponentParams['type'] {
  switch (subsystemType) {
    case 'logic':
      return 'SOLVER'
    case 'actuator':
      return 'ACTUATOR'
    case 'sensor':
    default:
      return 'SENSOR'
  }
}

function toEngineComponent(component: SIFComponent): EngineComponentParams {
  const failureRate = component.paramMode === 'factorized'
    ? {
        mode: 'FACTORISED' as const,
        lambda: component.factorized.lambda * 1e-6,
        lambdaD_ratio: component.factorized.lambdaDRatio,
        DCd: component.factorized.DCd,
        DCs: component.factorized.DCs,
      }
    : {
        mode: 'DEVELOPED' as const,
        lambdaDU: fitToHr(component.developed.lambda_DU),
        lambdaDD: fitToHr(component.developed.lambda_DD),
        lambdaSU: fitToHr(component.developed.lambda_SU),
        lambdaSD: fitToHr(component.developed.lambda_SD),
      }

  const proofTestType =
    component.test.testType === 'none'
      ? 'NONE'
      : component.test.testType === 'online'
        ? 'WORKING'
        : 'STOPPED'

  const lifetime = normalizeLifetime(component.advanced.lifetime)
  const lambdaStar =
    component.advanced.lambdaStar > 0 && !component.advanced.lambdaStarEqualToLambda
      ? fitToHr(component.advanced.lambdaStar)
      : undefined

  const partialStrokeEnabled =
    component.subsystemType === 'actuator' &&
    (component.test.testType === 'partial' || component.advanced.partialTest.enabled)

  return {
    id: component.id,
    tag: component.tagName,
    description: component.description,
    type: mapSubsystemTypeToEngine(component.subsystemType),
    category: component.instrumentCategory,
    instrumentType: component.instrumentType,
    manufacturer: component.manufacturer,
    dataSource: component.dataSource,
    determinedCharacter: inferDeterminedCharacter(component),
    failureRate,
    MTTR: component.advanced.MTTR ?? 0,
    test: {
      type: proofTestType,
      T1: proofTestType === 'NONE' ? 0 : toHours(component.test.T1, component.test.T1Unit),
      T0: toHours(component.test.T0, component.test.T0Unit),
      sigma: component.advanced.sigma ?? 1,
      gamma: component.advanced.gamma ?? 0,
      pi: 0,
      X: component.test.testType === 'online',
      lambdaStar,
      omega1: component.advanced.omega1 ?? 0,
      omega2: component.advanced.omega2 ?? 0,
      ptc: component.advanced.proofTestCoverage ?? 1,
      lifetime,
    },
    partialStroke: partialStrokeEnabled
      ? {
          enabled: true,
          X: component.test.testType === 'online',
          pi: component.advanced.partialTest.duration ?? 0,
          efficiency: component.advanced.partialTest.detectedFaultsPct ?? 0.5,
          nbTests: Math.max(component.advanced.partialTest.numberOfTests ?? 1, 1),
        }
      : undefined,
  }
}

function toEngineChannel(channel: SIFSubsystem['channels'][number]): EngineChannelDef {
  return {
    id: channel.id,
    components: channel.components.map(toEngineComponent),
  }
}

function normalizeCCF(subsystem: SIFSubsystem): EngineSubsystemDef['ccf'] {
  const beta = subsystem.ccf?.beta ?? 0.05
  return {
    beta,
    betaD: subsystem.ccf?.betaD ?? beta / 2,
    method: (subsystem.ccf?.method ?? 'MAX') as EngineCCFMethod,
  }
}

function architectureToVoting(subsystem: SIFSubsystem): EngineSubsystemDef['voting'] {
  const actualChannels = Math.max(subsystem.channels.length, 1)

  switch (subsystem.architecture) {
    case '1oo1':
      return { M: 1, N: actualChannels }
    case '1oo2':
    case '1oo2D':
      return { M: 1, N: actualChannels }
    case '2oo2':
      return { M: Math.min(2, actualChannels), N: actualChannels }
    case '2oo3':
      return { M: Math.min(2, actualChannels), N: actualChannels }
    case 'custom': {
      return subsystem.customBooleanArch?.gate === 'AND'
        ? { M: actualChannels, N: actualChannels }
        : { M: 1, N: actualChannels }
    }
    default:
      return { M: 1, N: actualChannels }
  }
}

function toEngineSubsystem(
  subsystem: SIFSubsystem,
  standard: EngineStandard
): EngineSubsystemDef {
  return {
    channels: subsystem.channels.map(toEngineChannel),
    voting: architectureToVoting(subsystem),
    voteType: (subsystem.voteType ?? 'S') as EngineVoteType,
    ccf: normalizeCCF(subsystem),
    standard,
  }
}

function makeNeutralComponent(type: SIFComponent['subsystemType']): EngineComponentParams {
  return {
    id: `neutral-${type}`,
    tag: `NEUTRAL_${type.toUpperCase()}`,
    type: mapSubsystemTypeToEngine(type),
    determinedCharacter: type === 'actuator' ? 'TYPE_A' : 'TYPE_B',
    failureRate: {
      mode: 'DEVELOPED',
      lambdaDU: 0,
      lambdaDD: 0,
      lambdaSU: 0,
      lambdaSD: 0,
    },
    MTTR: 0,
    test: {
      type: 'NONE',
      T1: 0,
      T0: 0,
      sigma: 1,
      gamma: 0,
      pi: 0,
      X: true,
      omega1: 0,
      omega2: 0,
      ptc: 1,
    },
  }
}

function makeNeutralSubsystem(
  type: SIFComponent['subsystemType'],
  standard: EngineStandard
): EngineSubsystemDef {
  return {
    channels: [{ id: `neutral-${type}-channel`, components: [makeNeutralComponent(type)] }],
    voting: { M: 1, N: 1 },
    voteType: 'S',
    ccf: { beta: 0, betaD: 0, method: 'MAX' },
    standard,
  }
}

function resolveMissionTime(sif: SIF): number {
  const testWindows = sif.subsystems.flatMap(sub =>
    sub.channels.flatMap(ch =>
      ch.components.map(comp => toHours(comp.test.T1, comp.test.T1Unit))
    )
  )
  const lifetimes = sif.subsystems.flatMap(sub =>
    sub.channels.flatMap(ch =>
      ch.components
        .map(comp => normalizeLifetime(comp.advanced.lifetime))
        .filter((value): value is number => value !== undefined)
    )
  )

  const maxWindow = testWindows.length > 0 ? Math.max(...testWindows) : 0
  const maxLifetime = lifetimes.length > 0 ? Math.max(...lifetimes) : 0
  return Math.max(DEFAULT_MISSION_TIME, maxWindow * 3, maxLifetime)
}

function toEngineInput(sif: SIF, options?: CalcAdapterOptions): EngineInput {
  const standard = standardToEngine(options?.projectStandard)
  const sensors = sif.subsystems.find(sub => sub.type === 'sensor')
  const logic = sif.subsystems.find(sub => sub.type === 'logic')
  const actuators = sif.subsystems.find(sub => sub.type === 'actuator')

  const engineSIF: EngineSIFDefinition = {
    id: sif.id,
    demandMode: sif.demandRate > 1 ? 'HIGH_DEMAND' : 'LOW_DEMAND',
    missionTime: resolveMissionTime(sif),
    sensors: sensors ? toEngineSubsystem(sensors, standard) : makeNeutralSubsystem('sensor', standard),
    solver: logic
      ? ({
          mode: 'ADVANCED',
          channels: logic.channels.map(toEngineChannel),
          voting: architectureToVoting(logic),
          voteType: (logic.voteType ?? 'S') as EngineVoteType,
          ccf: normalizeCCF(logic),
          standard,
        } satisfies EngineSolverDef)
      : { mode: 'SIMPLE', pfd: 0, pfh: 0 },
    actuators: actuators ? toEngineSubsystem(actuators, standard) : makeNeutralSubsystem('actuator', standard),
  }

  return {
    sif: engineSIF,
    options: {
      standard,
      mrt: 8,
      computeSTR: true,
      computeCurve: false,
      curvePoints: 200,
    },
  }
}

// ─── Cache-backed engine access ───────────────────────────────────────────
function getCached<T>(cache: WeakMap<SIF, Map<string, T>>, sif: SIF, key: string): T | undefined {
  return cache.get(sif)?.get(key)
}

function setCached<T>(cache: WeakMap<SIF, Map<string, T>>, sif: SIF, key: string, value: T): T {
  let scoped = cache.get(sif)
  if (!scoped) {
    scoped = new Map<string, T>()
    cache.set(sif, scoped)
  }
  scoped.set(key, value)
  return value
}

export function calcSIFEngine(sif: SIF, options?: CalcAdapterOptions): EngineResult {
  const key = standardToEngine(options?.projectStandard)
  const cached = getCached(engineCache, sif, key)
  if (cached) return cached

  const normalizedSIF = hydrateSIF(sif)
  const result = computeEngineSIF(toEngineInput(normalizedSIF, options))
  return setCached(engineCache, sif, key, result)
}

// ─── Legacy result mapping ────────────────────────────────────────────────
function toLegacySIL(value: number | null): SILLevel {
  return value === null ? 0 : value as SILLevel
}

function mergeSubsystemSIL(pfdSil: number | null, archSil: number | null): SILLevel {
  if (pfdSil === null && archSil === null) return 0
  if (pfdSil === null) return toLegacySIL(archSil)
  if (archSil === null) return toLegacySIL(pfdSil)
  return Math.min(pfdSil, archSil) as SILLevel
}

function buildComponentCalcResult(component: SIFComponent, pfdavg = Number.NaN): ComponentCalcResult {
  const effective = getEffectiveDeveloped(component)
  const SFF = calcComponentSFF(effective)
  const DC = calcComponentDC(effective)

  return {
    componentId: component.id,
    lambda_DU: effective?.lambda_DU ?? 0,
    lambda_DD: effective?.lambda_DD ?? 0,
    lambda_SU: effective?.lambda_SU ?? 0,
    lambda_SD: effective?.lambda_SD ?? 0,
    SFF,
    DC,
    PFD_avg: pfdavg,
    RRF: Number.isFinite(pfdavg) && pfdavg > 0 ? 1 / pfdavg : 0,
    SIL: Number.isFinite(pfdavg) ? classifySIL(pfdavg) : 0,
  }
}

function buildFallbackSubsystemResult(subsystem: SIFSubsystem): SubsystemCalcResult {
  const components = subsystem.channels.flatMap(channel =>
    channel.components.map(component => buildComponentCalcResult(component))
  )
  const SFF = components.length > 0
    ? components.reduce((sum, item) => sum + item.SFF, 0) / components.length
    : 0
  const DC = components.length > 0
    ? components.reduce((sum, item) => sum + item.DC, 0) / components.length
    : 0

  return {
    subsystemId: subsystem.id,
    type: subsystem.type,
    PFD_avg: Number.NaN,
    SFF,
    DC,
    HFT: getLegacyHFT(subsystem),
    SIL: 0,
    RRF: 0,
    components,
  }
}

function mapEngineComponentResults(
  subsystem: SIFSubsystem,
  engineChannels: EngineResult['contributions']['sensors']['channelResults']
): ComponentCalcResult[] {
  const pfdByComponentId = new Map<string, number>()
  for (const channel of engineChannels) {
    for (const component of channel.componentResults) {
      pfdByComponentId.set(component.componentId, component.pfdavg)
    }
  }

  return subsystem.channels.flatMap(channel =>
    channel.components.map(component =>
      buildComponentCalcResult(component, pfdByComponentId.get(component.id) ?? Number.NaN)
    )
  )
}

function mapEngineSubsystemResult(
  subsystem: SIFSubsystem,
  engineSubsystem: EngineResult['contributions']['sensors']
): SubsystemCalcResult {
  const components = mapEngineComponentResults(subsystem, engineSubsystem.channelResults)
  const DC = components.length > 0
    ? components.reduce((sum, item) => sum + item.DC, 0) / components.length
    : 0

  return {
    subsystemId: subsystem.id,
    type: subsystem.type,
    PFD_avg: engineSubsystem.pfdavg,
    SFF: engineSubsystem.sff,
    DC,
    HFT: subsystem.architecture === 'custom'
      ? getLegacyHFT(subsystem)
      : engineSubsystem.hft,
    SIL: mergeSubsystemSIL(engineSubsystem.silFromPFD, engineSubsystem.silArchitectural),
    RRF: Number.isFinite(engineSubsystem.pfdavg) && engineSubsystem.pfdavg > 0
      ? 1 / engineSubsystem.pfdavg
      : 0,
    components,
  }
}

function approxSawtoothAtTime(avgPFD: number, time: number, interval: number): number {
  if (!isFinite(avgPFD) || avgPFD <= 0) return 1e-10
  if (interval <= 0) return Math.max(avgPFD, 1e-10)

  const peak = Math.max(avgPFD * 2, 1e-10)
  const phase = (time % interval) / interval
  return Math.max(peak * phase, 1e-10)
}

function getSubsystemChartInterval(subsystem: SIFSubsystem): number {
  const intervals = subsystem.channels.flatMap(channel =>
    channel.components.map(component => toHours(component.test.T1, component.test.T1Unit))
  ).filter(value => value > 0)

  return intervals.length > 0 ? Math.min(...intervals) : HOURS_PER_YEAR
}

function genChartData(sif: SIF, subsystemResults: SubsystemCalcResult[]): PFDChartPoint[] {
  const POINTS = 300
  const CYCLES = 3
  const intervals = sif.subsystems.map(getSubsystemChartInterval)
  const minTI = intervals.length > 0 ? Math.min(...intervals) : HOURS_PER_YEAR

  return Array.from({ length: POINTS + 1 }, (_, index) => {
    const time = (index / POINTS) * minTI * CYCLES
    const point: PFDChartPoint = {
      t: parseFloat((time / HOURS_PER_YEAR).toFixed(4)),
      total: 0,
    }

    sif.subsystems.forEach((subsystem, subsystemIndex) => {
      const avgPFD = subsystemResults[subsystemIndex]?.PFD_avg ?? Number.NaN
      const interval = getSubsystemChartInterval(subsystem)
      const value = approxSawtoothAtTime(avgPFD, time, interval)
      point[subsystem.id] = value
      point.total += value
    })

    point.total = Math.max(point.total, 1e-10)
    return point
  })
}

// ─── Legacy public API ────────────────────────────────────────────────────
export function calcSubsystemPFD(
  subsystem: SIFSubsystem,
  options?: CalcAdapterOptions
): SubsystemCalcResult {
  const syntheticSIF: SIF = {
    id: `synthetic-${subsystem.id}`,
    projectId: 'synthetic',
    sifNumber: 'SYNTHETIC',
    revision: 'A',
    title: subsystem.label,
    description: '',
    pid: '',
    location: '',
    processTag: '',
    hazardousEvent: '',
    demandRate: 0.1,
    targetSIL: 1,
    rrfRequired: 10,
    madeBy: '',
    verifiedBy: '',
    approvedBy: '',
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    subsystems: [subsystem],
    testCampaigns: [],
    operationalEvents: [],
  }

  return calcSIF(syntheticSIF, options).subsystems[0] ?? buildFallbackSubsystemResult(subsystem)
}

export function calcSIF(sif: SIF, options?: CalcAdapterOptions): SIFCalcResult {
  const key = standardToEngine(options?.projectStandard)
  const cached = getCached(calcCache, sif, key)
  if (cached) return cached

  const normalizedSIF = hydrateSIF(sif)
  const raw = calcSIFEngine(sif, options)
  const isValid = Number.isFinite(raw.pfdavg) && raw.pfdavg >= 0

  let result: SIFCalcResult

  if (!isValid) {
    const fallbackSubsystems = normalizedSIF.subsystems.map(buildFallbackSubsystemResult)
    result = {
      PFD_avg: Number.NaN,
      RRF: 0,
      SIL: 0,
      meetsTarget: false,
      subsystems: fallbackSubsystems,
      chartData: genChartData(normalizedSIF, fallbackSubsystems),
    }
  } else {
    const contributionByType = {
      sensor: raw.contributions.sensors,
      logic: raw.contributions.solver,
      actuator: raw.contributions.actuators,
    } as const

    const subsystemResults = normalizedSIF.subsystems.map(subsystem =>
      mapEngineSubsystemResult(subsystem, contributionByType[subsystem.type])
    )

    const achievedSIL = toLegacySIL(raw.silAchieved)
    result = {
      PFD_avg: raw.pfdavg,
      RRF: Number.isFinite(raw.rrf) ? raw.rrf : 0,
      SIL: achievedSIL,
      meetsTarget: achievedSIL >= sif.targetSIL,
      subsystems: subsystemResults,
      chartData: genChartData(normalizedSIF, subsystemResults),
    }
  }

  return setCached(calcCache, sif, key, result)
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
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return Math.round(v).toLocaleString('fr-FR')
}

export const formatPct = (v: number): string => `${(v * 100).toFixed(1)} %`
export const formatYr = (hr: number): string =>
  hr >= HOURS_PER_YEAR ? `${(hr / HOURS_PER_YEAR).toFixed(1)} yr` : `${hr} h`

export const logTickFormatter = (v: number): string =>
  `10${SUP(Math.round(Math.log10(v)))}`
