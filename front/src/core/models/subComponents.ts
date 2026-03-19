import { nanoid } from 'nanoid'
import type {
  AdvancedParams,
  DeterminedCharacter,
  DevelopedParams,
  InstrumentCategory,
  NatureType,
  ParamMode,
  SIFComponent,
  SubElement,
  TestParams,
} from '@/core/types'
import { DEFAULT_COMPONENT } from './defaults'

export type NormalizedSubElement = SubElement & {
  nature: NatureType
  instrumentCategory: InstrumentCategory
  dataSource: string
  description: string
  determinedCharacter: DeterminedCharacter
  paramMode: ParamMode
  developed: DevelopedParams
  test: TestParams
  advanced: AdvancedParams
}

function cloneAdvanced(advanced: AdvancedParams): AdvancedParams {
  return {
    ...advanced,
    partialTest: { ...advanced.partialTest },
  }
}

export function normalizeSubComponent(parent: SIFComponent, subComponent: SubElement): NormalizedSubElement {
  const fallback = DEFAULT_COMPONENT(parent.subsystemType, subComponent.tagName || `${parent.tagName}-SC`)

  return {
    id: subComponent.id || fallback.id,
    tagName: subComponent.tagName || fallback.tagName,
    label: subComponent.label || subComponent.instrumentType || fallback.instrumentType || 'Sous-composant',
    nature: subComponent.nature ?? fallback.nature,
    instrumentCategory: subComponent.instrumentCategory ?? fallback.instrumentCategory,
    instrumentType: subComponent.instrumentType || fallback.instrumentType,
    manufacturer: subComponent.manufacturer ?? fallback.manufacturer,
    dataSource: subComponent.dataSource ?? '',
    description: subComponent.description ?? '',
    determinedCharacter: subComponent.determinedCharacter ?? fallback.determinedCharacter,
    paramMode: subComponent.paramMode ?? fallback.paramMode,
    factorized: {
      ...fallback.factorized,
      ...subComponent.factorized,
    },
    developed: {
      ...fallback.developed,
      ...(subComponent.developed ?? {}),
    },
    test: {
      ...fallback.test,
      ...(subComponent.test ?? {}),
    },
    advanced: {
      ...cloneAdvanced(fallback.advanced),
      ...(subComponent.advanced ?? {}),
      partialTest: {
        ...fallback.advanced.partialTest,
        ...(subComponent.advanced?.partialTest ?? {}),
      },
    },
  }
}

export function createDefaultSubComponent(parent: SIFComponent, index: number): SubElement {
  const type = parent.instrumentType.toLowerCase()
  const valveLike =
    parent.subsystemType === 'actuator' ||
    parent.instrumentCategory === 'valve' ||
    type.includes('valve')

  const instrumentType = valveLike ? 'Solenoid valve' : 'Sub-component'
  const label = valveLike ? `Electrovanne ${index + 1}` : `Sous-composant ${index + 1}`
  const suffix = valveLike ? `SOV${index + 1}` : `SC${index + 1}`
  const base = DEFAULT_COMPONENT(parent.subsystemType, `${parent.tagName}-${suffix}`)

  return {
    id: nanoid(),
    tagName: `${parent.tagName}-${suffix}`,
    label,
    nature: base.nature,
    instrumentCategory: valveLike ? 'valve' : base.instrumentCategory,
    instrumentType,
    manufacturer: '',
    dataSource: '',
    description: '',
    determinedCharacter: base.determinedCharacter,
    paramMode: base.paramMode,
    factorized: { ...base.factorized },
    developed: { ...base.developed },
    test: { ...base.test },
    advanced: cloneAdvanced(base.advanced),
  }
}
