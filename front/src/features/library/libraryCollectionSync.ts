import type { ComponentTemplate, ComponentTemplateUpsertInput } from '@/core/types'
import { getTemplateLibraryName } from './templateUtils'
import type { LibraryCollectionRecord } from '@/lib/libraryCollections'

export function componentTemplateToUpsertInput(
  template: ComponentTemplate,
  overrides: Partial<ComponentTemplateUpsertInput> = {},
): ComponentTemplateUpsertInput {
  return {
    id: template.id,
    scope: template.scope === 'project' ? 'project' : 'user',
    projectId: template.scope === 'project' ? template.projectId ?? null : null,
    libraryName: template.libraryName ?? null,
    name: template.name,
    description: template.description,
    sourceReference: template.sourceReference,
    tags: [...template.tags],
    reviewStatus: template.reviewStatus === 'review' || template.reviewStatus === 'approved'
      ? template.reviewStatus
      : 'draft',
    importBatchId: template.importBatchId,
    templateSchemaVersion: template.templateSchemaVersion,
    templateVersion: template.templateVersion,
    componentSnapshot: JSON.parse(JSON.stringify(template.componentSnapshot)) as ComponentTemplate['componentSnapshot'],
    ...overrides,
  }
}

export function matchesCollectionScope(template: ComponentTemplate, collection: Pick<LibraryCollectionRecord, 'scope' | 'projectId'>): boolean {
  if (collection.scope === 'project') {
    return template.scope === 'project' && template.projectId === collection.projectId
  }
  return template.scope === 'user'
}

export function belongsToLibraryCollection(
  template: ComponentTemplate,
  collection: Pick<LibraryCollectionRecord, 'scope' | 'projectId' | 'name'>,
): boolean {
  return matchesCollectionScope(template, collection) && getTemplateLibraryName(template) === collection.name
}

export function getTemplatesForLibraryCollection(
  templates: ComponentTemplate[],
  collection: Pick<LibraryCollectionRecord, 'scope' | 'projectId' | 'name'>,
): ComponentTemplate[] {
  return templates.filter(template => belongsToLibraryCollection(template, collection))
}

export function buildRetargetInputsForLibraryCollection(
  templates: ComponentTemplate[],
  collection: Pick<LibraryCollectionRecord, 'scope' | 'projectId' | 'name'>,
  nextLibraryName: string | null,
): ComponentTemplateUpsertInput[] {
  return getTemplatesForLibraryCollection(templates, collection).map(template => componentTemplateToUpsertInput(template, {
    libraryName: nextLibraryName,
  }))
}

export function applyCollectionNameToImportedTemplates(
  templates: ComponentTemplateUpsertInput[],
  collection: Pick<LibraryCollectionRecord, 'scope' | 'projectId' | 'name'>,
): ComponentTemplateUpsertInput[] {
  return templates.map(template => ({
    ...template,
    scope: collection.scope,
    projectId: collection.scope === 'project' ? collection.projectId ?? null : null,
    libraryName: collection.name,
  }))
}
