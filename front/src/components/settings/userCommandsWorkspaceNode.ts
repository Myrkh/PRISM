import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { USER_COMMANDS_WORKSPACE_FILENAME, serializeUserCommandsWorkspaceDocument } from './userCommandsWorkspaceJson'

export function findUserCommandsWorkspaceNodeId(): string | null {
  const nodes = useWorkspaceStore.getState().nodes
  const match = Object.values(nodes).find(node => (
    node.type === 'json'
      && (node.schema === 'prism_user_commands' || node.binding?.kind === 'app_user_commands')
  ))
  return match?.id ?? null
}

export function ensureUserCommandsWorkspaceNode(): string {
  const content = serializeUserCommandsWorkspaceDocument(useAppStore.getState().preferences.userCommands)
  const existingNodeId = findUserCommandsWorkspaceNodeId()
  if (existingNodeId) {
    const workspace = useWorkspaceStore.getState()
    const existingNode = workspace.nodes[existingNodeId]
    if (existingNode?.type === 'json') {
      if (existingNode.name !== USER_COMMANDS_WORKSPACE_FILENAME) {
        workspace.renameNode(existingNodeId, USER_COMMANDS_WORKSPACE_FILENAME)
      }
      if (existingNode.content !== content) {
        workspace.updateJsonContent(existingNodeId, content)
      }
    }
    return existingNodeId
  }

  return useWorkspaceStore.getState().createJsonNode(
    null,
    USER_COMMANDS_WORKSPACE_FILENAME,
    content,
    {
      schema: 'prism_user_commands',
      binding: { kind: 'app_user_commands' },
    },
  )
}

export function syncUserCommandsWorkspaceNodeIfExists(): void {
  const existingNodeId = findUserCommandsWorkspaceNodeId()
  if (!existingNodeId) return
  const content = serializeUserCommandsWorkspaceDocument(useAppStore.getState().preferences.userCommands)
  const workspace = useWorkspaceStore.getState()
  const existingNode = workspace.nodes[existingNodeId]
  if (existingNode?.type !== 'json') return
  if (existingNode.name !== USER_COMMANDS_WORKSPACE_FILENAME) {
    workspace.renameNode(existingNodeId, USER_COMMANDS_WORKSPACE_FILENAME)
  }
  if (existingNode.content !== content) {
    workspace.updateJsonContent(existingNodeId, content)
  }
}

export function openUserCommandsWorkspaceNode(): string {
  const nodeId = ensureUserCommandsWorkspaceNode()
  const appState = useAppStore.getState()
  const currentView = appState.view
  if (currentView.type !== 'workspace-file' || currentView.nodeId !== nodeId) {
    useAppStore.setState({
      userCommandsReturnView: currentView,
      keybindingsReturnView: null,
    })
  }
  useWorkspaceStore.getState().openTab(nodeId)
  appState.navigate({ type: 'workspace-file', nodeId })
  return nodeId
}
