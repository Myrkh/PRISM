import { getLocation, parse as parseJsonc, printParseErrorCode, type ParseError } from 'jsonc-parser'
import { DEFAULT_COMPONENT } from '@/core/models/defaults'
import type { ComponentTemplate, ComponentTemplateExportEnvelope, ComponentTemplateUpsertInput } from '@/core/types'
import { COMPONENT_TEMPLATE_SCHEMA_VERSION, parseComponentTemplateImport, serializeComponentTemplates } from '@/features/library'
import type { LibraryCollectionRecord } from '@/lib/libraryCollections'

const LIBRARY_COLLECTION_DOCUMENT_KIND = 'prism.library.collection'
const LIBRARY_COLLECTION_DOCUMENT_VERSION = 1

interface LibraryCollectionWorkspaceMeta {
  document_kind: typeof LIBRARY_COLLECTION_DOCUMENT_KIND
  version: typeof LIBRARY_COLLECTION_DOCUMENT_VERSION
  collection_id: string
}

export interface LibraryCollectionWorkspaceCollection {
  id: string
  name: string
  color: string
  scope: 'user' | 'project'
  project_id: string | null
  project_name: string | null
}

export interface LibraryCollectionWorkspaceDocument {
  kind: 'library_collection'
  collection: LibraryCollectionWorkspaceCollection
  library_file: ComponentTemplateExportEnvelope
  _prism: LibraryCollectionWorkspaceMeta
}

export interface LibraryCollectionWorkspaceMetaInfo {
  collectionId: string
}

