import { nanoid } from 'nanoid'
import { DEFAULT_COMPONENT } from '@/core/models/defaults'
import { COMPONENT_TEMPLATE_SCHEMA_VERSION } from '@/features/library/templateUtils'
import type {
  ComponentTemplate,
  ComponentTemplateReviewStatus,
  DeterminedCharacter,
  InstrumentCategory,
  NatureType,
  ParamMode,
  SubsystemType,
  TestType,
} from '@/core/types'
import type { LibraryCollectionWorkspaceCollection } from './libraryCollectionWorkspaceJson'

export type LibraryCollectionSpreadsheetColumnKind = 'text' | 'number' | 'boolean'
export type LibraryCollectionSpreadsheetCellState = 'normal' | 'warning' | 'error'

export interface LibraryCollectionSpreadsheetColumn {
  id: string
  title: string
  group: string
  width: number
  kind: LibraryCollectionSpreadsheetColumnKind
  required?: boolean
  advisory?: boolean
  options?: readonly string[]
  nullable?: boolean
}

const SUBSYSTEM_OPTIONS = ['sensor', 'logic', 'actuator'] as const
const REVIEW_STATUS_OPTIONS = ['draft', 'review', 'approved'] as const
const NATURE_OPTIONS = ['instrument', 'valve', 'relay', 'controller', 'other'] as const
const INSTRUMENT_CATEGORY_OPTIONS = ['transmitter', 'switch', 'valve', 'positioner', 'controller', 'relay', 'other'] as const
const DETERMINED_CHARACTER_OPTIONS = ['TYPE_A', 'TYPE_B', 'NON_TYPE_AB'] as const
const PARAM_MODE_OPTIONS = ['factorized', 'developed'] as const
const TEST_TYPE_OPTIONS = ['stopped', 'online', 'partial', 'none'] as const
const YEAR_HOUR_OPTIONS = ['hr', 'yr'] as const

