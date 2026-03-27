/**
 * store/workspaceStore.ts — PRISM Workspace
 *
 * Free-form workspace tree (folders + markdown notes).
 *
 * Persistence strategy (hybrid):
 *   - localStorage via zustand/persist              → instant load, works offline
 *   - Supabase workspace_nodes / prism files tables → synced per authenticated profile
 *     Sync is debounced (2s) after any mutation, and pulled on login.
 *     Last-write-wins: server state is loaded only when its updated_at is
 *     more recent than the local snapshot (stored in localSnapshotAt).
 */
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { useAppStore } from './appStore'
import { DEFAULT_PRISM_FILES, PRISM_EDITABLE_FILES, type PrismEditableFile } from './types'
import {
  deleteWorkspaceNodeRows,
  fetchLegacyWorkspaceTreeRow,
  fetchWorkspaceNodeRows,
  fetchWorkspacePrismFileRows,
  fetchWorkspaceUserStateRow,
  listWorkspaceNodeIds,
  upsertWorkspaceNodeRows,
  upsertWorkspacePrismFileRows,
  upsertWorkspaceUserStateRow,
  type WorkspaceNodeRow,
  type WorkspacePrismFileRow,
  type WorkspaceUserStateRow,
} from './workspaceSyncDb'

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

export type WorkspaceJsonSchema = 'generic' | 'ai_sif_draft' | 'prism_project_draft' | 'prism_library_draft' | 'library_import'

export type WorkspaceJsonBinding =
  | { kind: 'ai_sif_draft'; messageId: string }
  | { kind: 'ai_project_draft'; messageId: string }
  | { kind: 'ai_library_draft'; messageId: string }

export type WorkspaceJSON = {
  type: 'json'
  id: string
  name: string
  content: string
  schema: WorkspaceJsonSchema
  binding?: WorkspaceJsonBinding
  parentId: string | null
}

export type WorkspaceNode = WorkspaceFolder | WorkspaceNote | WorkspacePDF | WorkspaceImage | WorkspaceJSON
type PrismFilesMap = Record<PrismEditableFile, string>

// ── Persisted shape (subset of state) ───────────────────────────────────────
interface WorkspacePersisted {
  nodes: Record<string, WorkspaceNode>
  childOrder: Record<string, string[]>
  sectionCollapsed: boolean
  pinnedNodeIds: string[]
  /** ISO timestamp of when we last wrote to Supabase — used for conflict detection */
  localSnapshotAt: string | null
  /** User owning the local snapshot — prevents leaking one user's workspace into another session. */
  ownerUserId: string | null
}

interface WorkspaceSnapshot extends WorkspacePersisted {
  prismFiles: PrismFilesMap
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
  createJsonNode: (
    parentId: string | null,
    name: string,
    content?: string,
    options?: { schema?: WorkspaceJsonSchema; binding?: WorkspaceJsonBinding },
  ) => string
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
  updateJsonContent: (id: string, content: string) => void
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
  /** Replace workspace tree + .prism files from a Supabase snapshot (tabs not touched). */
  _loadSnapshot: (snapshot: WorkspaceSnapshot) => void
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
        ownerUserId: null,

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

        createJsonNode: (parentId, name, content = '', options) => {
          const id = nanoid(8)
          const key = parentId ?? WORKSPACE_ROOT
          set(state => {
            state.nodes[id] = {
              type: 'json',
              id,
              name,
              content,
              schema: options?.schema ?? 'generic',
              binding: options?.binding,
              parentId,
            }
            if (!state.childOrder[key]) state.childOrder[key] = []
            state.childOrder[key].push(id)
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

        updateJsonContent: (id, content) => set(state => {
          const node = state.nodes[id]
          if (node?.type === 'json') node.content = content
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

        _loadSnapshot: (snapshot) => {
          set(state => {
            state.nodes = snapshot.nodes
            state.childOrder = snapshot.childOrder
            state.sectionCollapsed = snapshot.sectionCollapsed
            state.pinnedNodeIds = snapshot.pinnedNodeIds
            state.localSnapshotAt = snapshot.localSnapshotAt
            state.ownerUserId = snapshot.ownerUserId
            // openTabs / activeTabId intentionally not restored — session state only
          })
          useAppStore.getState().replacePrismFiles(snapshot.prismFiles)
        },
      })),
      {
        name: 'prism-workspace',
        partialize: (s) => ({
          nodes: s.nodes,
          childOrder: s.childOrder,
          sectionCollapsed: s.sectionCollapsed,
          pinnedNodeIds: s.pinnedNodeIds,
          localSnapshotAt: s.localSnapshotAt,
          ownerUserId: s.ownerUserId,
        }),
      },
    ),
  ),
)

