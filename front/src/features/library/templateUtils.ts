import { DEFAULT_COMPONENT } from '@/core/models/defaults'
import { hydrateComponentSnapshot } from '@/core/models/hydrate'
import type {
  ComponentTemplate,
  ComponentTemplateExportEnvelope,
  ComponentTemplateReviewStatus,
  ComponentTemplateScope,
  ComponentTemplateUpsertInput,
  SIFComponent,
  SubsystemType,
} from '@/core/types'
import type { BuiltinComponentSeed, LibraryDragPayload, LibraryPanelScope } from './catalogTypes'

export const COMPONENT_TEMPLATE_EXPORT_FORMAT = 'prism.component-templates'
export const COMPONENT_TEMPLATE_SCHEMA_VERSION = 1

const REVIEW_STATUSES = new Set<ComponentTemplateReviewStatus>(['draft', 'review', 'approved', 'archived'])
const TARGET_SCOPES = new Set<Extract<ComponentTemplateScope, 'project' | 'user'>>(['project', 'user'])

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : null
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(tag => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index)
}

function normalizeReviewStatus(value: unknown): ComponentTemplateReviewStatus {
  return typeof value === 'string' && REVIEW_STATUSES.has(value as ComponentTemplateReviewStatus)
    ? value as ComponentTemplateReviewStatus
    : 'draft'
}

function normalizeTargetScope(value: LibraryPanelScope): Extract<ComponentTemplateScope, 'project' | 'user'> {
  return value === 'project' ? 'project' : 'user'
}

const TEMPLATE_LIBRARY_TAG_PREFIX = 'library:'

function normalizeLibraryName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : null
}

function isTemplateLibraryTag(tag: string) {
  return tag.toLowerCase().startsWith(TEMPLATE_LIBRARY_TAG_PREFIX)
}

export function extractTemplateLibraryName(tags: string[]): string | null {
  const match = tags.find(tag => typeof tag === 'string' && isTemplateLibraryTag(tag))
  return normalizeLibraryName(match?.slice(TEMPLATE_LIBRARY_TAG_PREFIX.length))
}

export function stripTemplateLibraryMetaTags(tags: string[]): string[] {
  return normalizeTags(tags).filter(tag => !isTemplateLibraryTag(tag))
}

export function buildPersistedTemplateTags(tags: string[], libraryName?: string | null): string[] {
  const visibleTags = stripTemplateLibraryMetaTags(tags)
  const normalizedLibraryName = normalizeLibraryName(libraryName)
  return normalizedLibraryName
    ? normalizeTags([`${TEMPLATE_LIBRARY_TAG_PREFIX}${normalizedLibraryName}`, ...visibleTags])
    : visibleTags
}

export function getTemplateLibraryName(template: Pick<ComponentTemplate, 'tags'> & { libraryName?: string | null }): string | null {
  return normalizeLibraryName(template.libraryName) ?? extractTemplateLibraryName(template.tags)
}

function buildTemplateFallbackTag(subsystemType: SubsystemType, name: string): string {
  const prefix = subsystemType === 'sensor' ? 'S' : subsystemType === 'logic' ? 'L' : 'A'
  const stem = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16)
  return `${prefix}-TPL-${stem || 'COMP'}`
}

