/**
 * store/workspaceStore.ts — PRISM Workspace
 *
 * Free-form workspace tree (folders + markdown notes).
 *
 * Persistence strategy (hybrid):
 *   - localStorage via zustand/persist  → instant load, works offline
 *   - Supabase workspace_tree table     → synced per authenticated profile
 *     Sync is debounced (2s) after any mutation, and pulled on login.
 *     Last-write-wins: server state is loaded only when its updated_at is
 *     more recent than the local snapshot (stored in localSnapshotAt).
 */
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { supabase } from '@/lib/supabase'

export const WORKSPACE_ROOT = '__root__'

export type WorkspaceFolder = {
  type: 'folder'
  id: string
  name: string
  collapsed: boolean
  parentId: string | null
}

export type WorkspaceNote = {
  type: 'note'
  id: string
  name: string
  content: string
  parentId: string | null
}

export type WorkspacePDF = {
  type: 'pdf'
  id: string
  name: string
  storageKey: string  // path in Supabase Storage bucket
  parentId: string | null
}

export type WorkspaceImage = {
  type: 'image'
  id: string
  name: string
  storageKey: string
  parentId: string | null
}

export type WorkspaceNode = WorkspaceFolder | WorkspaceNote | WorkspacePDF | WorkspaceImage

// ── Persisted shape (subset of state) ───────────────────────────────────────
interface WorkspacePersisted {
  nodes: Record<string, WorkspaceNode>
  childOrder: Record<string, string[]>
  sectionCollapsed: boolean
  pinnedNodeIds: string[]
  /** ISO timestamp of when we last wrote to Supabase — used for conflict detection */
  localSnapshotAt: string | null
}
// openTabs and activeTabId are intentionally NOT persisted — tabs are session-only.

interface WorkspaceState extends WorkspacePersisted {
  // ── Session-only (not persisted, reset on hard refresh) ──
  openTabs: string[]
  activeTabId: string | null
  /** Set to a noteId when a note is freshly created — NoteEditorWorkspace consumes and clears it to trigger auto-rename */
  pendingRenameId: string | null

  createFolder: (parentId: string | null, name: string) => string
  createNote: (parentId: string | null, name: string) => string
  /** Register an already-uploaded file node (pdf or image). storageKey = Supabase Storage path. */
  createFileNode: (parentId: string | null, type: 'pdf' | 'image', name: string, storageKey: string) => string
  clearPendingRename: () => void
  renameNode: (id: string, name: string) => void
  deleteNode: (id: string) => void
  /** Move a node to a new parent at a given index (-1 = append). Prevents circular folder moves. */
  moveNode: (nodeId: string, newParentId: string | null, newIndex: number) => void
  toggleFolder: (id: string) => void
  toggleSection: () => void
  updateNoteContent: (id: string, content: string) => void
  pinNode: (id: string) => void
  unpinNode: (id: string) => void

  // ── Tab actions ──
  openTab: (nodeId: string) => void
  closeTab: (nodeId: string) => string | null  // returns next activeTabId
  setActiveTab: (nodeId: string) => void
  /** @deprecated use openTab */
  openNoteTab: (nodeId: string) => void
  /** @deprecated use closeTab */
  closeNoteTab: (nodeId: string) => string | null