// ── Supabase sync helpers ────────────────────────────────────────────────────

let _lastSyncedWorkspaceNodeIds: string[] | null = null

function normalizePrismFiles(prismFiles: Partial<PrismFilesMap> | null | undefined): PrismFilesMap {
  return { ...DEFAULT_PRISM_FILES, ...(prismFiles ?? {}) }
}

function buildEmptyWorkspaceSnapshot(userId: string | null): WorkspaceSnapshot {
  return {
    nodes: {},
    childOrder: {},
    sectionCollapsed: false,
    pinnedNodeIds: [],
    localSnapshotAt: null,
    ownerUserId: userId,
    prismFiles: { ...DEFAULT_PRISM_FILES },
  }
}

function pickPersisted(s: WorkspaceState): WorkspacePersisted {
  return {
    nodes: s.nodes,
    childOrder: s.childOrder,
    sectionCollapsed: s.sectionCollapsed,
    pinnedNodeIds: s.pinnedNodeIds,
    localSnapshotAt: s.localSnapshotAt,
    ownerUserId: s.ownerUserId,
  }
}

function hasLocalWorkspaceData(state: WorkspaceState, prismFiles: PrismFilesMap): boolean {
  return (
    Object.keys(state.nodes).length > 0
    || state.pinnedNodeIds.length > 0
    || state.sectionCollapsed
    || PRISM_EDITABLE_FILES.some(filename => (prismFiles[filename] ?? '').trim().length > 0)
  )
}

function workspaceNodeToRow(userId: string, state: WorkspaceState, node: WorkspaceNode): WorkspaceNodeRow {
  const key = node.parentId ?? WORKSPACE_ROOT
  const sortIndex = Math.max(0, state.childOrder[key]?.indexOf(node.id) ?? 0)

  if (node.type === 'folder') {
    return {
      user_id: userId,
      node_id: node.id,
      node_type: 'folder',
      parent_id: node.parentId,
      sort_index: sortIndex,
      name: node.name,
      content: null,
      storage_key: null,
      collapsed: node.collapsed,
      json_schema: null,
      binding: null,
    }
  }

  if (node.type === 'note') {
    return {
      user_id: userId,
      node_id: node.id,
      node_type: 'note',
      parent_id: node.parentId,
      sort_index: sortIndex,
      name: node.name,
      content: node.content,
      storage_key: null,
      collapsed: false,
      json_schema: null,
      binding: null,
    }
  }

  if (node.type === 'json') {
    return {
      user_id: userId,
      node_id: node.id,
      node_type: 'json',
      parent_id: node.parentId,
      sort_index: sortIndex,
      name: node.name,
      content: node.content,
      storage_key: null,
      collapsed: false,
      json_schema: node.schema,
      binding: (node.binding ?? null) as Record<string, unknown> | null,
    }
  }

  return {
    user_id: userId,
    node_id: node.id,
    node_type: node.type,
    parent_id: node.parentId,
    sort_index: sortIndex,
    name: node.name,
    content: null,
    storage_key: node.storageKey,
    collapsed: false,
    json_schema: null,
    binding: null,
  }
}

