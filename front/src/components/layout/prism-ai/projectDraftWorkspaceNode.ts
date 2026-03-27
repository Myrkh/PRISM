import type { AIProjectDraftPreview } from '@/store/types'
import { useWorkspaceStore } from '@/store/workspaceStore'
import {
  deriveAIProjectDraftWorkspaceFilename,
  readAIProjectDraftWorkspaceMeta,
  serializeAIProjectDraftWorkspaceDocument,
} from './projectDraftWorkspaceJson'

export function findAIProjectDraftWorkspaceNodeId(messageId: string): string | null {
  const nodes = useWorkspaceStore.getState().nodes
  const match = Object.values(nodes).find(node => {
    if (node.type !== 'json') return false
    if (node.binding?.kind === 'ai_project_draft' && node.binding.messageId === messageId) return true
    if (node.schema !== 'prism_project_draft') return false
    return readAIProjectDraftWorkspaceMeta(node.content)?.messageId === messageId
  })
  return match?.id ?? null
}

export function ensureAIProjectDraftWorkspaceNode(preview: AIProjectDraftPreview): string {
  const existingNodeId = findAIProjectDraftWorkspaceNodeId(preview.messageId)
  if (existingNodeId) return existingNodeId

  return useWorkspaceStore.getState().createJsonNode(
    null,
    deriveAIProjectDraftWorkspaceFilename(preview),
    serializeAIProjectDraftWorkspaceDocument(preview),
    {
      schema: 'prism_project_draft',
      binding: { kind: 'ai_project_draft', messageId: preview.messageId },
    },
  )
}