function normalizeImportedTemplate(rawTemplate: unknown): Omit<ComponentTemplateUpsertInput, 'scope' | 'projectId' | 'importBatchId'> {
  const source = asRecord(rawTemplate)
  const rawSnapshot = source?.componentSnapshot ?? rawTemplate
  const snapshotSource = asRecord(rawSnapshot)
  const subsystemType = asString(source?.subsystemType ?? snapshotSource?.subsystemType) as SubsystemType

  if (!subsystemType || !['sensor', 'logic', 'actuator'].includes(subsystemType)) {
    throw new Error('Template import: missing valid subsystemType')
  }

  const fallbackName = asString(source?.name) || asString(snapshotSource?.instrumentType) || `Imported ${subsystemType}`
  const componentSnapshot = hydrateComponentSnapshot(
    rawSnapshot,
    subsystemType,
    buildTemplateFallbackTag(subsystemType, fallbackName),
  )

  const reviewStatus = normalizeReviewStatus(source?.reviewStatus)
  const rawTags = normalizeTags(source?.tags)

  return {
    id: typeof source?.id === 'string' && source.id ? source.id : undefined,
    libraryName: normalizeLibraryName(source?.libraryName) ?? extractTemplateLibraryName(rawTags),
    name: fallbackName,
    description: asString(source?.description),
    sourceReference: typeof source?.sourceReference === 'string' ? source.sourceReference : null,
    tags: stripTemplateLibraryMetaTags(rawTags),
    reviewStatus: reviewStatus === 'archived' ? 'draft' : reviewStatus,
    templateSchemaVersion: typeof source?.templateSchemaVersion === 'number'
      ? source.templateSchemaVersion
      : COMPONENT_TEMPLATE_SCHEMA_VERSION,
    templateVersion: typeof source?.templateVersion === 'number' ? source.templateVersion : 1,
    componentSnapshot,
  }
}



type StarterComponentPatch = Omit<Partial<SIFComponent>, 'factorized' | 'developed' | 'test' | 'advanced'> & {
  factorized?: Partial<SIFComponent['factorized']>
  developed?: Partial<SIFComponent['developed']>
  test?: Partial<SIFComponent['test']>
  advanced?: Omit<Partial<SIFComponent['advanced']>, 'partialTest'> & {
    partialTest?: Partial<SIFComponent['advanced']['partialTest']>
  }
}

export const COMPONENT_TEMPLATE_IMPORT_MODEL_FILENAME = 'prism-component-templates.import-template.json'

function createStarterComponentSnapshot(
  subsystemType: SubsystemType,
  tagName: string,
  patch: StarterComponentPatch = {},
) {
  const base = DEFAULT_COMPONENT(subsystemType, tagName)
  const advancedPatch = patch.advanced ?? {}
  const partialTestPatch = advancedPatch.partialTest ?? {}

  const merged: SIFComponent = {
    ...base,
    ...patch,
    factorized: {
      ...base.factorized,
      ...(patch.factorized ?? {}),
    },
    developed: {
      ...base.developed,
      ...(patch.developed ?? {}),
    },
    test: {
      ...base.test,
      ...(patch.test ?? {}),
    },
    advanced: {
      ...base.advanced,
      ...advancedPatch,
      partialTest: {
        ...base.advanced.partialTest,
        ...partialTestPatch,
      },
    },
  }

  const { id: _ignoredId, ...snapshot } = merged
  return snapshot
}

