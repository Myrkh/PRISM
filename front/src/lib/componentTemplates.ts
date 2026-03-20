import { hydrateComponentSnapshot } from '@/core/models/hydrate'
import type { ComponentTemplate, ComponentTemplateUpsertInput, SubsystemType } from '@/core/types'
import {
  buildPersistedTemplateTags,
  COMPONENT_TEMPLATE_SCHEMA_VERSION,
  extractTemplateLibraryName,
  stripTemplateLibraryMetaTags,
} from '@/features/library/templateUtils'
import { supabase } from './supabase'

type TemplateRow = Record<string, unknown>

function isSubsystemType(value: unknown): value is SubsystemType {
  return value === 'sensor' || value === 'logic' || value === 'actuator'
}

function rowToComponentTemplate(row: TemplateRow): ComponentTemplate {
  const subsystemType = isSubsystemType(row.subsystem_type)
    ? row.subsystem_type
    : isSubsystemType((row.component_snapshot as Record<string, unknown> | null)?.subsystemType)
      ? (row.component_snapshot as Record<string, unknown>).subsystemType as SubsystemType
      : 'sensor'

  const componentSnapshot = hydrateComponentSnapshot(
    row.component_snapshot,
    subsystemType,
    typeof row.name === 'string' ? row.name : 'Component template',
  )
  const persistedTags = Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : []
  const libraryName = extractTemplateLibraryName(persistedTags)

  return {
    id: String(row.id),
    ownerProfileId: typeof row.owner_profile_id === 'string' ? row.owner_profile_id : null,
    projectId: typeof row.project_id === 'string' ? row.project_id : null,
    scope: row.scope === 'project' ? 'project' : row.scope === 'public' ? 'public' : row.scope === 'shared' ? 'shared' : 'user',
    origin: 'database',
    libraryName,
    name: typeof row.name === 'string' ? row.name : componentSnapshot.instrumentType,
    description: typeof row.description === 'string' ? row.description : '',
    subsystemType,
    instrumentCategory: componentSnapshot.instrumentCategory,
    instrumentType: typeof row.instrument_type === 'string' ? row.instrument_type : componentSnapshot.instrumentType,
    manufacturer: typeof row.manufacturer === 'string' ? row.manufacturer : componentSnapshot.manufacturer,
    dataSource: typeof row.data_source === 'string' ? row.data_source : componentSnapshot.dataSource,
    sourceReference: typeof row.source_reference === 'string' ? row.source_reference : null,
    tags: stripTemplateLibraryMetaTags(persistedTags),
    reviewStatus: row.review_status === 'approved'
      ? 'approved'
      : row.review_status === 'review'
        ? 'review'
        : row.review_status === 'archived'
          ? 'archived'
          : 'draft',
    importBatchId: typeof row.import_batch_id === 'string' ? row.import_batch_id : null,
    templateSchemaVersion: typeof row.template_schema_version === 'number'
      ? row.template_schema_version
      : COMPONENT_TEMPLATE_SCHEMA_VERSION,
    templateVersion: typeof row.template_version === 'number' ? row.template_version : 1,
    isArchived: Boolean(row.is_archived),
    archivedAt: typeof row.archived_at === 'string' ? row.archived_at : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
    componentSnapshot,
  }
}

function inputToRow(input: ComponentTemplateUpsertInput, ownerProfileId: string): Record<string, unknown> {
  const templateId = input.id ?? crypto.randomUUID()
  const subsystemType = input.componentSnapshot.subsystemType
  const componentSnapshot = hydrateComponentSnapshot(
    input.componentSnapshot,
    subsystemType,
    input.componentSnapshot.tagName || input.name,
  )
  const scope = input.scope === 'project' ? 'project' : 'user'

  return {
    id: templateId,
    owner_profile_id: ownerProfileId,
    project_id: scope === 'project' ? input.projectId ?? null : null,
    scope,
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    subsystem_type: subsystemType,
    instrument_category: componentSnapshot.instrumentCategory,
    instrument_type: componentSnapshot.instrumentType,
    manufacturer: componentSnapshot.manufacturer,
    data_source: componentSnapshot.dataSource,
    source_reference: input.sourceReference?.trim() || null,
    tags: buildPersistedTemplateTags((input.tags ?? []).map(tag => tag.trim()).filter(Boolean), input.libraryName),
    review_status: input.reviewStatus ?? 'draft',
    import_batch_id: input.importBatchId ?? null,
    template_schema_version: input.templateSchemaVersion ?? COMPONENT_TEMPLATE_SCHEMA_VERSION,
    template_version: input.templateVersion ?? 1,
    component_snapshot: componentSnapshot,
  }
}

export async function dbFetchComponentTemplates(includeArchived = false): Promise<ComponentTemplate[]> {
  let query = supabase
    .from('prism_component_templates')
    .select('*')
    .order('updated_at', { ascending: false })

  if (!includeArchived) {
    query = query.eq('is_archived', false)
  }

  const { data, error } = await query
  if (error) throw new Error(`Component templates: ${error.message}`)
  return (data ?? []).map(row => rowToComponentTemplate(row as TemplateRow))
}

export async function dbUpsertComponentTemplates(
  inputs: ComponentTemplateUpsertInput[],
): Promise<ComponentTemplate[]> {
  if (inputs.length === 0) return []

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw new Error(`Save component templates: ${userError.message}`)
  if (!user) throw new Error('Save component templates: no authenticated user')

  const rows = inputs.map(input => inputToRow(input, user.id))
  const { data, error } = await supabase
    .from('prism_component_templates')
    .upsert(rows, { onConflict: 'id' })
    .select('*')

  if (error) throw new Error(`Save component templates: ${error.message}`)
  return (data ?? []).map(row => rowToComponentTemplate(row as TemplateRow))
}

export async function dbSaveComponentTemplate(input: ComponentTemplateUpsertInput): Promise<ComponentTemplate> {
  const [template] = await dbUpsertComponentTemplates([input])
  if (!template) throw new Error('Save component template: empty response')
  return template
}

export async function dbArchiveComponentTemplate(templateId: string): Promise<ComponentTemplate> {
  const { data, error } = await supabase
    .from('prism_component_templates')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      review_status: 'archived',
    })
    .eq('id', templateId)
    .select('*')
    .single()

  if (error) throw new Error(`Archive component template: ${error.message}`)
  return rowToComponentTemplate(data as TemplateRow)
}

export async function dbDeleteComponentTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_component_templates')
    .delete()
    .eq('id', templateId)

  if (error) throw new Error(`Delete component template: ${error.message}`)
}