function buildSnapshotFromRows(
  userId: string,
  nodeRows: WorkspaceNodeRow[],
  prismRows: WorkspacePrismFileRow[],
  stateRow: WorkspaceUserStateRow | null,
  remoteTimestamp: string | null,
): WorkspaceSnapshot {
  const snapshot = buildEmptyWorkspaceSnapshot(userId)
  snapshot.sectionCollapsed = stateRow?.section_collapsed ?? false
  snapshot.pinnedNodeIds = Array.isArray(stateRow?.pinned_node_ids) ? stateRow.pinned_node_ids : []
  snapshot.localSnapshotAt = remoteTimestamp

  const orderedRows = [...nodeRows].sort((left, right) => {
    const leftParent = left.parent_id ?? ''
    const rightParent = right.parent_id ?? ''
    if (leftParent !== rightParent) return leftParent.localeCompare(rightParent)
    return left.sort_index - right.sort_index
  })

  for (const row of orderedRows) {
    if (row.node_type === 'folder') {
      snapshot.nodes[row.node_id] = {
        type: 'folder',
        id: row.node_id,
        name: row.name,
        collapsed: row.collapsed,
        parentId: row.parent_id,
      }
    } else if (row.node_type === 'note') {
      snapshot.nodes[row.node_id] = {
        type: 'note',
        id: row.node_id,
        name: row.name,
        content: row.content ?? '',
        parentId: row.parent_id,
      }
    } else if (row.node_type === 'json') {
      snapshot.nodes[row.node_id] = {
        type: 'json',
        id: row.node_id,
        name: row.name,
        content: row.content ?? '',
        schema: (row.json_schema as WorkspaceJsonSchema | null) ?? 'generic',
        binding: (row.binding ?? undefined) as WorkspaceJsonBinding | undefined,
        parentId: row.parent_id,
      }
    } else if (row.node_type === 'pdf' || row.node_type === 'image') {
      snapshot.nodes[row.node_id] = {
        type: row.node_type,
        id: row.node_id,
        name: row.name,
        storageKey: row.storage_key ?? '',
        parentId: row.parent_id,
      }
    }

    const key = row.parent_id ?? WORKSPACE_ROOT
    ;(snapshot.childOrder[key] ??= []).push(row.node_id)
  }

  snapshot.prismFiles = normalizePrismFiles(
    Object.fromEntries(prismRows.map(row => [row.file_name, row.content])) as Partial<PrismFilesMap>,
  )

  return snapshot
}

function buildSnapshotFromLegacyRow(userId: string, row: { data: unknown; updated_at: string }): WorkspaceSnapshot {
  const remote = (row.data ?? {}) as Partial<WorkspaceSnapshot>
  return {
    ...buildEmptyWorkspaceSnapshot(userId),
    ...remote,
    ownerUserId: userId,
    localSnapshotAt: remote.localSnapshotAt ?? row.updated_at,
    prismFiles: normalizePrismFiles(remote.prismFiles),
  }
}

function getRemoteWorkspaceTimestamp(
  nodeRows: WorkspaceNodeRow[],
  prismRows: WorkspacePrismFileRow[],
  stateRow: WorkspaceUserStateRow | null,
): string | null {
  const timestamps = [
    ...nodeRows.map(row => row.updated_at).filter((value): value is string => Boolean(value)),
    ...prismRows.map(row => row.updated_at).filter((value): value is string => Boolean(value)),
    ...(stateRow?.updated_at ? [stateRow.updated_at] : []),
  ]
  if (timestamps.length === 0) return null
  return timestamps.reduce((latest, current) => (current > latest ? current : latest))
}

/** Push current local state to Supabase. Updates localSnapshotAt on success. */
export async function pushWorkspaceToSupabase(userId: string): Promise<void> {
  const state = useWorkspaceStore.getState()
  const prismFiles = normalizePrismFiles(useAppStore.getState().prismFiles)
  const nodeRows = Object.values(state.nodes).map(node => workspaceNodeToRow(userId, state, node))
  const prismRows: WorkspacePrismFileRow[] = PRISM_EDITABLE_FILES.map(filename => ({
    user_id: userId,
    file_name: filename,
    content: prismFiles[filename] ?? '',
  }))
  const userStateRow: WorkspaceUserStateRow = {
    user_id: userId,
    section_collapsed: state.sectionCollapsed,
    pinned_node_ids: [...state.pinnedNodeIds],
  }

  const knownNodeIds = _lastSyncedWorkspaceNodeIds ?? await listWorkspaceNodeIds(userId)
  const currentNodeIds = nodeRows.map(row => row.node_id)
  const staleNodeIds = knownNodeIds.filter(nodeId => !currentNodeIds.includes(nodeId))

  await Promise.all([
    upsertWorkspaceNodeRows(nodeRows),
    upsertWorkspacePrismFileRows(prismRows),
    upsertWorkspaceUserStateRow(userStateRow),
  ])

  if (staleNodeIds.length > 0) {
    await deleteWorkspaceNodeRows(userId, staleNodeIds)
  }

  const now = new Date().toISOString()
  _lastSyncedWorkspaceNodeIds = currentNodeIds
  useWorkspaceStore.setState(s => {
    s.localSnapshotAt = now
    s.ownerUserId = userId
  })
}

