import type { AISIFDraftPreview } from '@/store/types'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { deriveAISIFDraftWorkspaceFilename, readAISIFDraftWorkspaceMeta, serializeAISIFDraftWorkspaceDocument } from './sifDraftWorkspaceJson'

export function findAISIFDraftWorkspaceNodeId(messageId: string): string | null {
  const nodes = useWorkspaceStore.getState().nodes
  const match = Object.values(nodes).find(node => {
    if (node.type !== 'json') return false
    if (node.binding?.kind === 'ai_sif_draft' && node.binding.messageId === messageId) return true
    if (node.schema !== 'ai_sif_draft') return false
    return readAISIFDraftWorkspaceMeta(node.content)?.messageId === messageId
  })
  return match?.id ?? null
}

export function ensureAISIFDraftWorkspaceNode(preview: AISIFDraftPreview): string {
  const existingNodeId = findAISIFDraftWorkspaceNodeId(preview.messageId)
  if (existingNodeId) return existingNodeId

  return useWorkspaceStore.getState().createJsonNode(
    null,
    deriveAISIFDraftWorkspaceFilename(preview),
    serializeAISIFDraftWorkspaceDocument(preview),
    {
      schema: 'ai_sif_draft',
      binding: { kind: 'ai_sif_draft', messageId: preview.messageId },
    },
  )
}
