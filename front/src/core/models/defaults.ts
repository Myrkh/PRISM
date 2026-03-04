import { nanoid } from 'nanoid'
import type {
  SIFComponent, SIFChannel, SIFSubsystem, SIF, Project,
  SubsystemType, Architecture,
} from '@/core/types'

export const DEFAULT_COMPONENT = (subsystemType: SubsystemType, tagName: string): SIFComponent => ({
  id: nanoid(),
  tagName,
  nature: 'instrument',
  instrumentCategory: subsystemType === 'actuator' ? 'valve' : 'transmitter',
  instrumentType: subsystemType === 'sensor'
    ? 'Pressure transmitter'
    : subsystemType === 'logic'
    ? 'Safety PLC'
    : 'On-off valve',
  manufacturer: '',
  dataSource: '',
  description: '',
  subsystemType,
  paramMode: 'factorized',
  factorized: {
    lambda: 1.5,
    lambdaDRatio: 0.25,
    DCd: 0.70,
    DCs: 1.0,
  },
  developed: {
    lambda_DU: 112.5,
    lambda_DD: 262.5,
    lambda_SU: 0,
    lambda_SD: 1125,
  },
  test: {
    testType: 'stopped',
    T1: 1,
    T1Unit: 'yr',
    T0: 1,
    T0Unit: 'yr',
  },
  advanced: {
    MTTR: 96,
    gamma: 0,
    lambdaStar: 0,
    lambdaStarEqualToLambda: false,
    sigma: 1,
    omega1: 0,
    omega2: 0.01,
    proofTestCoverage: 1.0,
    lifetime: null,
    DCalarmedOnly: 0,
    partialTest: {
      enabled: false,
      duration: 0,
      detectedFaultsPct: 0.5,
      numberOfTests: 1,
    },
  },
})

export const DEFAULT_CHANNEL = (
  subsystemType: SubsystemType,
  channelIndex: number,
  sifNumber: string,
): SIFChannel => {
  const prefix = subsystemType === 'sensor' ? 'S' : subsystemType === 'logic' ? 'L' : 'A'
  const tagPrefix = `${sifNumber}_${prefix}${channelIndex + 1}.1`
  return {
    id: nanoid(),
    label: `Channel ${channelIndex + 1}`,
    components: [DEFAULT_COMPONENT(subsystemType, tagPrefix)],
  }
}

export const DEFAULT_SUBSYSTEM = (
  type: SubsystemType,
  sifNumber: string,
  architecture: Architecture = '1oo1',
): SIFSubsystem => {
  const labels: Record<SubsystemType, string> = {
    sensor: 'Sensor(s)',
    logic: 'Logic Solver',
    actuator: 'Actuator(s)',
  }
  const archChannelCount: Partial<Record<Architecture, number>> = {
    '1oo2': 2, '2oo2': 2, '2oo3': 3, '1oo2D': 2, 'custom': 2,
  }
  const channelCount = archChannelCount[architecture] ?? 1

  return {
    id: nanoid(),
    type,
    label: labels[type],
    architecture,
    channels: Array.from({ length: channelCount }, (_, i) =>
      DEFAULT_CHANNEL(type, i, sifNumber)
    ),
  }
}

export const DEFAULT_SIF = (projectId: string, sifNumber: string): SIF => ({
  id: nanoid(),
  projectId,
  sifNumber,
  revision: 'A',
  title: `SIF ${sifNumber}`,
  description: '',
  pid: '',
  location: '',
  processTag: '',
  hazardousEvent: '',
  demandRate: 0.1,
  targetSIL: 2,
  rrfRequired: 100,
  madeBy: '',
  verifiedBy: '',
  approvedBy: '',
  date: new Date().toISOString().split('T')[0],
  status: 'draft',
  subsystems: [
    DEFAULT_SUBSYSTEM('sensor',  sifNumber, '1oo1'),
    DEFAULT_SUBSYSTEM('logic',   sifNumber, '1oo1'),
    DEFAULT_SUBSYSTEM('actuator', sifNumber, '1oo1'),
  ],
  testCampaigns: [],
  operationalEvents: [],
})

export const DEFAULT_PROJECT = (): Project => ({
  id: nanoid(),
  name: '',
  ref: '',
  client: '',
  site: '',
  unit: '',
  standard: 'IEC61511',
  revision: 'A',
  description: '',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sifs: [],
})
