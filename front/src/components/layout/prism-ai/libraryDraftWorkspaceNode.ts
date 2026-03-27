import type { AILibraryDraftPreview } from '@/store/types'
import { useWorkspaceStore } from '@/store/workspaceStore'
import {
  deriveAILibraryDraftWorkspaceFilename,
  readAILibraryDraftWorkspaceMeta,
  serializeAILibraryDraftWorkspaceDocument,
} from './libraryDraftWorkspaceJson'

export function findAILibraryDraftWorkspaceNodeId(messageId: string): string | null {
  const nodes = useWorkspaceStore.getState().nodes
  const match = Object.values(nodes).find(node => {
    if (node.type !== 'json') return false
    if (node.binding?.kind === 'ai_library_draft' && node.binding.messageId === messageId) return true
    if (node.schema !== 'prism_library_draft') return false
    return readAILibraryDraftWorkspaceMeta(node.content)?.messageId === messageId
  })
  return match?.id ?? null
}

export function ensureAILibraryDraftWorkspaceNode(preview: AILibraryDraftPreview): string {
  const existingNodeId = findAILibraryDraftWorkspaceNodeId(preview.messageId)
  if (existingNodeId) return existingNodeId

  return useWorkspaceStore.getState().createJsonNode(
    null,
    deriveAILibraryDraftWorkspaceFilename(preview),
    serializeAILibraryDraftWorkspaceDocument(preview),
    {
      schema: 'prism_library_draft',
      binding: { kind: 'ai_library_draft', messageId: preview.messageId },
    },
  )
}