function createStarterTemplates() {
  return [
    {
      name: 'Pressure transmitter — client starter',
      description: 'Exemple de capteur prêt à compléter pour une bibliothèque client.',
      subsystemType: 'sensor' as const,
      sourceReference: 'FMEDA PT-2026 / certificate ref to replace',
      tags: ['client-template', 'sensor', 'pressure', 'high-level'],
      reviewStatus: 'draft' as const,
      libraryName: 'Client starter library',
      componentSnapshot: createStarterComponentSnapshot('sensor', 'LIB-S-PT-001', {
        instrumentCategory: 'transmitter',
        instrumentType: 'Pressure transmitter',
        manufacturer: 'Acme Instruments',
        dataSource: 'FMEDA',
        description: 'High level pressure transmitter starter for client library.',
        factorized: {
          lambda: 1.8,
          lambdaDRatio: 0.42,
          DCd: 0.92,
          DCs: 1.0,
        },
        test: {
          testType: 'stopped',
          T1: 1,
          T1Unit: 'yr',
          T0: 1,
          T0Unit: 'yr',
        },
        advanced: {
          MTTR: 24,
          gamma: 0,
          lambdaStar: 0,
          lambdaStarEqualToLambda: false,
          testDuration: 0,
          sigma: 1,
          omega1: 0,
          omega2: 0.01,
          proofTestCoverage: 0.95,
          lifetime: 15,
          DCalarmedOnly: 0.1,
          partialTest: {
            enabled: false,
            duration: 0,
            detectedFaultsPct: 0.5,
            numberOfTests: 1,
          },
        },
      }),
    },
    {
      name: 'Safety PLC — client starter',
      description: 'Exemple de solveur logique réutilisable dans une bibliothèque projet ou client.',
      subsystemType: 'logic' as const,
      sourceReference: 'Safety PLC FMEDA / manufacturer manual to replace',
      tags: ['client-template', 'logic', 'plc', 'sis'],
      reviewStatus: 'draft' as const,
      libraryName: 'Client starter library',
      componentSnapshot: createStarterComponentSnapshot('logic', 'LIB-L-SIS-001', {
        instrumentCategory: 'controller',
        instrumentType: 'Safety PLC',
        manufacturer: 'Acme Automation',
        dataSource: 'Manufacturer',
        description: 'Safety logic solver starter for client library.',
        factorized: {
          lambda: 2.4,
          lambdaDRatio: 0.35,
          DCd: 0.96,
          DCs: 1.0,
        },
        test: {
          testType: 'online',
          T1: 1,
          T1Unit: 'yr',
          T0: 1,
          T0Unit: 'yr',
        },
        advanced: {
          MTTR: 12,
          gamma: 0,
          lambdaStar: 0,
          lambdaStarEqualToLambda: false,
          testDuration: 0,
          sigma: 1,
          omega1: 0,
          omega2: 0.005,
          proofTestCoverage: 0.98,
          lifetime: 15,
          DCalarmedOnly: 0.0,
          partialTest: {
            enabled: false,
            duration: 0,
            detectedFaultsPct: 0.5,
            numberOfTests: 1,
          },
        },
      }),
    },
    {
      name: 'On-off valve package — client starter',
      description: 'Exemple d’actionneur final avec paramètres de test et de diagnostic à relire.',
      subsystemType: 'actuator' as const,
      sourceReference: 'Valve package FMEDA / proof test note to replace',
      tags: ['client-template', 'actuator', 'valve', 'final-element'],
      reviewStatus: 'draft' as const,
      libraryName: 'Client starter library',
      componentSnapshot: createStarterComponentSnapshot('actuator', 'LIB-A-XV-001', {
        instrumentCategory: 'valve',
        instrumentType: 'On-off valve',
        manufacturer: 'Acme Valves',
        dataSource: 'FMEDA',
        description: 'Final element starter for client library.',
        factorized: {
          lambda: 3.2,
          lambdaDRatio: 0.62,
          DCd: 0.6,
          DCs: 1.0,
        },
        test: {
          testType: 'partial',
          T1: 1,
          T1Unit: 'yr',
          T0: 1,
          T0Unit: 'yr',
        },
        advanced: {
          MTTR: 48,
          gamma: 0,
          lambdaStar: 0,
          lambdaStarEqualToLambda: false,
          testDuration: 0,
          sigma: 1,
          omega1: 0,
          omega2: 0.02,
          proofTestCoverage: 0.9,
          lifetime: 12,
          DCalarmedOnly: 0.2,
          partialTest: {
            enabled: true,
            duration: 0,
            detectedFaultsPct: 0.6,
            numberOfTests: 4,
          },
        },
      }),
    },
  ]
}

export const COMPONENT_TEMPLATE_IMPORT_DOC_EXAMPLE = JSON.stringify(
  {
    format: COMPONENT_TEMPLATE_EXPORT_FORMAT,
    version: COMPONENT_TEMPLATE_SCHEMA_VERSION,
    exportedAt: '2026-03-20T00:00:00.000Z',
    exportedByProfileId: null,
    projectId: null,
    libraryName: 'Client starter library',
    templates: [createStarterTemplates()[0]],
  },
  null,
  2,
)

export function buildComponentTemplateImportStarter(): string {
  const payload = {
    format: COMPONENT_TEMPLATE_EXPORT_FORMAT,
    version: COMPONENT_TEMPLATE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedByProfileId: null,
    projectId: null,
    libraryName: 'Client starter library',
    templates: createStarterTemplates(),
  }

  return JSON.stringify(payload, null, 2)
}