export const LIBRARY_COLLECTION_SPREADSHEET_COLUMNS: readonly LibraryCollectionSpreadsheetColumn[] = [
  { id: 'name', title: 'Template', group: 'Meta', width: 240, kind: 'text', required: true },
  { id: 'reviewStatus', title: 'Review', group: 'Meta', width: 110, kind: 'text', required: true, options: REVIEW_STATUS_OPTIONS },
  { id: 'tags', title: 'Tags', group: 'Meta', width: 180, kind: 'text', advisory: true },
  { id: 'sourceReference', title: 'Source ref', group: 'Meta', width: 220, kind: 'text', advisory: true },

  { id: 'subsystemType', title: 'Subsystem', group: 'Identity', width: 110, kind: 'text', required: true, options: SUBSYSTEM_OPTIONS },
  { id: 'tagName', title: 'Tag', group: 'Identity', width: 140, kind: 'text', required: true },
  { id: 'nature', title: 'Nature', group: 'Identity', width: 120, kind: 'text', required: true, options: NATURE_OPTIONS },
  { id: 'instrumentCategory', title: 'Category', group: 'Identity', width: 130, kind: 'text', required: true, options: INSTRUMENT_CATEGORY_OPTIONS },
  { id: 'instrumentType', title: 'Instrument type', group: 'Identity', width: 180, kind: 'text', required: true },
  { id: 'manufacturer', title: 'Manufacturer', group: 'Identity', width: 160, kind: 'text', required: true },
  { id: 'dataSource', title: 'Data source', group: 'Identity', width: 160, kind: 'text', required: true },
  { id: 'description', title: 'Description', group: 'Identity', width: 240, kind: 'text' },
  { id: 'determinedCharacter', title: 'Character', group: 'Identity', width: 130, kind: 'text', required: true, options: DETERMINED_CHARACTER_OPTIONS },
  { id: 'paramMode', title: 'Param mode', group: 'Identity', width: 120, kind: 'text', required: true, options: PARAM_MODE_OPTIONS },

  { id: 'lambda', title: 'lambda', group: 'Factorized', width: 110, kind: 'number', required: true },
  { id: 'lambdaDRatio', title: 'lambdaD/lambda', group: 'Factorized', width: 130, kind: 'number', required: true },
  { id: 'DCd', title: 'DCd', group: 'Factorized', width: 90, kind: 'number', required: true },
  { id: 'DCs', title: 'DCs', group: 'Factorized', width: 90, kind: 'number', required: true },

  { id: 'lambda_DU', title: 'lambda_DU', group: 'Developed', width: 120, kind: 'number', required: true },
  { id: 'lambda_DD', title: 'lambda_DD', group: 'Developed', width: 120, kind: 'number', required: true },
  { id: 'lambda_SU', title: 'lambda_SU', group: 'Developed', width: 120, kind: 'number', required: true },
  { id: 'lambda_SD', title: 'lambda_SD', group: 'Developed', width: 120, kind: 'number', required: true },

  { id: 'testType', title: 'Test type', group: 'Test', width: 120, kind: 'text', required: true, options: TEST_TYPE_OPTIONS },
  { id: 'T1', title: 'T1', group: 'Test', width: 90, kind: 'number', required: true },
  { id: 'T1Unit', title: 'T1 unit', group: 'Test', width: 90, kind: 'text', required: true, options: YEAR_HOUR_OPTIONS },
  { id: 'T0', title: 'T0', group: 'Test', width: 90, kind: 'number', required: true },
  { id: 'T0Unit', title: 'T0 unit', group: 'Test', width: 90, kind: 'text', required: true, options: YEAR_HOUR_OPTIONS },

  { id: 'proofTestCoverage', title: 'PTC', group: 'Advanced', width: 110, kind: 'number', required: true },
  { id: 'MTTR', title: 'MTTR', group: 'Advanced', width: 90, kind: 'number', required: true },
  { id: 'lifetime', title: 'Lifetime', group: 'Advanced', width: 100, kind: 'number', nullable: true, advisory: true },
  { id: 'testDuration', title: 'Test duration', group: 'Advanced', width: 120, kind: 'number', required: true },
  { id: 'gamma', title: 'gamma', group: 'Advanced', width: 90, kind: 'number', required: true },
  { id: 'lambdaStar', title: 'lambda*', group: 'Advanced', width: 100, kind: 'number', required: true },
  { id: 'sigma', title: 'sigma', group: 'Advanced', width: 90, kind: 'number', required: true },
  { id: 'omega1', title: 'omega1', group: 'Advanced', width: 90, kind: 'number', required: true },
  { id: 'omega2', title: 'omega2', group: 'Advanced', width: 90, kind: 'number', required: true },
  { id: 'DCalarmedOnly', title: 'DC alarmed', group: 'Advanced', width: 120, kind: 'number', required: true },

  { id: 'partialEnabled', title: 'Enabled', group: 'Partial test', width: 90, kind: 'boolean' },
  { id: 'partialDuration', title: 'Duration', group: 'Partial test', width: 100, kind: 'number', required: true },
  { id: 'partialDetectedFaultsPct', title: 'Detected %', group: 'Partial test', width: 110, kind: 'number', required: true },
  { id: 'partialNumberOfTests', title: '# tests', group: 'Partial test', width: 90, kind: 'number', required: true },
] as const

function deepCloneTemplate(template: ComponentTemplate): ComponentTemplate {
  return JSON.parse(JSON.stringify(template)) as ComponentTemplate
}

function isOptionValue(options: readonly string[] | undefined, value: string) {
  return options ? options.includes(value) : true
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map(tag => tag.trim())
    .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index)
}

function parseNumericValue(value: string | number | boolean | null, nullable = false): number | null {
  if (value === null || value === '') return nullable ? null : Number.NaN
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : Number.NaN
}

function normalizeCollectionTemplateContext(
  template: ComponentTemplate,
  collection: Pick<LibraryCollectionWorkspaceCollection, 'name' | 'scope' | 'project_id'>,
): ComponentTemplate {
  template.libraryName = collection.name
  template.scope = collection.scope
  template.projectId = collection.scope === 'project' ? collection.project_id : null
  template.subsystemType = template.componentSnapshot.subsystemType
  template.instrumentCategory = template.componentSnapshot.instrumentCategory
  template.instrumentType = template.componentSnapshot.instrumentType
  template.manufacturer = template.componentSnapshot.manufacturer
  template.dataSource = template.componentSnapshot.dataSource
  template.description = template.componentSnapshot.description
  template.sourceReference = template.sourceReference ?? null
  template.reviewStatus = (template.reviewStatus ?? 'draft') as ComponentTemplateReviewStatus
  template.tags = Array.isArray(template.tags) ? template.tags : []
  template.templateSchemaVersion = template.templateSchemaVersion || COMPONENT_TEMPLATE_SCHEMA_VERSION
  template.templateVersion = template.templateVersion || 1
  template.ownerProfileId = template.ownerProfileId ?? null
  template.importBatchId = template.importBatchId ?? null
  template.origin = template.origin ?? 'database'
  template.archivedAt = template.archivedAt ?? null
  template.createdAt = template.createdAt ?? null
  template.updatedAt = template.updatedAt ?? null
  template.isArchived = Boolean(template.isArchived)
  return template
}

