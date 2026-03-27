import { useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import {
  ensureAILibraryDraftWorkspaceNode,
  findAILibraryDraftWorkspaceNodeId,
} from '@/components/layout/prism-ai/libraryDraftWorkspaceNode'
import { LibraryTemplateParamsPanel } from './LibraryTemplateParamsPanel'

export function AILibraryDraftInspector() {
  const preview = useAppStore(state => state.aiLibraryDraftPreview)
  const applyPreview = useAppStore(state => state.applyAILibraryDraftPreview)
  const discardPreview = useAppStore(state => state.discardAILibraryDraftPreview)
  const navigate = useAppStore(state => state.navigate)
  const { deleteNode, openTab } = useWorkspaceStore()
  const [isApplying, setIsApplying] = useState(false)

  if (!preview) return null

  const removeDraftJson = () => {
    const nodeId = findAILibraryDraftWorkspaceNodeId(preview.messageId)
    if (nodeId) deleteNode(nodeId)
  }

  const handleOpenJson = () => {
    const nodeId = ensureAILibraryDraftWorkspaceNode(preview)
    openTab(nodeId)
    navigate({ type: 'workspace-file', nodeId })
  }

  const handleDiscard = () => {
    removeDraftJson()
    discardPreview()
  }

  const handleApply = async () => {
    setIsApplying(true)
    try {
      const applied = await applyPreview()
      if (applied) removeDraftJson()
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <LibraryTemplateParamsPanel
      mode="create"
      subsystemType={preview.templateInput.componentSnapshot.subsystemType}
      defaultProjectId={preview.targetProjectId}
      defaultLibraryName={preview.templateInput.libraryName ?? preview.libraryFile.libraryName ?? null}
      templateInputOverride={preview.templateInput}
      readOnly
      draftPreview={{
        targetScope: preview.targetScope,
        summary: preview.summary,
        assumptions: preview.assumptions,
        missingData: preview.missingData,
        uncertainData: preview.uncertainData,
        conflicts: preview.conflicts,
        fieldStatus: preview.fieldStatus,
        onOpenJson: handleOpenJson,
        onDiscard: handleDiscard,
        onApply: () => { void handleApply() },
        applyBusy: isApplying,
      }}
      onSaved={() => {}}
      onClose={handleDiscard}
    />
  )
}