  // ── Supabase sync ──
  /** Replace workspace tree from a Supabase snapshot (tabs not touched). */
  _loadSnapshot: (snapshot: WorkspacePersisted) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  subscribeWithSelector(
    persist(
      immer((set) => ({
        nodes: {},
        childOrder: {},
        sectionCollapsed: false,
        pinnedNodeIds: [],
        openTabs: [],
        activeTabId: null,
        pendingRenameId: null,
        localSnapshotAt: null,

        createFolder: (parentId, name) => {
          const id = nanoid(8)
          const key = parentId ?? WORKSPACE_ROOT
          set(state => {
            state.nodes[id] = { type: 'folder', id, name, collapsed: false, parentId }
            if (!state.childOrder[key]) state.childOrder[key] = []
            state.childOrder[key].push(id)
          })
          return id
        },

        createNote: (parentId, name) => {
          const id = nanoid(8)
          const key = parentId ?? WORKSPACE_ROOT
          set(state => {
            state.nodes[id] = { type: 'note', id, name, content: '', parentId }
            if (!state.childOrder[key]) state.childOrder[key] = []
            state.childOrder[key].push(id)
            state.pendingRenameId = id
          })
          return id
        },

        clearPendingRename: () => set(state => { state.pendingRenameId = null }),

        createFileNode: (parentId, type, name, storageKey) => {
          const id = nanoid(8)
          const key = parentId ?? WORKSPACE_ROOT
          set(state => {
            state.nodes[id] = { type, id, name, storageKey, parentId } as WorkspacePDF | WorkspaceImage
            if (!state.childOrder[key]) state.childOrder[key] = []
            state.childOrder[key].push(id)
          })
          return id
        },

        renameNode: (id, name) => set(state => {
          if (state.nodes[id]) state.nodes[id].name = name
        }),

        moveNode: (nodeId, newParentId, newIndex) => set(state => {
          const node = state.nodes[nodeId]
          if (!node) return
          // Prevent moving a folder into one of its own descendants
          if (node.type === 'folder') {
            let checkId: string | null = newParentId
            while (checkId) {
              if (checkId === nodeId) return
              checkId = state.nodes[checkId]?.parentId ?? null
            }
          }
          // Remove from old parent
          const oldKey = node.parentId ?? WORKSPACE_ROOT
          state.childOrder[oldKey] = (state.childOrder[oldKey] ?? []).filter(id => id !== nodeId)
          // Insert at new parent
          const newKey = newParentId ?? WORKSPACE_ROOT
          if (!state.childOrder[newKey]) state.childOrder[newKey] = []
          if (newIndex < 0 || newIndex >= state.childOrder[newKey].length) {
            state.childOrder[newKey].push(nodeId)
          } else {
            state.childOrder[newKey].splice(newIndex, 0, nodeId)
          }
          node.parentId = newParentId
        }),

        deleteNode: (id) => set(state => {
          const node = state.nodes[id]
          if (!node) return
          const key = node.parentId ?? WORKSPACE_ROOT
          state.childOrder[key] = (state.childOrder[key] ?? []).filter(cid => cid !== id)
          // Close any open tabs for the deleted node(s)
          const removeTab = (nid: string) => {
            const idx = state.openTabs.indexOf(nid)
            if (idx !== -1) {
              state.openTabs.splice(idx, 1)
              if (state.activeTabId === nid) {
                state.activeTabId = state.openTabs[idx] ?? state.openTabs[idx - 1] ?? null
              }
            }
          }
          const purge = (nid: string) => {
            const children = state.childOrder[nid] ?? []
            children.forEach(cid => { purge(cid); removeTab(cid); delete state.nodes[cid] })
            delete state.childOrder[nid]
          }
          if (node.type === 'folder') purge(id)
          removeTab(id)
          delete state.nodes[id]
        }),

        toggleFolder: (id) => set(state => {
          const node = state.nodes[id]
          if (node?.type === 'folder') node.collapsed = !node.collapsed
        }),

        toggleSection: () => set(state => {
          state.sectionCollapsed = !state.sectionCollapsed
        }),

        updateNoteContent: (id, content) => set(state => {
          const node = state.nodes[id]
          if (node?.type === 'note') node.content = content
        }),

        pinNode: (id) => set(state => {
          if (!state.pinnedNodeIds.includes(id)) state.pinnedNodeIds.push(id)
        }),

        unpinNode: (id) => set(state => {
          state.pinnedNodeIds = state.pinnedNodeIds.filter(pid => pid !== id)
        }),

        openTab: (nodeId) => set(state => {
          if (!state.openTabs.includes(nodeId)) state.openTabs.push(nodeId)
          state.activeTabId = nodeId
        }),

        closeTab: (nodeId) => {
          let nextActive: string | null = null
          set(state => {
            const idx = state.openTabs.indexOf(nodeId)
            if (idx === -1) return
            state.openTabs.splice(idx, 1)
            if (state.activeTabId === nodeId) {
              nextActive = state.openTabs[idx] ?? state.openTabs[idx - 1] ?? null
              state.activeTabId = nextActive
            } else {
              nextActive = state.activeTabId
            }
          })
          return nextActive
        },

        setActiveTab: (nodeId) => set(state => {
          state.activeTabId = nodeId
        }),

        // Backward-compat aliases
        openNoteTab: (nodeId) => set(state => {
          if (!state.openTabs.includes(nodeId)) state.openTabs.push(nodeId)
          state.activeTabId = nodeId
        }),
        closeNoteTab: (nodeId) => {
          let nextActive: string | null = null
          set(state => {
            const idx = state.openTabs.indexOf(nodeId)
            if (idx === -1) return
            state.openTabs.splice(idx, 1)
            if (state.activeTabId === nodeId) {
              nextActive = state.openTabs[idx] ?? state.openTabs[idx - 1] ?? null
              state.activeTabId = nextActive
            } else {
              nextActive = state.activeTabId
            }
          })
          return nextActive
        },

        _loadSnapshot: (snapshot) => set(state => {
          state.nodes            = snapshot.nodes
          state.childOrder       = snapshot.childOrder
          state.sectionCollapsed = snapshot.sectionCollapsed
          state.pinnedNodeIds    = snapshot.pinnedNodeIds
          state.localSnapshotAt  = snapshot.localSnapshotAt
          // openTabs / activeTabId intentionally not restored — session state only
        }),
      })),
      {
        name: 'prism-workspace',
        partialize: (s) => ({
          nodes: s.nodes,
          childOrder: s.childOrder,
          sectionCollapsed: s.sectionCollapsed,
          pinnedNodeIds: s.pinnedNodeIds,
          localSnapshotAt: s.localSnapshotAt,
        }),
      },
    ),
  ),
)