function buildDefaultSnapshot(subsystemType: SubsystemType, tagName: string) {
  const snapshot = DEFAULT_COMPONENT(subsystemType, tagName)
  return {
    ...snapshot,
    id: '',
  }
}

export function createLibraryCollectionSpreadsheetTemplate(
  collection: Pick<LibraryCollectionWorkspaceCollection, 'name' | 'scope' | 'project_id'>,
): ComponentTemplate {
  const componentSnapshot = buildDefaultSnapshot('sensor', 'LIB-S-XXX')
  return normalizeCollectionTemplateContext({
    id: '',
    ownerProfileId: null,
    projectId: collection.scope === 'project' ? collection.project_id : null,
    scope: collection.scope,
    origin: 'database',
    libraryName: collection.name,
    name: `Template ${nanoid(4).toUpperCase()}`,
    description: '',
    subsystemType: 'sensor',
    instrumentCategory: componentSnapshot.instrumentCategory,
    instrumentType: componentSnapshot.instrumentType,
    manufacturer: '',
    dataSource: '',
    sourceReference: null,
    tags: [],
    reviewStatus: 'draft',
    importBatchId: null,
    templateSchemaVersion: COMPONENT_TEMPLATE_SCHEMA_VERSION,
    templateVersion: 1,
    isArchived: false,
    archivedAt: null,
    createdAt: null,
    updatedAt: null,
    componentSnapshot: {
      ...componentSnapshot,
      manufacturer: '',
      dataSource: '',
      description: '',
    },
  }, collection)
}

export function getLibraryCollectionSpreadsheetValue(template: ComponentTemplate, columnId: string): string | number | boolean | null {
  switch (columnId) {
    case 'name': return template.name
    case 'reviewStatus': return template.reviewStatus
    case 'tags': return template.tags.join(', ')
    case 'sourceReference': return template.sourceReference ?? ''
    case 'subsystemType': return template.componentSnapshot.subsystemType
    case 'tagName': return template.componentSnapshot.tagName
    case 'nature': return template.componentSnapshot.nature
    case 'instrumentCategory': return template.componentSnapshot.instrumentCategory
    case 'instrumentType': return template.componentSnapshot.instrumentType
    case 'manufacturer': return template.componentSnapshot.manufacturer
    case 'dataSource': return template.componentSnapshot.dataSource
    case 'description': return template.componentSnapshot.description
    case 'determinedCharacter': return template.componentSnapshot.determinedCharacter
    case 'paramMode': return template.componentSnapshot.paramMode
    case 'lambda': return template.componentSnapshot.factorized.lambda
    case 'lambdaDRatio': return template.componentSnapshot.factorized.lambdaDRatio
    case 'DCd': return template.componentSnapshot.factorized.DCd
    case 'DCs': return template.componentSnapshot.factorized.DCs
    case 'lambda_DU': return template.componentSnapshot.developed.lambda_DU
    case 'lambda_DD': return template.componentSnapshot.developed.lambda_DD
    case 'lambda_SU': return template.componentSnapshot.developed.lambda_SU
    case 'lambda_SD': return template.componentSnapshot.developed.lambda_SD
    case 'testType': return template.componentSnapshot.test.testType
    case 'T1': return template.componentSnapshot.test.T1
    case 'T1Unit': return template.componentSnapshot.test.T1Unit
    case 'T0': return template.componentSnapshot.test.T0
    case 'T0Unit': return template.componentSnapshot.test.T0Unit
    case 'proofTestCoverage': return template.componentSnapshot.advanced.proofTestCoverage
    case 'MTTR': return template.componentSnapshot.advanced.MTTR
    case 'lifetime': return template.componentSnapshot.advanced.lifetime
    case 'testDuration': return template.componentSnapshot.advanced.testDuration
    case 'gamma': return template.componentSnapshot.advanced.gamma
    case 'lambdaStar': return template.componentSnapshot.advanced.lambdaStar
    case 'sigma': return template.componentSnapshot.advanced.sigma
    case 'omega1': return template.componentSnapshot.advanced.omega1
    case 'omega2': return template.componentSnapshot.advanced.omega2
    case 'DCalarmedOnly': return template.componentSnapshot.advanced.DCalarmedOnly
    case 'partialEnabled': return template.componentSnapshot.advanced.partialTest.enabled
    case 'partialDuration': return template.componentSnapshot.advanced.partialTest.duration
    case 'partialDetectedFaultsPct': return template.componentSnapshot.advanced.partialTest.detectedFaultsPct
    case 'partialNumberOfTests': return template.componentSnapshot.advanced.partialTest.numberOfTests
    default: return ''
  }
}