export interface ParsedLibraryCollectionWorkspaceDocument {
  collectionId: string
  collection: LibraryCollectionWorkspaceCollection
  templateInputs: ComponentTemplateUpsertInput[]
  templates: ComponentTemplate[]
  exportedByProfileId: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function buildJsoncErrorMessage(raw: string, error: ParseError): string {
  const location = getLocation(raw, error.offset)
  const beforeOffset = raw.slice(0, error.offset)
  const line = beforeOffset.split('\n').length
  const column = beforeOffset.length - beforeOffset.lastIndexOf('\n')
  const pathHint = location.path.length > 0 ? ` · ${location.path.join('.')}` : ''
  return `JSONC invalide: ${printParseErrorCode(error.error)} (ligne ${line}, colonne ${column}${pathHint}).`
}

function parseLibraryCollectionJsonc(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const errors: ParseError[] = []
  const value = parseJsonc(raw, errors, { allowTrailingComma: true, disallowComments: false })
  if (errors.length > 0) {
    return { ok: false, error: buildJsoncErrorMessage(raw, errors[0]) }
  }
  return { ok: true, value }
}

function readWorkspaceMeta(value: unknown): LibraryCollectionWorkspaceMetaInfo | null {
  if (!isRecord(value)) return null
  const meta = isRecord(value._prism) ? value._prism : null
  if (!meta) return null
  if (meta.document_kind !== LIBRARY_COLLECTION_DOCUMENT_KIND) return null
  if (meta.version !== LIBRARY_COLLECTION_DOCUMENT_VERSION) return null
  const collectionId = typeof meta.collection_id === 'string' ? meta.collection_id.trim() : ''
  return collectionId ? { collectionId } : null
}

function normalizeCollection(value: unknown): LibraryCollectionWorkspaceCollection | null {
  if (!isRecord(value)) return null
  const collection = isRecord(value.collection) ? value.collection : null
  if (!collection) return null

  const id = typeof collection.id === 'string' ? collection.id.trim() : ''
  const name = typeof collection.name === 'string' ? collection.name.trim() : ''
  const color = typeof collection.color === 'string' ? collection.color.trim() : ''
  const scope = collection.scope === 'project' ? 'project' : 'user'
  const projectId = typeof collection.project_id === 'string' && collection.project_id.trim()
    ? collection.project_id.trim()
    : null
  const projectName = typeof collection.project_name === 'string' && collection.project_name.trim()
    ? collection.project_name.trim()
    : null

  if (!id || !name || !color) return null
  return { id, name, color, scope, project_id: projectId, project_name: projectName }
}

function buildLibraryCollectionTemplateExample(collectionName: string): Record<string, unknown> {
  const defaultComponent = DEFAULT_COMPONENT('sensor', 'LIB-S-PT-001')
  const { id: _ignoredId, ...componentSnapshot } = defaultComponent
  return {
    name: 'Nom du template composant',
    description: 'Description du template composant',
    libraryName: collectionName,
    subsystemType: 'sensor',
    sourceReference: 'Source / FMEDA / certificat / note interne',
    tags: ['tag-1', 'tag-2'],
    reviewStatus: 'draft',
    componentSnapshot: {
      ...componentSnapshot,
      tagName: 'LIB-S-XXX',
      instrumentType: 'Type instrument',
      manufacturer: 'Fabricant',
      dataSource: 'FMEDA | SIL certificate | expert judgment',
      description: 'Description du composant',
    },
  }
}

function buildLibraryCollectionCommentBlock(collectionName: string): string {
  const example = JSON.stringify(buildLibraryCollectionTemplateExample(collectionName), null, 2)
  return [
    '/*',
    'EXEMPLE DE TEMPLATE PRISM',
    'Ce bloc est volontairement commente: il est ignore par l import, l application et le bouton Save.',
    'Duplique cet objet dans library_file.templates, puis remplace les valeurs par les vraies donnees du composant.',
    'Le format ci-dessous correspond a une entree unique du tableau library_file.templates.',
    '',
    example,
    '*/',
  ].join('\n')
}

function serializeLibraryCollectionWorkspaceSource(document: LibraryCollectionWorkspaceDocument): string {
  const json = JSON.stringify(document, null, 2)
  return `${json}

${buildLibraryCollectionCommentBlock(document.collection.name)}
`
}

function normalizeTemplateForCollection(
  template: ComponentTemplate,
  collection: Pick<LibraryCollectionWorkspaceCollection, 'name' | 'scope' | 'project_id'>,
): ComponentTemplate {
  const next = JSON.parse(JSON.stringify(template)) as ComponentTemplate
  next.projectId = collection.scope === 'project' ? collection.project_id : null
  next.scope = collection.scope
  next.origin = 'database'
  next.libraryName = collection.name
  next.subsystemType = next.componentSnapshot.subsystemType
  next.instrumentCategory = next.componentSnapshot.instrumentCategory
  next.instrumentType = next.componentSnapshot.instrumentType
  next.manufacturer = next.componentSnapshot.manufacturer
  next.dataSource = next.componentSnapshot.dataSource
  next.description = next.componentSnapshot.description ?? next.description ?? ''
  next.sourceReference = next.sourceReference ?? null
  next.tags = Array.isArray(next.tags) ? next.tags : []
  next.reviewStatus = next.reviewStatus ?? 'draft'
  next.importBatchId = next.importBatchId ?? null
  next.templateSchemaVersion = next.templateSchemaVersion || COMPONENT_TEMPLATE_SCHEMA_VERSION
  next.templateVersion = next.templateVersion || 1
  next.isArchived = false
  next.archivedAt = null
  next.createdAt = next.createdAt ?? null
  next.updatedAt = next.updatedAt ?? null
  return next
}

function templateInputToEditableTemplate(
  input: ComponentTemplateUpsertInput,
  collection: Pick<LibraryCollectionWorkspaceCollection, 'name' | 'scope' | 'project_id'>,
  exportedByProfileId: string | null,
): ComponentTemplate {
  const componentSnapshot = JSON.parse(JSON.stringify(input.componentSnapshot)) as ComponentTemplate['componentSnapshot']
  return normalizeTemplateForCollection(
    {
      id: input.id ?? '',
      ownerProfileId: exportedByProfileId,
      projectId: collection.scope === 'project' ? collection.project_id : null,
      scope: collection.scope,
      origin: 'database',
      libraryName: collection.name,
      name: input.name,
      description: input.description ?? '',
      subsystemType: componentSnapshot.subsystemType,
      instrumentCategory: componentSnapshot.instrumentCategory,
      instrumentType: componentSnapshot.instrumentType,
      manufacturer: componentSnapshot.manufacturer,
      dataSource: componentSnapshot.dataSource,
      sourceReference: input.sourceReference ?? null,
      tags: [...(input.tags ?? [])],
      reviewStatus: input.reviewStatus ?? 'draft',
      importBatchId: input.importBatchId ?? null,
      templateSchemaVersion: input.templateSchemaVersion ?? COMPONENT_TEMPLATE_SCHEMA_VERSION,
      templateVersion: input.templateVersion ?? 1,
      isArchived: false,
      archivedAt: null,
      createdAt: null,
      updatedAt: null,
      componentSnapshot,
    },
    collection,
  )
}

function buildWorkspaceCollection(collection: LibraryCollectionRecord, projectName: string | null): LibraryCollectionWorkspaceCollection {
  return {
    id: collection.id,
    name: collection.name,
    color: collection.color,
    scope: collection.scope,
    project_id: collection.projectId,
    project_name: projectName,
  }
}

function buildLibraryCollectionWorkspaceSourceDocument(input: {
  collection: LibraryCollectionWorkspaceCollection
  templates: ComponentTemplate[]
  exportedByProfileId: string | null
}): LibraryCollectionWorkspaceDocument {
  const normalizedTemplates = input.templates.map(template => normalizeTemplateForCollection(template, input.collection))
  return {
    kind: 'library_collection',
    collection: input.collection,
    library_file: JSON.parse(
      serializeComponentTemplates(
        normalizedTemplates,
        input.exportedByProfileId,
        input.collection.scope === 'project' ? input.collection.project_id : null,
      ),
    ) as ComponentTemplateExportEnvelope,
    _prism: {
      document_kind: LIBRARY_COLLECTION_DOCUMENT_KIND,
      version: LIBRARY_COLLECTION_DOCUMENT_VERSION,
      collection_id: input.collection.id,
    },
  }
}

function parseLibraryCollectionWorkspaceSource(
  raw: string,
): { ok: true; document: LibraryCollectionWorkspaceDocument } | { ok: false; error: string } {
  const parsed = parseLibraryCollectionJsonc(raw)
  if (!parsed.ok) return parsed

  if (!isRecord(parsed.value)) {
    return { ok: false, error: 'Le document JSON doit etre un objet.' }
  }
  if (parsed.value.kind !== 'library_collection') {
    return { ok: false, error: 'Type de document JSON non supporte pour une collection Library.' }
  }

  return { ok: true, document: parsed.value as unknown as LibraryCollectionWorkspaceDocument }
}

export function validateLibraryCollectionWorkspaceSource(raw: string): string | null {
  const parsed = parseLibraryCollectionWorkspaceSource(raw)
  return parsed.ok ? null : parsed.error
}

export function formatLibraryCollectionWorkspaceSource(raw: string): { ok: true; formatted: string } | { ok: false; error: string } {
  const parsed = parseLibraryCollectionWorkspaceDocument(raw)
  if (!parsed.ok) return parsed
  return {
    ok: true,
    formatted: serializeLibraryCollectionWorkspaceSourceDocument({
      collection: parsed.value.collection,
      templates: parsed.value.templates,
      exportedByProfileId: parsed.value.exportedByProfileId,
    }),
  }
}

export function deriveLibraryCollectionWorkspaceFilename(collectionName: string): string {
  const stem = collectionName
    .trim()
    .replace(/[^a-zA-Z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${stem || 'library-collection'}.json`
}

export function buildLibraryCollectionWorkspaceDocument(
  collection: LibraryCollectionRecord,
  templates: ComponentTemplate[],
  ownerProfileId: string | null,
  projectName: string | null,
): LibraryCollectionWorkspaceDocument {
  return buildLibraryCollectionWorkspaceSourceDocument({
    collection: buildWorkspaceCollection(collection, projectName),
    templates,
    exportedByProfileId: ownerProfileId,
  })
}

export function serializeLibraryCollectionWorkspaceSourceDocument(input: {
  collection: LibraryCollectionWorkspaceCollection
  templates: ComponentTemplate[]
  exportedByProfileId: string | null
}): string {
  return serializeLibraryCollectionWorkspaceSource(
    buildLibraryCollectionWorkspaceSourceDocument(input),
  )
}

export function serializeLibraryCollectionWorkspaceDocument(
  collection: LibraryCollectionRecord,
  templates: ComponentTemplate[],
  ownerProfileId: string | null,
  projectName: string | null,
): string {
  return serializeLibraryCollectionWorkspaceSource(
    buildLibraryCollectionWorkspaceDocument(collection, templates, ownerProfileId, projectName),
  )
}

export function readLibraryCollectionWorkspaceMeta(raw: string): LibraryCollectionWorkspaceMetaInfo | null {
  const parsed = parseLibraryCollectionWorkspaceSource(raw)
  if (!parsed.ok) return null
  return readWorkspaceMeta(parsed.document)
}

export function parseLibraryCollectionWorkspaceDocument(
  raw: string,
  options?: { expectedCollectionId?: string },
): { ok: true; value: ParsedLibraryCollectionWorkspaceDocument } | { ok: false; error: string } {
  const source = parseLibraryCollectionWorkspaceSource(raw)
  if (!source.ok) return source
  const data = source.document

  const meta = readWorkspaceMeta(data)
  if (!meta) {
    return { ok: false, error: 'Les metadonnees PRISM de cette collection sont invalides.' }
  }
  if (options?.expectedCollectionId && meta.collectionId !== options.expectedCollectionId) {
    return { ok: false, error: 'Ce document JSON ne correspond pas a la collection Library attendue.' }
  }

  const collection = normalizeCollection(data)
  if (!collection) {
    return { ok: false, error: 'Le bloc collection est incomplet ou invalide.' }
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(collection.color)) {
    return { ok: false, error: 'La couleur de collection doit etre au format #RRGGBB.' }
  }

  const libraryFile = isRecord(data.library_file) ? data.library_file : null
  if (!libraryFile) {
    return { ok: false, error: 'Le bloc library_file est manquant.' }
  }

  const exportedByProfileId = typeof libraryFile.exportedByProfileId === 'string'
    ? libraryFile.exportedByProfileId
    : null

  try {
    const templateInputs = parseComponentTemplateImport(
      JSON.stringify(libraryFile),
      collection.scope,
      collection.scope === 'project' ? collection.project_id : null,
      collection.name,
    )
    return {
      ok: true,
      value: {
        collectionId: meta.collectionId,
        collection,
        templateInputs,
        templates: templateInputs.map(template => templateInputToEditableTemplate(template, collection, exportedByProfileId)),
        exportedByProfileId,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Impossible de parser le contenu Library JSON.',
    }
  }
}