export function instantiateComponentTemplate(template: ComponentTemplate, tagName: string): SIFComponent {
  const snapshot = hydrateComponentSnapshot(template.componentSnapshot, template.subsystemType, tagName)
  return {
    ...snapshot,
    id: crypto.randomUUID(),
    tagName,
    subsystemType: template.subsystemType,
  }
}

export function createBuiltinComponentTemplate(seed: BuiltinComponentSeed): ComponentTemplate {
  const componentSnapshot = hydrateComponentSnapshot({
    instrumentCategory: seed.instrumentCategory,
    instrumentType: seed.instrumentType,
    manufacturer: seed.manufacturer,
    dataSource: seed.dataSource,
    description: seed.description,
    factorized: seed.factorized,
    test: {
      testType: 'stopped',
      T0: seed.test.T1,
      T0Unit: seed.test.T1Unit,
      ...seed.test,
    },
    ...(seed.componentPatch ?? {}),
  }, seed.subsystemType, buildTemplateFallbackTag(seed.subsystemType, seed.name))

  return {
    id: seed.id,
    ownerProfileId: null,
    projectId: null,
    scope: 'public',
    origin: 'builtin',
    name: seed.name,
    description: seed.description,
    subsystemType: seed.subsystemType,
    libraryName: null,
    instrumentCategory: seed.instrumentCategory,
    instrumentType: seed.instrumentType,
    manufacturer: seed.manufacturer,
    dataSource: seed.dataSource,
    sourceReference: seed.sourceReference ?? null,
    tags: normalizeTags(seed.tags),
    reviewStatus: 'approved',
    importBatchId: null,
    templateSchemaVersion: COMPONENT_TEMPLATE_SCHEMA_VERSION,
    templateVersion: 1,
    isArchived: false,
    archivedAt: null,
    createdAt: null,
    updatedAt: null,
    componentSnapshot,
  }
}

export function buildLibraryDragPayload(template: ComponentTemplate): string {
  const payload: LibraryDragPayload = {
    kind: 'component-template',
    template,
  }
  return JSON.stringify(payload)
}

export function parseLibraryDragPayload(raw: string): ComponentTemplate | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    const payload = asRecord(parsed)
    if (payload?.kind !== 'component-template') return null
    const template = asRecord(payload.template)
    if (!template) return null

    const subsystemType = asString(template.subsystemType) as SubsystemType
    if (!['sensor', 'logic', 'actuator'].includes(subsystemType)) return null

    return {
      id: asString(template.id),
      ownerProfileId: typeof template.ownerProfileId === 'string' ? template.ownerProfileId : null,
      projectId: typeof template.projectId === 'string' ? template.projectId : null,
      scope: TARGET_SCOPES.has(template.scope as Extract<ComponentTemplateScope, 'project' | 'user'>)
        ? template.scope as ComponentTemplateScope
        : (template.scope === 'public' ? 'public' : 'user'),
      origin: template.origin === 'builtin' ? 'builtin' : 'database',
      name: asString(template.name),
      description: asString(template.description),
      subsystemType,
      libraryName: normalizeLibraryName(template.libraryName) ?? extractTemplateLibraryName(normalizeTags(template.tags)),
      instrumentCategory: asString(template.instrumentCategory) as ComponentTemplate['instrumentCategory'],
      instrumentType: asString(template.instrumentType),
      manufacturer: asString(template.manufacturer),
      dataSource: asString(template.dataSource),
      sourceReference: typeof template.sourceReference === 'string' ? template.sourceReference : null,
      tags: stripTemplateLibraryMetaTags(normalizeTags(template.tags)),
      reviewStatus: normalizeReviewStatus(template.reviewStatus),
      importBatchId: typeof template.importBatchId === 'string' ? template.importBatchId : null,
      templateSchemaVersion: typeof template.templateSchemaVersion === 'number'
        ? template.templateSchemaVersion
        : COMPONENT_TEMPLATE_SCHEMA_VERSION,
      templateVersion: typeof template.templateVersion === 'number' ? template.templateVersion : 1,
      isArchived: Boolean(template.isArchived),
      archivedAt: typeof template.archivedAt === 'string' ? template.archivedAt : null,
      createdAt: typeof template.createdAt === 'string' ? template.createdAt : null,
      updatedAt: typeof template.updatedAt === 'string' ? template.updatedAt : null,
      componentSnapshot: hydrateComponentSnapshot(
        template.componentSnapshot,
        subsystemType,
        buildTemplateFallbackTag(subsystemType, asString(template.name) || 'Component'),
      ),
    }
  } catch {
    return null
  }
}

