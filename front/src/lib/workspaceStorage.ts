/**
 * lib/workspaceStorage.ts
 *
 * Supabase Storage helpers for workspace binary files (PDF, images).
 * Bucket: workspace-files
 * Path pattern: {userId}/{nodeId}/{filename}
 */
import { supabase } from './supabase'

const BUCKET = 'workspace-files'

/** Upload a file and return the storage key (path within the bucket). */
export async function uploadWorkspaceFile(
  userId: string,
  nodeId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const key = `${userId}/${nodeId}/${nodeId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`[PRISM] Upload failed: ${error.message}`)
  return key
}

/** Get a short-lived signed URL to view/download a file (1 hour). */
export async function getWorkspaceFileUrl(storageKey: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storageKey, 3600)

  if (error || !data?.signedUrl) {
    throw new Error(`[PRISM] Signed URL failed: ${error?.message ?? 'no URL'}`)
  }
  return data.signedUrl
}

/** Delete a file from storage (called when a node is deleted). */
export async function deleteWorkspaceFile(storageKey: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storageKey])
}