function rebuildSnapshotForSubsystemType(template: ComponentTemplate, nextValue: string) {
  if (!SUBSYSTEM_OPTIONS.includes(nextValue as SubsystemType)) {
    template.subsystemType = nextValue as SubsystemType
    template.componentSnapshot.subsystemType = nextValue as SubsystemType
    return
  }

  const currentSnapshot = template.componentSnapshot
  const rebuilt = buildDefaultSnapshot(nextValue as SubsystemType, currentSnapshot.tagName || 'LIB-TPL-001')
  template.componentSnapshot = {
    ...rebuilt,
    id: currentSnapshot.id,
    tagName: currentSnapshot.tagName || rebuilt.tagName,
    manufacturer: currentSnapshot.manufacturer,
    dataSource: currentSnapshot.dataSource,
    description: currentSnapshot.description,
  }
}

export function updateLibraryCollectionSpreadsheetTemplate(
  template: ComponentTemplate,
  columnId: string,
  value: string | number | boolean | null,
  collection: Pick<LibraryCollectionWorkspaceCollection, 'name' | 'scope' | 'project_id'>,
): ComponentTemplate {
  const next = deepCloneTemplate(template)

  switch (columnId) {
    case 'name':
      next.name = String(value ?? '')
      break
    case 'reviewStatus':
      next.reviewStatus = String(value ?? '') as ComponentTemplateReviewStatus
      break
    case 'tags':
      next.tags = parseTags(String(value ?? ''))
      break
    case 'sourceReference':
      next.sourceReference = String(value ?? '').trim() || null
      break
    case 'subsystemType':
      rebuildSnapshotForSubsystemType(next, String(value ?? ''))
      break
    case 'tagName':
      next.componentSnapshot.tagName = String(value ?? '')
      break
    case 'nature':
      next.componentSnapshot.nature = String(value ?? '') as NatureType
      break
    case 'instrumentCategory':
      next.componentSnapshot.instrumentCategory = String(value ?? '') as InstrumentCategory
      break
    case 'instrumentType':
      next.componentSnapshot.instrumentType = String(value ?? '')
      break
    case 'manufacturer':
      next.componentSnapshot.manufacturer = String(value ?? '')
      break
    case 'dataSource':
      next.componentSnapshot.dataSource = String(value ?? '')
      break
    case 'description':
      next.componentSnapshot.description = String(value ?? '')
      break
    case 'determinedCharacter':
      next.componentSnapshot.determinedCharacter = String(value ?? '') as DeterminedCharacter
      break
    case 'paramMode':
      next.componentSnapshot.paramMode = String(value ?? '') as ParamMode
      break
    case 'lambda':
      next.componentSnapshot.factorized.lambda = parseNumericValue(value) as number
      break
    case 'lambdaDRatio':
      next.componentSnapshot.factorized.lambdaDRatio = parseNumericValue(value) as number
      break
    case 'DCd':
      next.componentSnapshot.factorized.DCd = parseNumericValue(value) as number
      break
    case 'DCs':
      next.componentSnapshot.factorized.DCs = parseNumericValue(value) as number
      break
    case 'lambda_DU':
      next.componentSnapshot.developed.lambda_DU = parseNumericValue(value) as number
      break
    case 'lambda_DD':
      next.componentSnapshot.developed.lambda_DD = parseNumericValue(value) as number
      break
    case 'lambda_SU':
      next.componentSnapshot.developed.lambda_SU = parseNumericValue(value) as number
      break
    case 'lambda_SD':
      next.componentSnapshot.developed.lambda_SD = parseNumericValue(value) as number
      break
    case 'testType':
      next.componentSnapshot.test.testType = String(value ?? '') as TestType
      break
    case 'T1':
      next.componentSnapshot.test.T1 = parseNumericValue(value) as number
      break
    case 'T1Unit':
      next.componentSnapshot.test.T1Unit = String(value ?? '') as 'hr' | 'yr'
      break
    case 'T0':
      next.componentSnapshot.test.T0 = parseNumericValue(value) as number
      break
    case 'T0Unit':
      next.componentSnapshot.test.T0Unit = String(value ?? '') as 'hr' | 'yr'
      break
    case 'proofTestCoverage':
      next.componentSnapshot.advanced.proofTestCoverage = parseNumericValue(value) as number
      break
    case 'MTTR':
      next.componentSnapshot.advanced.MTTR = parseNumericValue(value) as number
      break
    case 'lifetime':
      next.componentSnapshot.advanced.lifetime = parseNumericValue(value, true)
      break
    case 'testDuration':
      next.componentSnapshot.advanced.testDuration = parseNumericValue(value) as number
      break
    case 'gamma':
      next.componentSnapshot.advanced.gamma = parseNumericValue(value) as number
      break
    case 'lambdaStar':
      next.componentSnapshot.advanced.lambdaStar = parseNumericValue(value) as number
      break
    case 'sigma':
      next.componentSnapshot.advanced.sigma = parseNumericValue(value) as number
      break
    case 'omega1':
      next.componentSnapshot.advanced.omega1 = parseNumericValue(value) as number
      break
    case 'omega2':
      next.componentSnapshot.advanced.omega2 = parseNumericValue(value) as number
      break
    case 'DCalarmedOnly':
      next.componentSnapshot.advanced.DCalarmedOnly = parseNumericValue(value) as number
      break
    case 'partialEnabled':
      next.componentSnapshot.advanced.partialTest.enabled = Boolean(value)
      break
    case 'partialDuration':
      next.componentSnapshot.advanced.partialTest.duration = parseNumericValue(value) as number
      break
    case 'partialDetectedFaultsPct':
      next.componentSnapshot.advanced.partialTest.detectedFaultsPct = parseNumericValue(value) as number
      break
    case 'partialNumberOfTests':
      next.componentSnapshot.advanced.partialTest.numberOfTests = parseNumericValue(value) as number
      break
    default:
      break
  }

  return normalizeCollectionTemplateContext(next, collection)
}

