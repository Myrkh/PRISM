import { computeSIF, DEFAULT_OPTIONS } from '../src/engine/index'
import { computeSubsystemPFH } from '../src/engine/pfh/subsystem'
import { computeSubsystemPFD } from '../src/engine/pfd/subsystem'
import { makeDefaultComponentParams } from '../src/engine/resolver'
import type { ChannelDef, ComponentParams, SIFDefinition } from '../src/engine/types/engine'

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertClose(
  label: string,
  actual: number,
  expected: number,
  relTol = 1e-6,
  absTol = 1e-12
): void {
  const delta = Math.abs(actual - expected)
  const tolerance = Math.max(absTol, Math.abs(expected) * relTol)

  if (!Number.isFinite(actual) || delta > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}

function makeSimpleComp(
  id: string,
  lambdaDU: number,
  T1: number,
  lambdaDD = 0,
  MTTR = 8
): ComponentParams {
  return makeDefaultComponentParams({
    id,
    tag: id.toUpperCase(),
    failureRate: {
      mode: 'DEVELOPED',
      lambdaDU,
      lambdaDD,
      lambdaSU: 0,
      lambdaSD: 0,
    },
    MTTR,
    test: {
      type: 'STOPPED',
      T1,
      T0: 0,
      sigma: 1,
      gamma: 0,
      pi: 0,
      X: true,
      omega1: 0,
      omega2: 0,
      ptc: 1,
    },
  })
}

function makeChannel(id: string, components: ComponentParams[]): ChannelDef {
  return { id, components }
}

function makeBaseSIF(): SIFDefinition {
  const sensor = makeSimpleComp('sensor-1', 1e-6, 8760)
  const actuator = makeSimpleComp('actuator-1', 2e-6, 8760)

  return {
    id: 'smoke-sif',
    demandMode: 'LOW_DEMAND',
    missionTime: 10 * 8760,
    sensors: {
      channels: [makeChannel('s1', [sensor])],
      voting: { M: 1, N: 1 },
      voteType: 'S',
      ccf: { beta: 0, betaD: 0, method: 'MAX' },
    },
    solver: {
      mode: 'SIMPLE',
      pfd: 1e-4,
      pfh: 1e-8,
    },
    actuators: {
      channels: [makeChannel('a1', [actuator])],
      voting: { M: 1, N: 1 },
      voteType: 'S',
      ccf: { beta: 0, betaD: 0, method: 'MAX' },
    },
  }
}

function run(): void {
  const oneOoOne = computeSubsystemPFD({
    channels: [makeChannel('ch1', [makeSimpleComp('c1', 1e-6, 8760)])],
    voting: { M: 1, N: 1 },
    ccf: { beta: 0, betaD: 0, method: 'MAX' },
  })
  assertClose('1oo1 PFD', oneOoOne.pfdavg, 4.38e-3, 1e-9)

  const oneOoTwo = computeSubsystemPFD({
    channels: [
      makeChannel('ch1', [makeSimpleComp('c1', 1e-6, 8760)]),
      makeChannel('ch2', [makeSimpleComp('c2', 1e-6, 8760)]),
    ],
    voting: { M: 1, N: 2 },
    ccf: { beta: 0, betaD: 0, method: 'MAX' },
  })
  assertClose('1oo2 PFD', oneOoTwo.pfdavg, 2.562592e-5, 1e-6)

  const serialChannel = computeSubsystemPFD({
    channels: [
      makeChannel('ch1', [
        makeSimpleComp('c1', 1e-6, 8760),
        makeSimpleComp('c2', 2e-6, 8760),
      ]),
    ],
    voting: { M: 1, N: 1 },
    ccf: { beta: 0, betaD: 0, method: 'MAX' },
  })
  assertClose('Serie intra-channel PFD', serialChannel.pfdavg, 1.314e-2, 1e-9)

  const highDemand = computeSubsystemPFH({
    channels: [makeChannel('ch1', [makeSimpleComp('c1', 1e-6, 8760)])],
    voting: { M: 1, N: 1 },
    ccf: { beta: 0, betaD: 0, method: 'MAX' },
  })
  assertClose('1oo1 PFH', highDemand, 1e-6, 1e-9)

  const invalidSif = makeBaseSIF()
  invalidSif.sensors = {
    ...invalidSif.sensors,
    channels: [
      makeChannel('s1', [makeSimpleComp('sensor-a', 1e-6, 8760)]),
      makeChannel('s2', []),
    ],
    voting: { M: 1, N: 2 },
  }

  const invalidResult = computeSIF({
    sif: invalidSif,
    options: DEFAULT_OPTIONS,
  })
  assert(Number.isNaN(invalidResult.pfdavg), 'Invalid SIF should abort the computation')
  assert(
    invalidResult.warnings.some(warning => warning.code === 'EMPTY_CHANNEL'),
    'Invalid SIF should expose EMPTY_CHANNEL'
  )
  assert(
    invalidResult.warnings.some(warning => warning.code === 'CALCULATION_ABORTED'),
    'Invalid SIF should expose CALCULATION_ABORTED'
  )

  const voteTypeSif = makeBaseSIF()
  voteTypeSif.sensors = {
    ...voteTypeSif.sensors,
    channels: [
      makeChannel('s1', [makeSimpleComp('sensor-a', 1e-6, 8760)]),
      makeChannel('s2', [makeSimpleComp('sensor-b', 1e-6, 8760)]),
    ],
    voting: { M: 1, N: 2 },
    voteType: 'A',
  }

  const voteTypeResult = computeSIF({
    sif: voteTypeSif,
    options: DEFAULT_OPTIONS,
  })
  assert(
    voteTypeResult.warnings.some(warning => warning.code === 'VOTE_TYPE_APPROXIMATED'),
    'A/M vote types should emit an approximation warning'
  )

  console.log('engine smoke tests passed')
}

run()