export function serializeComponentTemplates(
  templates: ComponentTemplate[],
  profileId: string | null,
  projectId: string | null,
): string {
  const payload = {
    format: COMPONENT_TEMPLATE_EXPORT_FORMAT,
    version: COMPONENT_TEMPLATE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedByProfileId: profileId,
    projectId,
    templates,
  }
  return JSON.stringify(payload, null, 2)
}

export type ComponentTemplateImportIssueSeverity = 'error' | 'warning'
export type ComponentTemplateImportDecision = 'create' | 'update' | 'ignore'
export type ComponentTemplateImportDuplicateKind = 'id' | 'identity'

export type ComponentTemplateImportIssue = {
  severity: ComponentTemplateImportIssueSeverity
  code: string
  message: string
}

export type ComponentTemplateImportDuplicate = {
  id: string
  name: string
  kind: ComponentTemplateImportDuplicateKind
  scope: Extract<ComponentTemplateScope, 'project' | 'user'>
  projectId: string | null
  libraryName: string | null
}

export type ComponentTemplateImportPreviewEntry = {
  id: string
  index: number
  sourceName: string
  template: ComponentTemplateUpsertInput | null
  issues: ComponentTemplateImportIssue[]
  duplicate: ComponentTemplateImportDuplicate | null
  suggestedDecision: ComponentTemplateImportDecision
  availableDecisions: ComponentTemplateImportDecision[]
}

export type ComponentTemplateImportPreview = {
  format: string | null
  version: number | null
  libraryName: string | null
  entries: ComponentTemplateImportPreviewEntry[]
  globalIssues: ComponentTemplateImportIssue[]
}

