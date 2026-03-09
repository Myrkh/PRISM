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

  return {
    id: typeof source?.id === 'string' && source.id ? source.id : undefined,
    name: fallbackName,
    description: asString(source?.description),
    sourceReference: typeof source?.sourceReference === 'string' ? source.sourceReference : null,
    tags: normalizeTags(source?.tags),
    reviewStatus: reviewStatus === 'archived' ? 'draft' : reviewStatus,
    templateSchemaVersion: typeof source?.templateSchemaVersion === 'number'
      ? source.templateSchemaVersion
      : COMPONENT_TEMPLATE_SCHEMA_VERSION,
    templateVersion: typeof source?.templateVersion === 'number' ? source.templateVersion : 1,
    componentSnapshot,
  }
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
      instrumentCategory: asString(template.instrumentCategory) as ComponentTemplate['instrumentCategory'],
      instrumentType: asString(template.instrumentType),
      manufacturer: asString(template.manufacturer),
      dataSource: asString(template.dataSource),
      sourceReference: typeof template.sourceReference === 'string' ? template.sourceReference : null,
      tags: normalizeTags(template.tags),
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
  const payload: ComponentTemplateExportEnvelope = {
    format: COMPONENT_TEMPLATE_EXPORT_FORMAT,
    version: COMPONENT_TEMPLATE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedByProfileId: profileId,
    projectId,
    templates,
  }
  return JSON.stringify(payload, null, 2)
}

export function parseComponentTemplateImport(
  text: string,
  targetScope: LibraryPanelScope,
  projectId: string | null,
): ComponentTemplateUpsertInput[] {
  const parsed = JSON.parse(text) as unknown
  const envelope = asRecord(parsed)

  const rawTemplates = Array.isArray(envelope?.templates)
    ? envelope.templates
    : Array.isArray(parsed)
      ? parsed
      : [parsed]

  const normalizedScope = normalizeTargetScope(targetScope)
  const normalizedProjectId = normalizedScope === 'project' ? projectId : null

  if (normalizedScope === 'project' && !normalizedProjectId) {
    throw new Error('Template import: project scope requires a projectId')
  }

  return rawTemplates.map(rawTemplate => ({
    ...normalizeImportedTemplate(rawTemplate),
    scope: normalizedScope,
    projectId: normalizedProjectId,
    importBatchId: null,
  }))
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
