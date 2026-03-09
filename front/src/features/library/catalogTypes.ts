import type {
  ComponentTemplate,
  FactorizedParams,
  InstrumentCategory,
  SIFComponent,
  SubsystemType,
  TestParams,
} from '@/core/types'

export type LibraryPanelScope = 'builtin' | 'project' | 'user'

export interface BuiltinComponentSeed {
  id: string
  name: string
  description: string
  subsystemType: SubsystemType
  instrumentCategory: InstrumentCategory
  instrumentType: string
  manufacturer: string
  dataSource: string
  sourceReference?: string | null
  tags?: string[]
  factorized: Pick<FactorizedParams, 'lambda' | 'lambdaDRatio' | 'DCd' | 'DCs'>
  test: Pick<TestParams, 'T1' | 'T1Unit'>
  componentPatch?: Partial<SIFComponent>
}

export interface LibraryDragPayload {
  kind: 'component-template'
  template: ComponentTemplate
}
