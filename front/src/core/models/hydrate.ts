import { nanoid } from 'nanoid'
import {
  ARCHITECTURE_META,
  type Architecture,
  type BooleanGate,
  type CCFMethod,
  type DeterminedCharacter,
  type Project,
  type SIF,
  type SIFChannel,
  type SIFComponent,
  type SIFSubsystem,
  type SubsystemType,
  type VoteType,
} from '@/core/types'
import { DEFAULT_CHANNEL, DEFAULT_COMPONENT, DEFAULT_SUBSYSTEM } from './defaults'

type UnknownRecord = Record<string, unknown>

const ARCHITECTURES = new Set<Architecture>(['1oo1', '1oo2', '2oo2', '2oo3', '1oo2D', 'custom'])
const SUBSYSTEM_TYPES = new Set<SubsystemType>(['sensor', 'logic', 'actuator'])
const DETERMINED_CHARACTERS = new Set<DeterminedCharacter>(['TYPE_A', 'TYPE_B', 'NON_TYPE_AB'])
const VOTE_TYPES = new Set<VoteType>(['S', 'A', 'M'])
const CCF_METHODS = new Set<CCFMethod>(['MIN', 'MAX', 'AVERAGE', 'GEOMETRIC', 'QUADRATIC'])
const BOOLEAN_GATES = new Set<BooleanGate>(['AND', 'OR'])

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : null
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function isArchitecture(value: unknown): value is Architecture {
  return typeof value === 'string' && ARCHITECTURES.has(value as Architecture)
}

function isSubsystemType(value: unknown): value is SubsystemType {
  return typeof value === 'string' && SUBSYSTEM_TYPES.has(value as SubsystemType)
}

function isDeterminedCharacter(value: unknown): value is DeterminedCharacter {
  return typeof value === 'string' && DETERMINED_CHARACTERS.has(value as DeterminedCharacter)
}

function isVoteType(value: unknown): value is VoteType {
  return typeof value === 'string' && VOTE_TYPES.has(value as VoteType)
}

function isCCFMethod(value: unknown): value is CCFMethod {
  return typeof value === 'string' && CCF_METHODS.has(value as CCFMethod)
}

function isBooleanGate(value: unknown): value is BooleanGate {
  return typeof value === 'string' && BOOLEAN_GATES.has(value as BooleanGate)
}

function normalizeSifNumber(sifNumber: string): string {
  return sifNumber || `SIF-${nanoid(4).toUpperCase()}`
}

function componentTag(
  sifNumber: string,
  subsystemType: SubsystemType,
  channelIndex: number,
  componentIndex: number,
): string {
  const prefix = subsystemType === 'sensor' ? 'S' : subsystemType === 'logic' ? 'L' : 'A'
  return `${normalizeSifNumber(sifNumber)}_${prefix}${channelIndex + 1}.${componentIndex + 1}`
}

function hydrateComponent(
  rawComponent: unknown,
  subsystemType: SubsystemType,
  sifNumber: string,
  channelIndex: number,
  componentIndex: number,
): SIFComponent {
  const fallback = DEFAULT_COMPONENT(
    subsystemType,
    componentTag(sifNumber, subsystemType, channelIndex, componentIndex),
  )
  const source = asRecord(rawComponent)
  if (!source) return fallback

  const factorized = asRecord(source.factorized)
  const developed = asRecord(source.developed)
  const test = asRecord(source.test)
  const advanced = asRecord(source.advanced)
  const partialTest = asRecord(advanced?.partialTest)

  return {
    ...fallback,
    ...(source as Partial<SIFComponent>),
    id: typeof source.id === 'string' && source.id ? source.id : fallback.id,
    tagName: typeof source.tagName === 'string' && source.tagName ? source.tagName : fallback.tagName,
    subsystemType,
    determinedCharacter: isDeterminedCharacter(source.determinedCharacter)
      ? source.determinedCharacter
      : fallback.determinedCharacter,
    factorized: {
      ...fallback.factorized,
      ...(factorized ?? {}),
    },
    developed: {
      ...fallback.developed,
      ...(developed ?? {}),
    },
    test: {
      ...fallback.test,
      ...(test ?? {}),
    },
    advanced: {
      ...fallback.advanced,
      ...(advanced ?? {}),
      partialTest: {
        ...fallback.advanced.partialTest,
        ...(partialTest ?? {}),
      },
    },
  }
}

