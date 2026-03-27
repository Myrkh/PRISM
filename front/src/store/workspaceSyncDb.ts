import { supabase } from '@/lib/supabase'
import type { PrismEditableFile } from './types'

export type WorkspaceNodeType = 'folder' | 'note' | 'pdf' | 'image' | 'json'

export interface WorkspaceNodeRow {
  user_id: string
  node_id: string
  node_type: WorkspaceNodeType
  parent_id: string | null
  sort_index: number
  name: string
  content: string | null
  storage_key: string | null
  collapsed: boolean
  json_schema: string | null
  binding: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export interface WorkspacePrismFileRow {
  user_id: string
  file_name: PrismEditableFile
  content: string
  updated_at?: string
}

export interface WorkspaceUserStateRow {
  user_id: string
  section_collapsed: boolean
  pinned_node_ids: string[]
  updated_at?: string
}

export interface LegacyWorkspaceTreeRow {
  data: unknown
  updated_at: string
}

export async function fetchWorkspaceNodeRows(userId: string): Promise<WorkspaceNodeRow[]> {
  const { data, error } = await supabase
    .from('workspace_nodes')
    .select('*')
    .eq('user_id', userId)
    .order('sort_index', { ascending: true })

  if (error) throw new Error(`workspace_nodes: ${error.message}`)
  return (data ?? []) as WorkspaceNodeRow[]
}

export async function fetchWorkspacePrismFileRows(userId: string): Promise<WorkspacePrismFileRow[]> {
  const { data, error } = await supabase
    .from('workspace_prism_files')
    .select('*')
    .eq('user_id', userId)

  if (error) throw new Error(`workspace_prism_files: ${error.message}`)
  return (data ?? []) as WorkspacePrismFileRow[]
}

export async function fetchWorkspaceUserStateRow(userId: string): Promise<WorkspaceUserStateRow | null> {
  const { data, error } = await supabase
    .from('workspace_user_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`workspace_user_state: ${error.message}`)
  return (data ?? null) as WorkspaceUserStateRow | null
}

export async function fetchLegacyWorkspaceTreeRow(userId: string): Promise<LegacyWorkspaceTreeRow | null> {
  const { data, error } = await supabase
    .from('workspace_tree')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`workspace_tree: ${error.message}`)
  return (data ?? null) as LegacyWorkspaceTreeRow | null
}

export async function listWorkspaceNodeIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('workspace_nodes')
    .select('node_id')
    .eq('user_id', userId)

  if (error) throw new Error(`workspace_nodes ids: ${error.message}`)
  return (data ?? []).map(row => String((row as { node_id: string }).node_id))
}

export async function upsertWorkspaceNodeRows(rows: WorkspaceNodeRow[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('workspace_nodes')
    .upsert(rows, { onConflict: 'user_id,node_id' })

  if (error) throw new Error(`workspace_nodes upsert: ${error.message}`)
}

export async function deleteWorkspaceNodeRows(userId: string, nodeIds: string[]): Promise<void> {
  if (nodeIds.length === 0) return
  const { error } = await supabase
    .from('workspace_nodes')
    .delete()
    .eq('user_id', userId)
    .in('node_id', nodeIds)

  if (error) throw new Error(`workspace_nodes delete: ${error.message}`)
}

export async function upsertWorkspacePrismFileRows(rows: WorkspacePrismFileRow[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from('workspace_prism_files')
    .upsert(rows, { onConflict: 'user_id,file_name' })

  if (error) throw new Error(`workspace_prism_files upsert: ${error.message}`)
}

export async function upsertWorkspaceUserStateRow(row: WorkspaceUserStateRow): Promise<void> {
  const { error } = await supabase
    .from('workspace_user_state')
    .upsert(row, { onConflict: 'user_id' })

  if (error) throw new Error(`workspace_user_state upsert: ${error.message}`)
}