// ── Supabase sync helpers ────────────────────────────────────────────────────

function pickPersisted(s: WorkspaceState): WorkspacePersisted {
  return {
    nodes: s.nodes,
    childOrder: s.childOrder,
    sectionCollapsed: s.sectionCollapsed,
    pinnedNodeIds: s.pinnedNodeIds,
    localSnapshotAt: s.localSnapshotAt,
  }
}

/** Push current local state to Supabase. Updates localSnapshotAt on success. */
export async function pushWorkspaceToSupabase(userId: string): Promise<void> {
  const state = useWorkspaceStore.getState()
  const now = new Date().toISOString()
  const data: WorkspacePersisted = { ...pickPersisted(state), localSnapshotAt: now }

  const { error } = await supabase
    .from('workspace_tree')
    .upsert({ user_id: userId, data }, { onConflict: 'user_id' })

  if (!error) {
    useWorkspaceStore.setState(s => { s.localSnapshotAt = now })
  }
}

/**
 * Pull workspace from Supabase and merge into local store.
 * Server wins only when its updated_at is strictly newer than localSnapshotAt.
 */
export async function pullWorkspaceFromSupabase(userId: string): Promise<void> {
  const { data: row, error } = await supabase
    .from('workspace_tree')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !row) return

  const remoteAt = new Date(row.updated_at as string).getTime()
  const local = useWorkspaceStore.getState()
  const localAt = local.localSnapshotAt ? new Date(local.localSnapshotAt).getTime() : 0

  if (remoteAt > localAt) {
    useWorkspaceStore.getState()._loadSnapshot(row.data as WorkspacePersisted)
  }
}

// ── Debounced push wired up to store mutations ───────────────────────────────

let _syncUserId: string | null = null
let _syncTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Call once when the user logs in.
 * Pulls from Supabase, then watches state changes → debounced push.
 * Call with null when the user logs out to stop syncing.
 */
export async function initWorkspaceSync(userId: string | null): Promise<void> {
  _syncUserId = userId

  if (!userId) {
    if (_syncTimer) clearTimeout(_syncTimer)
    return
  }

  // Initial pull
  await pullWorkspaceFromSupabase(userId)

  // Watch subsequent mutations — skip the read-only tab/UI fields for efficiency
  useWorkspaceStore.subscribe(
    (s) => ({ nodes: s.nodes, childOrder: s.childOrder, pinnedNodeIds: s.pinnedNodeIds }),
    () => {
      if (!_syncUserId) return
      if (_syncTimer) clearTimeout(_syncTimer)
      _syncTimer = setTimeout(() => {
        if (_syncUserId) pushWorkspaceToSupabase(_syncUserId)
      }, 2000)
    },
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  )
}