function hydrateChannel(
  rawChannel: unknown,
  subsystemType: SubsystemType,
  sifNumber: string,
  channelIndex: number,
): SIFChannel {
  const fallback = DEFAULT_CHANNEL(subsystemType, channelIndex, normalizeSifNumber(sifNumber))
  const source = asRecord(rawChannel)
  if (!source) return fallback

  const rawComponents = asArray(source.components)
  const components = rawComponents.length > 0
    ? rawComponents.map((component, componentIndex) =>
        hydrateComponent(component, subsystemType, sifNumber, channelIndex, componentIndex),
      )
    : fallback.components

  return {
    ...fallback,
    ...(source as Partial<SIFChannel>),
    id: typeof source.id === 'string' && source.id ? source.id : fallback.id,
    label: typeof source.label === 'string' && source.label ? source.label : fallback.label,
    components,
  }
}

function hydrateCustomBooleanArch(rawValue: unknown): SIFSubsystem['customBooleanArch'] {
  const source = asRecord(rawValue)
  const gate = isBooleanGate(source?.gate) ? source.gate : 'OR'

  return {
    gate,
    expression: typeof source?.expression === 'string' ? source.expression : '',
    manualHFT: typeof source?.manualHFT === 'number' ? source.manualHFT : gate === 'OR' ? 1 : 0,
  }
}

function hydrateSubsystem(rawSubsystem: unknown, sifNumber: string): SIFSubsystem | null {
  const source = asRecord(rawSubsystem)
  if (!source || !isSubsystemType(source.type)) return null

  const subsystemType = source.type
  const architecture = isArchitecture(source.architecture) ? source.architecture : '1oo1'
  const fallback = DEFAULT_SUBSYSTEM(subsystemType, normalizeSifNumber(sifNumber), architecture)
  const rawChannels = asArray(source.channels)
  const channelCount = Math.max(ARCHITECTURE_META[architecture].channels, rawChannels.length)
  const ccf = asRecord(source.ccf)

  const channels = Array.from({ length: channelCount }, (_, channelIndex) =>
    hydrateChannel(rawChannels[channelIndex], subsystemType, sifNumber, channelIndex),
  )

  return {
    ...fallback,
    ...(source as Partial<SIFSubsystem>),
    id: typeof source.id === 'string' && source.id ? source.id : fallback.id,
    type: subsystemType,
    label: typeof source.label === 'string' && source.label ? source.label : fallback.label,
    architecture,
    voteType: isVoteType(source.voteType) ? source.voteType : fallback.voteType,
    ccf: {
      ...fallback.ccf,
      ...(ccf ?? {}),
      method: isCCFMethod(ccf?.method) ? ccf.method : fallback.ccf.method,
    },
    channels,
    customBooleanArch: architecture === 'custom'
      ? hydrateCustomBooleanArch(source.customBooleanArch)
      : undefined,
  }
}

export function hydrateSIF(sif: SIF): SIF {
  return {
    ...sif,
    subsystems: asArray(sif.subsystems)
      .map(subsystem => hydrateSubsystem(subsystem, sif.sifNumber))
      .filter((subsystem): subsystem is SIFSubsystem => subsystem !== null),
  }
}

export function hydrateProject(project: Project): Project {
  return {
    ...project,
    sifs: asArray<SIF>(project.sifs).map(sif => hydrateSIF(sif)),
  }
}
