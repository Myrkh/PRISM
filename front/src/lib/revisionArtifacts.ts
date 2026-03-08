import { supabase } from './supabase'
import type { ProofTestCampaignArtifact, SIFRevisionArtifact } from '@/core/types'

type StoragePdfArtifact = SIFRevisionArtifact | ProofTestCampaignArtifact

export async function uploadRevisionArtifact(
  artifact: StoragePdfArtifact,
  blob: Blob,
): Promise<StoragePdfArtifact> {
  if (!artifact.path) {
    throw new Error('Revision artifact upload requires a storage path.')
  }

  const { error } = await supabase.storage
    .from(artifact.bucket)
    .upload(artifact.path, blob, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '3600',
    })

  if (error) {
    throw new Error(`Storage upload (${artifact.bucket}): ${error.message}`)
  }

  return {
    ...artifact,
    status: 'ready',
    generatedAt: new Date().toISOString(),
    error: null,
  }
}

export async function removeRevisionArtifact(artifact: StoragePdfArtifact): Promise<void> {
  if (!artifact.path) return

  const { error } = await supabase.storage
    .from(artifact.bucket)
    .remove([artifact.path])

  if (error) {
    console.error(`[PRISM] Failed to cleanup revision artifact ${artifact.bucket}/${artifact.path}:`, error)
  }
}

export async function downloadRevisionArtifact(artifact: StoragePdfArtifact): Promise<void> {
  if (!artifact.path || artifact.status !== 'ready') {
    throw new Error('This PDF is not available for download.')
  }

  const { data, error } = await supabase.storage
    .from(artifact.bucket)
    .download(artifact.path)

  if (error || !data) {
    throw new Error(`Storage download (${artifact.bucket}): ${error?.message ?? 'Unknown error'}`)
  }

  const url = URL.createObjectURL(data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = artifact.fileName ?? artifact.path.split('/').pop() ?? 'revision.pdf'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
