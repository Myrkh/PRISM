import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { KEYBINDINGS_WORKSPACE_FILENAME, serializeKeybindingsWorkspaceDocument } from './keybindingsWorkspaceJson'

export function findKeybindingsWorkspaceNodeId(): string | null {
  const nodes = useWorkspaceStore.getState().nodes
  const match = Object.values(nodes).find(node => (
    node.type === 'json'
      && (node.schema === 'prism_keybindings' || node.binding?.kind === 'app_keybindings')
  ))
  return match?.id ?? null
}

export function ensureKeybindingsWorkspaceNode(): string {
  const content = serializeKeybindingsWorkspaceDocument(useAppStore.getState().preferences.userKeybindings)
  const existingNodeId = findKeybindingsWorkspaceNodeId()
  if (existingNodeId) {
    const workspace = useWorkspaceStore.getState()
    const existingNode = workspace.nodes[existingNodeId]
    if (existingNode?.type === 'json') {
      if (existingNode.name !== KEYBINDINGS_WORKSPACE_FILENAME) {
        workspace.renameNode(existingNodeId, KEYBINDINGS_WORKSPACE_FILENAME)
      }
      if (existingNode.content !== content) {
        workspace.updateJsonContent(existingNodeId, content)
      }
    }
    return existingNodeId
  }

  return useWorkspaceStore.getState().createJsonNode(
    null,
    KEYBINDINGS_WORKSPACE_FILENAME,
    content,
    {
      schema: 'prism_keybindings',
      binding: { kind: 'app_keybindings' },
    },
  )
}

export function syncKeybindingsWorkspaceNodeIfExists(): void {
  const existingNodeId = findKeybindingsWorkspaceNodeId()
  if (!existingNodeId) return
  const content = serializeKeybindingsWorkspaceDocument(useAppStore.getState().preferences.userKeybindings)
  const workspace = useWorkspaceStore.getState()
  const existingNode = workspace.nodes[existingNodeId]
  if (existingNode?.type !== 'json') return
  if (existingNode.name !== KEYBINDINGS_WORKSPACE_FILENAME) {
    workspace.renameNode(existingNodeId, KEYBINDINGS_WORKSPACE_FILENAME)
  }
  if (existingNode.content !== content) {
    workspace.updateJsonContent(existingNodeId, content)
  }
}

export function openKeybindingsWorkspaceNode(): string {
  const nodeId = ensureKeybindingsWorkspaceNode()
  const appState = useAppStore.getState()
  const currentView = appState.view
  if (currentView.type !== 'workspace-file' || currentView.nodeId !== nodeId) {
    useAppStore.setState({
      keybindingsReturnView: currentView,
      userCommandsReturnView: null,
    })
  }
  useWorkspaceStore.getState().openTab(nodeId)
  appState.navigate({ type: 'workspace-file', nodeId })
  return nodeId
}
