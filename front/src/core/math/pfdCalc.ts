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
import { computeComponentPFD, computeComponentPFD_withPST } from '@/engine/pfd/component'
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
  PFDChartPoint, SubElement,
} from '@/core/types'
import { hydrateSIF } from '@/core/models/hydrate'
import { normalizeSubComponent, type NormalizedSubElement } from '@/core/models/subComponents'

const FIT = 1e-9
const HOURS_PER_YEAR = 8760
const DEFAULT_MISSION_TIME = 30 * HOURS_PER_YEAR

export interface CalcAdapterOptions {
  projectStandard?: Project['standard']
  missionTimeHours?: number
  curvePoints?: number
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

/**
 * Convert developed params (FIT) back to factorized params
 * ([h^-1 × 10^-6]). When one family is zero, keep the previous ratios to
 * avoid collapsing the factorized representation to misleading defaults.
 */
export function developedToFactorized(
  p: DevelopedParams,
  fallback?: FactorizedParams,
): FactorizedParams {
  const lambdaDU = fitToHr(p.lambda_DU)
  const lambdaDD = fitToHr(p.lambda_DD)
  const lambdaSU = fitToHr(p.lambda_SU)
  const lambdaSD = fitToHr(p.lambda_SD)

  const lambdaDangerous = lambdaDU + lambdaDD
  const lambdaSafe = lambdaSU + lambdaSD
  const lambdaTotal = lambdaDangerous + lambdaSafe

  const defaultLambdaDRatio = fallback?.lambdaDRatio ?? 0.25
  const defaultDCd = fallback?.DCd ?? 0.7
  const defaultDCs = fallback?.DCs ?? 1

  return {
    lambda: lambdaTotal / 1e-6,
    lambdaDRatio: lambdaTotal > 0 ? lambdaDangerous / lambdaTotal : defaultLambdaDRatio,
    DCd: lambdaDangerous > 0 ? lambdaDD / lambdaDangerous : defaultDCd,
    DCs: lambdaSafe > 0 ? lambdaSD / lambdaSafe : defaultDCs,
  }
}

/** Get effective developed params for a component, respecting param mode */
function sumDevelopedParams(base: DevelopedParams, extra: DevelopedParams): DevelopedParams {
  return {
    lambda_DU: base.lambda_DU + extra.lambda_DU,
    lambda_DD: base.lambda_DD + extra.lambda_DD,
    lambda_SU: base.lambda_SU + extra.lambda_SU,
    lambda_SD: base.lambda_SD + extra.lambda_SD,
  }
}

function developedFromComponentLike(
  component: Pick<SIFComponent, 'paramMode' | 'factorized' | 'developed'> | Pick<NormalizedSubElement, 'paramMode' | 'factorized' | 'developed'>
): DevelopedParams {
  return component.paramMode === 'developed'
    ? component.developed
    : factorizedToDeveloped(component.factorized)
}

export function getEffectiveDeveloped(component: SIFComponent): DevelopedParams | undefined {
  const base = developedFromComponentLike(component)

  return (component.subComponents ?? []).reduce(
    (acc, subComponent) => sumDevelopedParams(acc, developedFromComponentLike(normalizeSubComponent(component, subComponent))),
    base,
  )
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
  '1oo3': 2,
  '2oo4': 2,
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

function inferDeterminedCharacter(
  component: Pick<SIFComponent, 'determinedCharacter' | 'instrumentCategory'>,
  subsystemType: SIFComponent['subsystemType']
): EngineDeterminedCharacter {
  if (component.determinedCharacter) return component.determinedCharacter

  switch (subsystemType) {
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

type EngineComponentLike = Pick<
  SIFComponent,
  | 'id'
  | 'tagName'
  | 'description'
  | 'instrumentCategory'
  | 'instrumentType'
  | 'manufacturer'
  | 'dataSource'
  | 'determinedCharacter'
  | 'paramMode'
  | 'factorized'
  | 'developed'
  | 'test'
  | 'advanced'
>

function toEngineLeafComponent(
  component: EngineComponentLike,
  subsystemType: SIFComponent['subsystemType'],
  parentComponentId?: string
): EngineComponentParams {
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
    subsystemType === 'actuator' &&
    (component.test.testType === 'partial' || component.advanced.partialTest.enabled)

  return {
    id: component.id,
    tag: component.tagName,
    parentComponentId,
    description: component.description ?? '',
    type: mapSubsystemTypeToEngine(subsystemType),
    category: component.instrumentCategory,
    instrumentType: component.instrumentType,
    manufacturer: component.manufacturer,
    dataSource: component.dataSource,
    determinedCharacter: inferDeterminedCharacter(component, subsystemType),
    failureRate,
    MTTR: component.advanced.MTTR ?? 0,
    test: {
      type: proofTestType,
      T1: proofTestType === 'NONE' ? 0 : toHours(component.test.T1, component.test.T1Unit),
      T0: toHours(component.test.T0, component.test.T0Unit),
      sigma: component.advanced.sigma ?? 1,
      gamma: component.advanced.gamma ?? 0,
      pi: component.advanced.testDuration ?? 0,
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

function expandComponentPackage(component: SIFComponent): EngineComponentParams[] {
  return [
    toEngineLeafComponent(component, component.subsystemType),
    ...(component.subComponents ?? []).map(subComponent =>
      toEngineLeafComponent(normalizeSubComponent(component, subComponent), component.subsystemType, component.id),
    ),
  ]
}

function combineSeriesProbabilities(values: number[]): number {
  const simpleSum = values.reduce((sum, value) => sum + value, 0)
  if (simpleSum > 0.05) {
    return 1 - values.reduce((product, value) => product * (1 - value), 1)
  }
  return simpleSum
}

export function calcSubComponentPFDValue(parent: SIFComponent, subComponent: SubElement): number {
  const engineComponent = toEngineLeafComponent(
    normalizeSubComponent(parent, subComponent),
    parent.subsystemType,
    parent.id,
  )
  return engineComponent.partialStroke?.enabled
    ? computeComponentPFD_withPST(engineComponent)
    : computeComponentPFD(engineComponent)
}

export function calcComponentPFDValue(component: SIFComponent): number {
  const pfds = expandComponentPackage(component).map(engineComponent =>
    engineComponent.partialStroke?.enabled
      ? computeComponentPFD_withPST(engineComponent)
      : computeComponentPFD(engineComponent),
  )

  return combineSeriesProbabilities(pfds)
}

function toEngineChannel(channel: SIFSubsystem['channels'][number]): EngineChannelDef {
  return {
    id: channel.id,
    components: channel.components.flatMap(expandComponentPackage),
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
    architecture: subsystem.architecture,
    customExpression: subsystem.customBooleanArch?.expression,
    manualHFT: subsystem.customBooleanArch?.manualHFT,
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
    architecture: '1oo1',
  }
}

function resolveMissionTime(sif: SIF, overrideHours?: number): number {
  if (Number.isFinite(overrideHours) && (overrideHours ?? 0) > 0) {
    return overrideHours as number
  }

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

export function buildEngineInput(sif: SIF, options?: CalcAdapterOptions): EngineInput {
  const standard = standardToEngine(options?.projectStandard)
  const sensors = sif.subsystems.find(sub => sub.type === 'sensor')
  const logic = sif.subsystems.find(sub => sub.type === 'logic')
  const actuators = sif.subsystems.find(sub => sub.type === 'actuator')

  const engineSIF: EngineSIFDefinition = {
    id: sif.id,
    demandMode: sif.demandRate > 1 ? 'HIGH_DEMAND' : 'LOW_DEMAND',
    missionTime: resolveMissionTime(sif, options?.missionTimeHours),
    sensors: sensors ? toEngineSubsystem(sensors, standard) : makeNeutralSubsystem('sensor', standard),
    solver: logic
      ? ({
          mode: 'ADVANCED',
          channels: logic.channels.map(toEngineChannel),
          voting: architectureToVoting(logic),
          voteType: (logic.voteType ?? 'S') as EngineVoteType,
          ccf: normalizeCCF(logic),
          standard,
          architecture: logic.architecture,
          customExpression: logic.customBooleanArch?.expression,
          manualHFT: logic.customBooleanArch?.manualHFT,
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
      curvePoints: options?.curvePoints ?? 200,
    },
  }
}

function buildCalcCacheKey(options?: CalcAdapterOptions): string {
  const standard = standardToEngine(options?.projectStandard)
  const missionTime = Number.isFinite(options?.missionTimeHours) ? Math.round(options!.missionTimeHours!) : 'auto'
  const curvePoints = options?.curvePoints ?? 200
  return `${standard}|mt:${missionTime}|cp:${curvePoints}`
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
  const key = buildCalcCacheKey(options)
  const cached = getCached(engineCache, sif, key)
  if (cached) return cached

  const normalizedSIF = hydrateSIF(sif)
  const result = computeEngineSIF(buildEngineInput(normalizedSIF, options))
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

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 0.999999999)
}

function componentTestIntervalHours(component: SIFComponent): number {
  if (component.test.testType === 'none') return 0
  return toHours(component.test.T1, component.test.T1Unit)
}

function componentFirstTestHours(component: SIFComponent): number {
  return toHours(component.test.T0, component.test.T0Unit)
}

function getChartHorizon(sif: SIF, options?: CalcAdapterOptions): number {
  return resolveMissionTime(sif, options?.missionTimeHours)
}

function computePeriodicRamp(lambdaRate: number, time: number, T0: number, T1: number): number {
  if (!Number.isFinite(lambdaRate) || lambdaRate <= 0 || time <= 0) return 0
  if (!Number.isFinite(T1) || T1 <= 0) return lambdaRate * time

  const firstTest = Math.max(T0, 0)
  if (firstTest > 0 && time <= firstTest) {
    return lambdaRate * time
  }

  const phase = firstTest > 0
    ? (time - firstTest) % T1
    : time % T1

  return lambdaRate * Math.max(phase, 0)
}

function computeComponentChartPFD(component: SIFComponent, time: number, horizon: number): number {
  const effective = getEffectiveDeveloped(component)
  if (!effective) return 0

  const lambdaDU = fitToHr(effective.lambda_DU)
  const lambdaDD = fitToHr(effective.lambda_DD)
  const MTTR = component.advanced.MTTR ?? 0
  const ptc = Math.min(Math.max(component.advanced.proofTestCoverage ?? 1, 0), 1)
  const sigma = Math.min(Math.max(component.advanced.sigma ?? 1, 0), 1)
  const revealedFraction = Math.min(Math.max(ptc * sigma, 0), 1)
  const unrevealedFraction = Math.min(Math.max(1 - revealedFraction, 0), 1)
  const T1 = componentTestIntervalHours(component)
  const T0 = componentFirstTestHours(component)
  const lifetime = normalizeLifetime(component.advanced.lifetime) ?? horizon
  const pfdDetected = lambdaDD * MTTR
  const pfdRevealed = component.test.testType === 'none'
    ? lambdaDU * revealedFraction * time
    : computePeriodicRamp(lambdaDU * revealedFraction, time, T0, T1)
  const pfdUnrevealed = lambdaDU * unrevealedFraction * Math.min(time, lifetime)

  return clampProbability(pfdDetected + pfdRevealed + pfdUnrevealed)
}

function computeMooNUnavailability(channelPFDs: number[], M: number): number {
  if (channelPFDs.length === 0) return 0

  const N = channelPFDs.length
  const safeM = Math.min(Math.max(M, 1), N)
  let dp = Array<number>(N + 1).fill(0)
  dp[0] = 1

  for (const rawPfd of channelPFDs) {
    const pfd = clampProbability(rawPfd)
    const availability = 1 - pfd
    const next = Array<number>(N + 1).fill(0)

    for (let available = 0; available <= N; available++) {
      if (dp[available] === 0) continue
      next[available] += dp[available] * pfd
      if (available < N) {
        next[available + 1] += dp[available] * availability
      }
    }

    dp = next
  }

  let unavailable = 0
  for (let available = 0; available < safeM; available++) {
    unavailable += dp[available] ?? 0
  }

  return clampProbability(unavailable)
}

function computeSubsystemChartPFD(subsystem: SIFSubsystem, time: number, horizon: number): number {
  const voting = architectureToVoting(subsystem)
  const channelPFDs = subsystem.channels.map(channel =>
    channel.components.reduce((sum, component) => sum + computeComponentChartPFD(component, time, horizon), 0)
  )

  return computeMooNUnavailability(channelPFDs, voting.M)
}

function scaleSeriesToAverage(values: number[], targetAverage: number): number[] {
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)

  if (!Number.isFinite(targetAverage) || targetAverage <= 0) {
    return values.map(() => 1e-10)
  }
  if (!Number.isFinite(average) || average <= 0) {
    return values.map(() => Math.max(targetAverage, 1e-10))
  }

  const factor = targetAverage / average
  return values.map(value => Math.max(clampProbability(value * factor), 1e-10))
}

function genChartData(sif: SIF, subsystemResults: SubsystemCalcResult[], options?: CalcAdapterOptions): PFDChartPoint[] {
  const POINTS = options?.curvePoints ?? 300
  const horizon = getChartHorizon(sif, options)
  const times = Array.from({ length: POINTS + 1 }, (_, index) => (index / POINTS) * horizon)

  const seriesBySubsystem = sif.subsystems.map((subsystem, subsystemIndex) => {
    const rawSeries = times.map(time => computeSubsystemChartPFD(subsystem, time, horizon))
    const targetAverage = subsystemResults[subsystemIndex]?.PFD_avg ?? Number.NaN
    return scaleSeriesToAverage(rawSeries, targetAverage)
  })

  return times.map((time, index) => {
    const point: PFDChartPoint = {
      t: parseFloat((time / HOURS_PER_YEAR).toFixed(4)),
      total: 0,
    }

    sif.subsystems.forEach((subsystem, subsystemIndex) => {
      const value = seriesBySubsystem[subsystemIndex]?.[index] ?? 1e-10
      point[subsystem.id] = value
      point.total = 1 - (1 - point.total) * (1 - value)
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
    assumptions: [],
    testCampaigns: [],
    operationalEvents: [],
  }

  return calcSIF(syntheticSIF, options).subsystems[0] ?? buildFallbackSubsystemResult(subsystem)
}

export function calcSIF(sif: SIF, options?: CalcAdapterOptions): SIFCalcResult {
  const key = buildCalcCacheKey(options)
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
      chartData: genChartData(normalizedSIF, fallbackSubsystems, options),
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
      chartData: genChartData(normalizedSIF, subsystemResults, options),
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
