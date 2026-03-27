import { supabase } from './supabase'

export interface LibraryCollectionRecord {
  id: string
  ownerProfileId: string
  projectId: string | null
  scope: 'user' | 'project'
  name: string
  color: string
  position: number
  createdAt: string | null
  updatedAt: string | null
}

export interface CreateLibraryCollectionInput {
  ownerProfileId: string
  scope: 'user' | 'project'
  projectId?: string | null
  name: string
  color: string
  position: number
}

export interface UpdateLibraryCollectionInput {
  name?: string
  color?: string
  position?: number
}

type LibraryCollectionRow = Record<string, unknown>

function rowToLibraryCollection(row: LibraryCollectionRow): LibraryCollectionRecord {
  return {
    id: String(row.id),
    ownerProfileId: String(row.owner_profile_id),
    projectId: typeof row.project_id === 'string' ? row.project_id : null,
    scope: row.scope === 'project' ? 'project' : 'user',
    name: typeof row.name === 'string' ? row.name : 'Collection',
    color: typeof row.color === 'string' ? row.color : '#0284C7',
    position: typeof row.position === 'number' ? row.position : 0,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  }
}

export async function dbFetchLibraryCollections(ownerProfileId: string): Promise<LibraryCollectionRecord[]> {
  const { data, error } = await supabase
    .from('prism_library_collections')
    .select('*')
    .eq('owner_profile_id', ownerProfileId)
    .order('position', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Library collections: ${error.message}`)
  return (data ?? []).map(row => rowToLibraryCollection(row as LibraryCollectionRow))
}

export async function dbCreateLibraryCollection(input: CreateLibraryCollectionInput): Promise<LibraryCollectionRecord> {
  const { data, error } = await supabase
    .from('prism_library_collections')
    .insert({
      owner_profile_id: input.ownerProfileId,
      scope: input.scope,
      project_id: input.scope === 'project' ? input.projectId ?? null : null,
      name: input.name.trim(),
      color: input.color,
      position: input.position,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Create library collection: ${error.message}`)
  return rowToLibraryCollection(data as LibraryCollectionRow)
}

export async function dbUpdateLibraryCollection(
  collectionId: string,
  patch: UpdateLibraryCollectionInput,
): Promise<LibraryCollectionRecord> {
  const payload: Record<string, unknown> = {}
  if (typeof patch.name === 'string') payload.name = patch.name.trim()
  if (typeof patch.color === 'string') payload.color = patch.color
  if (typeof patch.position === 'number') payload.position = patch.position

  const { data, error } = await supabase
    .from('prism_library_collections')
    .update(payload)
    .eq('id', collectionId)
    .select('*')
    .single()

  if (error) throw new Error(`Update library collection: ${error.message}`)
  return rowToLibraryCollection(data as LibraryCollectionRow)
}

export async function dbDeleteLibraryCollection(collectionId: string): Promise<void> {
  const { error } = await supabase
    .from('prism_library_collections')
    .delete()
    .eq('id', collectionId)

  if (error) throw new Error(`Delete library collection: ${error.message}`)
}