function isMissing(value: string | number | boolean | null): boolean {
  if (typeof value === 'string') return value.trim().length === 0
  return value === null || value === undefined
}

function isFiniteNumber(value: string | number | boolean | null): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRatioColumn(columnId: string) {
  return ['lambdaDRatio', 'DCd', 'DCs', 'proofTestCoverage', 'DCalarmedOnly', 'partialDetectedFaultsPct'].includes(columnId)
}

function isNonNegativeColumn(columnId: string) {
  return [
    'lambda', 'lambdaDRatio', 'DCd', 'DCs',
    'lambda_DU', 'lambda_DD', 'lambda_SU', 'lambda_SD',
    'T1', 'T0', 'proofTestCoverage', 'MTTR', 'lifetime', 'testDuration',
    'gamma', 'lambdaStar', 'sigma', 'omega1', 'omega2', 'DCalarmedOnly',
    'partialDuration', 'partialDetectedFaultsPct', 'partialNumberOfTests',
  ].includes(columnId)
}

export function getLibraryCollectionSpreadsheetCellState(
  template: ComponentTemplate,
  column: LibraryCollectionSpreadsheetColumn,
): LibraryCollectionSpreadsheetCellState {
  const value = getLibraryCollectionSpreadsheetValue(template, column.id)

  if (column.kind === 'text') {
    const text = String(value ?? '')
    if (column.required && isMissing(text)) return 'error'
    if (column.options && text.trim().length > 0 && !isOptionValue(column.options, text.trim())) return 'error'
    if (column.advisory && isMissing(text)) return 'warning'
    return 'normal'
  }

  if (column.kind === 'number') {
    if (column.nullable && value === null) return column.advisory ? 'warning' : 'normal'
    if (!isFiniteNumber(value)) return 'error'
    const numericValue = value as number
    if (isNonNegativeColumn(column.id) && numericValue < 0) return 'error'
    if (isRatioColumn(column.id) && (numericValue < 0 || numericValue > 1)) return 'error'
    return 'normal'
  }

  return 'normal'
}