/**
 * Pull workspace from Supabase and merge into local store.
 * Server wins unless the local snapshot for the same user is newer.
 */
export async function pullWorkspaceFromSupabase(userId: string): Promise<void> {
  const [nodeRows, prismRows, stateRow] = await Promise.all([
    fetchWorkspaceNodeRows(userId),
    fetchWorkspacePrismFileRows(userId),
    fetchWorkspaceUserStateRow(userId),
  ])

  const local = useWorkspaceStore.getState()
  const localUserMatches = local.ownerUserId === userId
  const localPrismFiles = normalizePrismFiles(useAppStore.getState().prismFiles)
  const localHasData = hasLocalWorkspaceData(local, localPrismFiles)
  const localAt = local.localSnapshotAt ? new Date(local.localSnapshotAt).getTime() : 0
  const normalizedRemoteHasData = nodeRows.length > 0 || prismRows.length > 0 || Boolean(stateRow)

  if (normalizedRemoteHasData) {
    const remoteTimestamp = getRemoteWorkspaceTimestamp(nodeRows, prismRows, stateRow)
    const remoteAt = remoteTimestamp ? new Date(remoteTimestamp).getTime() : 0
    const snapshot = buildSnapshotFromRows(userId, nodeRows, prismRows, stateRow, remoteTimestamp)
    _lastSyncedWorkspaceNodeIds = nodeRows.map(row => row.node_id)

    if (!localUserMatches || !localHasData || remoteAt >= localAt) {
      useWorkspaceStore.getState()._loadSnapshot(snapshot)
      return
    }

    await pushWorkspaceToSupabase(userId)
    return
  }

  const legacyRow = await fetchLegacyWorkspaceTreeRow(userId)
  if (legacyRow) {
    const snapshot = buildSnapshotFromLegacyRow(userId, legacyRow)
    const remoteAt = new Date(legacyRow.updated_at).getTime()
    _lastSyncedWorkspaceNodeIds = Object.keys(snapshot.nodes)

    if (!localUserMatches || !localHasData || remoteAt >= localAt) {
      useWorkspaceStore.getState()._loadSnapshot(snapshot)
    }

    await pushWorkspaceToSupabase(userId)
    return
  }

  if (localUserMatches && localHasData) {
    _lastSyncedWorkspaceNodeIds = []
    await pushWorkspaceToSupabase(userId)
    return
  }

  _lastSyncedWorkspaceNodeIds = []
  useWorkspaceStore.getState()._loadSnapshot(buildEmptyWorkspaceSnapshot(userId))
}

// ── Debounced push wired up to store mutations ───────────────────────────────

let _syncUserId: string | null = null
let _syncTimer: ReturnType<typeof setTimeout> | null = null
let _workspaceUnsubscribe: (() => void) | null = null
let _prismUnsubscribe: (() => void) | null = null

function queueWorkspaceSync(): void {
  if (!_syncUserId) return
  if (_syncTimer) clearTimeout(_syncTimer)
  _syncTimer = setTimeout(() => {
    if (_syncUserId) void pushWorkspaceToSupabase(_syncUserId)
  }, 2000)
}

/**
 * Call once when the user logs in.
 * Pulls from Supabase, then watches state changes → debounced push.
 * Call with null when the user logs out to stop syncing.
 */
export async function initWorkspaceSync(userId: string | null): Promise<void> {
  _syncUserId = userId

  if (_syncTimer) clearTimeout(_syncTimer)
  _workspaceUnsubscribe?.()
  _prismUnsubscribe?.()
  _workspaceUnsubscribe = null
  _prismUnsubscribe = null
  _lastSyncedWorkspaceNodeIds = null

  if (!userId) return

  await pullWorkspaceFromSupabase(userId)

  _workspaceUnsubscribe = useWorkspaceStore.subscribe(
    s => ({
      nodes: s.nodes,
      childOrder: s.childOrder,
      sectionCollapsed: s.sectionCollapsed,
      pinnedNodeIds: s.pinnedNodeIds,
    }),
    queueWorkspaceSync,
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  )

  _prismUnsubscribe = useAppStore.subscribe((state, prevState) => {
    if (JSON.stringify(state.prismFiles) !== JSON.stringify(prevState.prismFiles)) {
      queueWorkspaceSync()
    }
  })
}