function normalizeIdentityFragment(value: unknown): string {
  return asString(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function buildImportIdentityKey(template: Pick<ComponentTemplateUpsertInput, 'scope' | 'projectId' | 'libraryName' | 'name' | 'componentSnapshot'>): string {
  return [
    template.scope,
    template.projectId ?? '',
    normalizeLibraryName(template.libraryName) ?? '',
    template.componentSnapshot.subsystemType,
    normalizeIdentityFragment(template.name),
    normalizeIdentityFragment(template.componentSnapshot.instrumentType),
    normalizeIdentityFragment(template.componentSnapshot.manufacturer),
  ].join('|')
}

function buildExistingTemplateIdentityKey(template: Pick<ComponentTemplate, 'scope' | 'projectId' | 'libraryName' | 'tags' | 'name' | 'componentSnapshot'>): string {
  return [
    template.scope === 'project' ? 'project' : 'user',
    template.scope === 'project' ? template.projectId ?? '' : '',
    getTemplateLibraryName(template) ?? '',
    template.componentSnapshot.subsystemType,
    normalizeIdentityFragment(template.name),
    normalizeIdentityFragment(template.componentSnapshot.instrumentType),
    normalizeIdentityFragment(template.componentSnapshot.manufacturer),
  ].join('|')
}

function findImportDuplicate(
  template: ComponentTemplateUpsertInput,
  existingTemplates: ComponentTemplate[],
): ComponentTemplateImportDuplicate | null {
  const scopeTemplates = existingTemplates.filter(existing => {
    if (existing.scope !== template.scope) return false
    if (template.scope === 'project') return existing.projectId === template.projectId
    return true
  })

  const idMatch = template.id
    ? scopeTemplates.find(existing => existing.id === template.id) ?? null
    : null

  if (idMatch) {
    return {
      id: idMatch.id,
      name: idMatch.name,
      kind: 'id',
      scope: idMatch.scope === 'project' ? 'project' : 'user',
      projectId: idMatch.projectId ?? null,
      libraryName: getTemplateLibraryName(idMatch),
    }
  }

  const identity = buildImportIdentityKey(template)
  const identityMatch = scopeTemplates.find(existing => buildExistingTemplateIdentityKey(existing) === identity) ?? null
  if (!identityMatch) return null

  return {
    id: identityMatch.id,
    name: identityMatch.name,
    kind: 'identity',
    scope: identityMatch.scope === 'project' ? 'project' : 'user',
    projectId: identityMatch.projectId ?? null,
    libraryName: getTemplateLibraryName(identityMatch),
  }
}

function buildPreviewIssues(
  rawTemplate: unknown,
  duplicate: ComponentTemplateImportDuplicate | null,
  envelopeLibraryName: string | null,
): ComponentTemplateImportIssue[] {
  const issues: ComponentTemplateImportIssue[] = []
  const source = asRecord(rawTemplate)
  const rawSnapshot = source?.componentSnapshot ?? rawTemplate
  const snapshotSource = asRecord(rawSnapshot)
  const sourceName = asString(source?.name)
  const instrumentType = asString(snapshotSource?.instrumentType)
  const manufacturer = asString(snapshotSource?.manufacturer)
  const dataSource = asString(snapshotSource?.dataSource)
  const rawLibraryName = normalizeLibraryName(source?.libraryName) ?? extractTemplateLibraryName(normalizeTags(source?.tags))
  const sourceSubsystemType = asString(source?.subsystemType)
  const snapshotSubsystemType = asString(snapshotSource?.subsystemType)

  if (!sourceName.trim()) {
    issues.push({
      severity: 'warning',
      code: 'missing-name',
      message: 'Nom absent dans le JSON; un libellé de secours sera utilisé.',
    })
  }

  if (!instrumentType.trim()) {
    issues.push({
      severity: 'warning',
      code: 'missing-instrument-type',
      message: 'instrumentType absent; le template devra être revu avant usage.',
    })
  }

  if (!manufacturer.trim()) {
    issues.push({
      severity: 'warning',
      code: 'missing-manufacturer',
      message: 'Manufacturer non renseigné dans le JSON importé.',
    })
  }

  if (!dataSource.trim()) {
    issues.push({
      severity: 'warning',
      code: 'missing-data-source',
      message: 'Source de données absente; la traçabilité sera incomplète.',
    })
  }

  if (!rawLibraryName && !envelopeLibraryName) {
    issues.push({
      severity: 'warning',
      code: 'missing-library-name',
      message: 'Aucune bibliothèque nommée fournie; le template sera importé hors collection nommée.',
    })
  }

  if (
    sourceSubsystemType.trim()
    && snapshotSubsystemType.trim()
    && sourceSubsystemType.trim() !== snapshotSubsystemType.trim()
  ) {
    issues.push({
      severity: 'warning',
      code: 'subsystem-mismatch',
      message: 'Le subsystemType racine (' + sourceSubsystemType + ') diffère du componentSnapshot (' + snapshotSubsystemType + ').',
    })
  }

  if (typeof source?.reviewStatus === 'string' && normalizeReviewStatus(source.reviewStatus) !== source.reviewStatus) {
    issues.push({
      severity: 'warning',
      code: 'invalid-review-status',
      message: 'reviewStatus invalide; la valeur sera normalisée à Draft.',
    })
  }

  if (duplicate) {
    issues.push({
      severity: 'warning',
      code: 'duplicate',
      message: duplicate.kind === 'id'
        ? 'Un template existant porte déjà cet identifiant (' + duplicate.name + ').'
        : 'Un template similaire existe déjà dans la bibliothèque cible (' + duplicate.name + ').',
    })
  }

  return issues
}

export function analyzeComponentTemplateImport(
  text: string,
  targetScope: LibraryPanelScope,
  projectId: string | null,
  existingTemplates: ComponentTemplate[],
  defaultLibraryName?: string | null,
): ComponentTemplateImportPreview {
  const parsed = JSON.parse(text) as unknown
  const envelope = asRecord(parsed)

  const rawTemplates = Array.isArray(envelope?.templates)
    ? envelope.templates
    : Array.isArray(parsed)
      ? parsed
      : [parsed]

  const normalizedScope = normalizeTargetScope(targetScope)
  const normalizedProjectId = normalizedScope === 'project' ? projectId : null
  const envelopeLibraryName = normalizeLibraryName(envelope?.libraryName) ?? normalizeLibraryName(defaultLibraryName)
  const globalIssues: ComponentTemplateImportIssue[] = []

  if (normalizedScope === 'project' && !normalizedProjectId) {
    throw new Error('Template import: project scope requires a projectId')
  }

  if (typeof envelope?.format === 'string' && envelope.format !== COMPONENT_TEMPLATE_EXPORT_FORMAT) {
    globalIssues.push({
      severity: 'warning',
      code: 'unexpected-format',
      message: 'Format ' + envelope.format + ' détecté; le JSON sera interprété au mieux par PRISM.',
    })
  }

  if (typeof envelope?.version === 'number' && envelope.version > COMPONENT_TEMPLATE_SCHEMA_VERSION) {
    globalIssues.push({
      severity: 'warning',
      code: 'newer-version',
      message: 'Le JSON provient d’une version plus récente du schéma (' + envelope.version + ').',
    })
  }

  const entries = rawTemplates.map((rawTemplate, index): ComponentTemplateImportPreviewEntry => {
    const source = asRecord(rawTemplate)
    const rawSnapshot = source?.componentSnapshot ?? rawTemplate
    const snapshotSource = asRecord(rawSnapshot)
    const sourceName = asString(source?.name)
      || asString(snapshotSource?.instrumentType)
      || ('Template ' + (index + 1))

    try {
      const normalized = normalizeImportedTemplate(rawTemplate)
      const prepared: ComponentTemplateUpsertInput = {
        ...normalized,
        libraryName: normalized.libraryName ?? envelopeLibraryName,
        scope: normalizedScope,
        projectId: normalizedProjectId,
        importBatchId: null,
      }
      const duplicate = findImportDuplicate(prepared, existingTemplates)
      return {
        id: 'import:' + index,
        index,
        sourceName,
        template: prepared,
        duplicate,
        issues: buildPreviewIssues(rawTemplate, duplicate, envelopeLibraryName),
        suggestedDecision: duplicate ? 'update' : 'create',
        availableDecisions: duplicate ? ['update', 'create', 'ignore'] : ['create', 'ignore'],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Template import: invalid entry'
      return {
        id: 'import:' + index,
        index,
        sourceName,
        template: null,
        duplicate: null,
        issues: [{ severity: 'error', code: 'invalid-template', message }],
        suggestedDecision: 'ignore',
        availableDecisions: ['ignore'],
      }
    }
  })

  return {
    format: typeof envelope?.format === 'string' ? envelope.format : null,
    version: typeof envelope?.version === 'number' ? envelope.version : null,
    libraryName: envelopeLibraryName,
    entries,
    globalIssues,
  }
}

export function parseComponentTemplateImport(
  text: string,
  targetScope: LibraryPanelScope,
  projectId: string | null,
  defaultLibraryName?: string | null,
): ComponentTemplateUpsertInput[] {
  return analyzeComponentTemplateImport(text, targetScope, projectId, [], defaultLibraryName)
    .entries
    .flatMap(entry => (entry.template ? [entry.template] : []))
}

export function getTemplateCategoryLabel(template: Pick<ComponentTemplate, 'subsystemType' | 'instrumentCategory'>): string {
  const labels: Partial<Record<SubsystemType, Record<string, string>>> = {
    sensor: { transmitter: 'Transmetteur', switch: 'Switch' },
    logic: { controller: 'PLC Sécurité', relay: 'Relais' },
    actuator: { valve: 'Vanne', positioner: 'Positionneur', other: 'Équipement' },
  }
  return labels[template.subsystemType]?.[template.instrumentCategory] ?? template.instrumentCategory
}

export function getPanelScopeLabel(scope: LibraryPanelScope): string {
  if (scope === 'builtin') return 'Built-in'
  if (scope === 'project') return 'Project'
  return 'My Library'
}
