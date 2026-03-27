import { DEFAULT_COMPONENT } from '@/core/models/defaults'
import type { ComponentTemplate, ComponentTemplateExportEnvelope, ComponentTemplateUpsertInput } from '@/core/types'
import type { LibraryCollectionRecord } from '@/lib/libraryCollections'
import { parseComponentTemplateImport, serializeComponentTemplates } from '@/features/library'

const LIBRARY_COLLECTION_DOCUMENT_KIND = 'prism.library.collection'
const LIBRARY_COLLECTION_DOCUMENT_VERSION = 1

interface LibraryCollectionWorkspaceMeta {
  document_kind: typeof LIBRARY_COLLECTION_DOCUMENT_KIND
  version: typeof LIBRARY_COLLECTION_DOCUMENT_VERSION
  collection_id: string
}

interface LibraryCollectionWorkspaceCollection {
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stripJsonComments(raw: string): string {
  let result = ''
  let inString = false
  let escaped = false
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const next = raw[index + 1]

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false
        result += char
      }
      continue
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false
        index += 1
        continue
      }
      if (char === '\n') result += char
      continue
    }

    if (inString) {
      result += char
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') {
      inString = true
      result += char
      continue
    }

    if (char === '/' && next === '/') {
      inLineComment = true
      index += 1
      continue
    }
    if (char === '/' && next === '*') {
      inBlockComment = true
      index += 1
      continue
    }

    result += char
  }

  return result
}

function parseJsonc(raw: string): unknown {
  return JSON.parse(stripJsonComments(raw))
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
  return `${json}\n\n${buildLibraryCollectionCommentBlock(document.collection.name)}\n`
}

function parseLibraryCollectionWorkspaceSource(
  raw: string,
): { ok: true; document: LibraryCollectionWorkspaceDocument } | { ok: false; error: string } {
  let data: unknown
  try {
    data = parseJsonc(raw)
  } catch (error) {
    return {
      ok: false,
      error: `JSON invalide: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  if (!isRecord(data)) {
    return { ok: false, error: 'Le document JSON doit être un objet.' }
  }
  if (data.kind !== 'library_collection') {
    return { ok: false, error: 'Type de document JSON non supporté pour une collection Library.' }
  }

  return { ok: true, document: data as unknown as LibraryCollectionWorkspaceDocument }
}

export function validateLibraryCollectionWorkspaceSource(raw: string): string | null {
  const parsed = parseLibraryCollectionWorkspaceSource(raw)
  return parsed.ok ? null : parsed.error
}

export function formatLibraryCollectionWorkspaceSource(raw: string): { ok: true; formatted: string } | { ok: false; error: string } {
  const parsed = parseLibraryCollectionWorkspaceSource(raw)
  if (!parsed.ok) return parsed
  return { ok: true, formatted: serializeLibraryCollectionWorkspaceSource(parsed.document) }
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
  return {
    kind: 'library_collection',
    collection: {
      id: collection.id,
      name: collection.name,
      color: collection.color,
      scope: collection.scope,
      project_id: collection.projectId,
      project_name: projectName,
    },
    library_file: JSON.parse(
      serializeComponentTemplates(templates, ownerProfileId, collection.scope === 'project' ? collection.projectId : null),
    ) as ComponentTemplateExportEnvelope,
    _prism: {
      document_kind: LIBRARY_COLLECTION_DOCUMENT_KIND,
      version: LIBRARY_COLLECTION_DOCUMENT_VERSION,
      collection_id: collection.id,
    },
  }
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
    return { ok: false, error: 'Les métadonnées PRISM de cette collection sont invalides.' }
  }
  if (options?.expectedCollectionId && meta.collectionId !== options.expectedCollectionId) {
    return { ok: false, error: 'Ce document JSON ne correspond pas à la collection Library attendue.' }
  }

  const collection = normalizeCollection(data)
  if (!collection) {
    return { ok: false, error: 'Le bloc collection est incomplet ou invalide.' }
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(collection.color)) {
    return { ok: false, error: 'La couleur de collection doit être au format #RRGGBB.' }
  }

  const libraryFile = isRecord(data.library_file) ? data.library_file : null
  if (!libraryFile) {
    return { ok: false, error: 'Le bloc library_file est manquant.' }
  }

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
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Impossible de parser le contenu Library JSON.',
    }
  }
}
