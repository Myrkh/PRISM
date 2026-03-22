/**
 * workspace/WorkspaceTabBar.tsx
 *
 * Shared VS Code-style tab bar for all workspace node types:
 * notes, PDFs, and images.
 * Used by both NoteEditorWorkspace and FileViewerWorkspace.
 */
import { FileText, FileImage, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import type { WorkspaceNode } from '@/store/workspaceStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

// ─── Navigate to the right view based on node type ────────────────────────
export function navigateToNode(nodeId: string | null) {
  const navigate = useAppStore.getState().navigate
  if (!nodeId) { navigate({ type: 'home' }); return }
  const node = useWorkspaceStore.getState().nodes[nodeId]
  if (!node) { navigate({ type: 'home' }); return }
  if (node.type === 'note') navigate({ type: 'note', noteId: nodeId })
  else navigate({ type: 'workspace-file', nodeId })
}

// ─── Tab icon by node type ────────────────────────────────────────────────
function TabIcon({ node, isActive }: { node: WorkspaceNode | undefined; isActive: boolean }) {
  const { TEAL, TEXT_DIM } = usePrismTheme()
  if (!node) return <FileText size={12} style={{ color: TEXT_DIM }} />
  if (node.type === 'pdf') {
    return (
      <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? '#F87171' : TEXT_DIM, lineHeight: 1, letterSpacing: 0 }}>
        PDF
      </span>
    )
  }
  if (node.type === 'image') {
    return <FileImage size={12} style={{ color: isActive ? '#A78BFA' : TEXT_DIM }} />
  }
  // note
  return <FileText size={12} style={{ color: isActive ? TEAL : TEXT_DIM }} />
}

// ─── WorkspaceTabBar ──────────────────────────────────────────────────────
export function WorkspaceTabBar({ activeNodeId }: { activeNodeId: string }) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, SHADOW_SOFT, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const { nodes, openTabs, closeTab } = useWorkspaceStore()

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const nextId = closeTab(tabId)
    navigateToNode(nextId)
  }

  const handleClick = (tabId: string) => {
    useWorkspaceStore.getState().setActiveTab(tabId)
    navigateToNode(tabId)
  }

  if (openTabs.length === 0) return null

  return (
    <div
      className="flex shrink-0 items-end border-b overflow-x-auto"
      style={{ borderColor: BORDER, background: PANEL_BG, height: 36, scrollbarWidth: 'none' }}
    >
      {openTabs.map(tabId => {
        const node = nodes[tabId]
        const name = node?.name ?? tabId
        const isActive = tabId === activeNodeId
        return (
          <div
            key={tabId}
            className="group flex shrink-0 items-center gap-1.5 px-3 cursor-pointer transition-colors"
            style={{
              height: 35,
              background: isActive ? CARD_BG : 'transparent',
              borderBottom: `2px solid ${isActive ? TEAL : 'transparent'}`,
              color: isActive ? TEXT : TEXT_DIM,
              fontSize: 12,
              fontWeight: isActive ? 500 : 400,
              maxWidth: 180,
            }}
            onClick={() => handleClick(tabId)}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = PAGE_BG }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <TabIcon node={node} isActive={isActive} />
            <span className="truncate flex-1 min-w-0" style={{ maxWidth: 110 }}>{name}</span>
            <button
              type="button"
              title="Fermer"
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors"
              style={{ color: TEXT_DIM, opacity: isActive ? 1 : 0 }}
              onClick={e => handleClose(e, tabId)}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#EF4444' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT_DIM }}
            >
              <X size={10} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
