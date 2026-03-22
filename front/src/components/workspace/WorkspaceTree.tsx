/**
 * workspace/WorkspaceTree.tsx
 *
 * Free-form workspace tree: folders + notes + PDF/images.
 * Drag & drop (dnd-kit): reorder siblings, move into folders.
 * Context menu (⋯ button on hover): all actions in a dropdown.
 */
import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronRight, Folder, FolderOpen, FileText, FileImage,
  GripVertical, MoreHorizontal,
  FolderPlus, Plus, Upload, Pencil, Pin, PinOff, Trash2,
  Download, Archive,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useWorkspaceStore, WORKSPACE_ROOT } from '@/store/workspaceStore'
import type { WorkspaceNode } from '@/store/workspaceStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import {
  sidebarHoverIn, sidebarHoverOut, sidebarPressDown, sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'
import { uploadWorkspaceFile } from '@/lib/workspaceStorage'
import { downloadNote, downloadFile, downloadFolderAsZip } from '@/lib/workspaceDownload'
import { nanoid } from 'nanoid'

// ─── Inline rename input ──────────────────────────────────────────────────
function RenameInput({
  initialValue, onCommit, onCancel,
}: { initialValue: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const { TEAL, TEXT, SURFACE } = usePrismTheme()
  const ref = useRef<HTMLInputElement>(null)
  const [val, setVal] = useState(initialValue)
  useEffect(() => { ref.current?.select() }, [])
  return (
    <input
      ref={ref} value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => val.trim() ? onCommit(val.trim()) : onCancel()}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); val.trim() ? onCommit(val.trim()) : onCancel() }
        if (e.key === 'Escape') onCancel()
      }}
      className="flex-1 min-w-0 rounded px-1 text-[13px] outline-none"
      style={{ background: SURFACE, border: `1px solid ${TEAL}60`, color: TEXT, boxShadow: `0 0 0 2px ${TEAL}18` }}
      onClick={e => e.stopPropagation()}
    />
  )
}

// ─── Node icon ────────────────────────────────────────────────────────────
function NodeIcon({ node, isActive, isOpen }: { node: WorkspaceNode; isActive: boolean; isOpen: boolean }) {
  const { TEAL, TEXT_DIM } = usePrismTheme()
  if (node.type === 'folder') return isOpen
    ? <FolderOpen size={14} className="shrink-0" style={{ color: TEAL }} />
    : <Folder size={14} className="shrink-0" style={{ color: TEXT_DIM }} />
  if (node.type === 'pdf')
    return <span className="shrink-0 text-[9px] font-bold" style={{ color: isActive ? '#F87171' : TEXT_DIM }}>PDF</span>
  if (node.type === 'image')
    return <FileImage size={13} className="shrink-0" style={{ color: isActive ? '#A78BFA' : TEXT_DIM }} />
  return <FileText size={13} className="shrink-0" style={{ color: isActive ? TEAL : TEXT_DIM }} />
}

// ─── Drag ghost ───────────────────────────────────────────────────────────
function DragGhost({ node }: { node: WorkspaceNode | undefined }) {
  const { CARD_BG, TEAL, TEXT } = usePrismTheme()
  if (!node) return null
  return (
    <div className="flex items-center gap-1.5 rounded-md px-2 py-1"
      style={{ background: CARD_BG, border: `1px solid ${TEAL}40`, boxShadow: '0 4px 16px rgba(0,0,0,0.35)', color: TEXT, fontSize: 13, opacity: 0.92, maxWidth: 200 }}>
      <GripVertical size={11} style={{ color: TEAL, flexShrink: 0 }} />
      <NodeIcon node={node} isActive isOpen={false} />
      <span className="truncate">{node.name}</span>
    </div>
  )
}

// ─── Context menu ─────────────────────────────────────────────────────────
type MenuItem =
  | { kind: 'action'; label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }
  | { kind: 'separator' }

function ContextMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const { CARD_BG, BORDER, TEXT, TEXT_DIM, SHADOW_SOFT } = usePrismTheme()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 right-0 top-full mt-0.5 rounded-lg py-1 min-w-[160px]"
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: `0 8px 24px rgba(0,0,0,0.35), ${SHADOW_SOFT}`,
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (item.kind === 'separator') {
          return <div key={i} className="my-1 h-px" style={{ background: BORDER }} />
        }
        return (
          <button
            key={i}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors"
            style={{ color: item.danger ? '#EF4444' : TEXT }}
            onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            onClick={() => { item.onClick(); onClose() }}
          >
            <span style={{ color: item.danger ? '#EF4444' : TEXT_DIM, flexShrink: 0 }}>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Sortable node row ────────────────────────────────────────────────────
function SortableNodeRow({
  node, depth, activeNodeId, folderId,
}: {
  node: WorkspaceNode; depth: number; activeNodeId: string | null; folderId: string | null
}) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const navigate = useAppStore(s => s.navigate)
  const {
    nodes, childOrder, pinnedNodeIds,
    toggleFolder, renameNode, deleteNode, createFolder, createNote,
    pinNode, unpinNode, openTab, createFileNode,
  } = useWorkspaceStore()

  const [hovered, setHovered]       = useState(false)
  const [renaming, setRenaming]     = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [creatingIn, setCreatingIn] = useState<'folder' | 'note' | null>(null)

  const isNote   = node.type === 'note'
  const isFolder = node.type === 'folder'
  const isFile   = node.type === 'pdf' || node.type === 'image'
  const isOpen   = isFolder && !node.collapsed
  const isActive = node.id === activeNodeId
  const isPinned = isNote && pinnedNodeIds.includes(node.id)
  const isFolderTarget = folderId === node.id

  const children = childOrder[node.id] ?? []

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }

  const handleClick = () => {
    if (renaming || menuOpen) return
    if (isFolder) toggleFolder(node.id)
    if (isNote) { openTab(node.id); navigate({ type: 'note', noteId: node.id }) }
    if (isFile) { openTab(node.id); navigate({ type: 'workspace-file', nodeId: node.id }) }
  }

  const commitCreate = (name: string, kind: 'folder' | 'note') => {
    const parentId = isFolder ? node.id : node.parentId
    if (kind === 'folder') createFolder(parentId, name)
    else { const id = createNote(parentId, name); openTab(id); navigate({ type: 'note', noteId: id }) }
    setCreatingIn(null)
  }

  const uploadRef = useRef<HTMLInputElement>(null)
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const userId = useAppStore.getState().authUser?.id
    if (!userId) return
    const parentId = isFolder ? node.id : node.parentId
    const nodeId = nanoid(8)
    const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'
    try {
      const key = await uploadWorkspaceFile(userId, nodeId, file)
      createFileNode(parentId, fileType, file.name, key)
      openTab(nodeId)
      navigate({ type: 'workspace-file', nodeId })
    } catch (err) { console.error('[PRISM] Upload failed', err) }
  }

  // Build context menu items
  const menuItems: MenuItem[] = []
  if (isFolder) {
    if (node.collapsed) {
      menuItems.push({ kind: 'action', label: 'Ouvrir', icon: <FolderOpen size={12} />, onClick: () => toggleFolder(node.id) })
    } else {
      menuItems.push({ kind: 'action', label: 'Réduire', icon: <Folder size={12} />, onClick: () => toggleFolder(node.id) })
    }
    menuItems.push({ kind: 'separator' })
    menuItems.push({ kind: 'action', label: 'Nouveau dossier', icon: <FolderPlus size={12} />, onClick: () => { if (node.collapsed) toggleFolder(node.id); setCreatingIn('folder') } })
    menuItems.push({ kind: 'action', label: 'Nouvelle note', icon: <Plus size={12} />, onClick: () => { if (node.collapsed) toggleFolder(node.id); setCreatingIn('note') } })
    menuItems.push({ kind: 'action', label: 'Importer PDF / Image', icon: <Upload size={12} />, onClick: () => { if (node.collapsed) toggleFolder(node.id); uploadRef.current?.click() } })
    menuItems.push({ kind: 'separator' })
  }
  if (isNote) {
    menuItems.push({
      kind: 'action',
      label: isPinned ? 'Désépingler' : 'Épingler',
      icon: isPinned ? <PinOff size={12} /> : <Pin size={12} />,
      onClick: () => isPinned ? unpinNode(node.id) : pinNode(node.id),
    })
    menuItems.push({ kind: 'separator' })
  }
  // Download actions
  if (isNote) {
    menuItems.push({
      kind: 'action', label: 'Télécharger (.md)', icon: <Download size={12} />,
      onClick: () => downloadNote(node as import('@/store/workspaceStore').WorkspaceNote),
    })
    menuItems.push({ kind: 'separator' })
  }
  if (isFile) {
    menuItems.push({
      kind: 'action', label: 'Télécharger', icon: <Download size={12} />,
      onClick: () => { void downloadFile(node as import('@/store/workspaceStore').WorkspacePDF | import('@/store/workspaceStore').WorkspaceImage) },
    })
    menuItems.push({ kind: 'separator' })
  }
  if (isFolder) {
    menuItems.push({
      kind: 'action', label: 'Zip & Télécharger', icon: <Archive size={12} />,
      onClick: () => { void downloadFolderAsZip(node.id, node.name, nodes, childOrder) },
    })
    menuItems.push({ kind: 'separator' })
  }
  menuItems.push({ kind: 'action', label: 'Renommer', icon: <Pencil size={12} />, onClick: () => setRenaming(true) })
  menuItems.push({ kind: 'action', label: 'Supprimer', icon: <Trash2 size={12} />, onClick: () => deleteNode(node.id), danger: true })

  const indent = depth * 12

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="group relative flex items-center gap-1"
        style={{ paddingLeft: indent }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false) }}
      >
        {depth > 0 && (
          <div className="pointer-events-none absolute top-0 bottom-0 w-px"
            style={{ left: indent - 8, background: `${BORDER}55` }} />
        )}

        {/* Drag handle */}
        <div
          className="shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ width: 14, height: 24, opacity: hovered && !renaming ? 0.4 : 0, color: TEXT_DIM, transition: 'opacity 120ms' }}
          {...attributes} {...listeners}
        >
          <GripVertical size={11} />
        </div>

        {/* Main row button */}
        <button
          type="button"
          className="relative flex flex-1 min-w-0 items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-1 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
          style={{
            background: isActive ? SURFACE : isFolderTarget ? `${TEAL}12` : 'transparent',
            border: `1px solid ${isActive ? `${TEAL}24` : isFolderTarget ? `${TEAL}50` : 'transparent'}`,
            boxShadow: isActive ? SHADOW_CARD : 'none',
            color: isActive ? TEXT : TEXT_DIM,
          }}
          onClick={handleClick}
          onDoubleClick={e => { e.preventDefault(); setRenaming(true) }}
          onMouseEnter={e => { if (!isActive && !isFolderTarget) sidebarHoverIn(e.currentTarget, { background: PAGE_BG, borderColor: `${BORDER}D0`, boxShadow: SHADOW_SOFT, color: TEXT }) }}
          onMouseLeave={e => { if (!isActive && !isFolderTarget) sidebarHoverOut(e.currentTarget, { background: 'transparent', borderColor: 'transparent', boxShadow: 'none', color: TEXT_DIM }); sidebarPressUp(e.currentTarget, isActive ? SHADOW_CARD : 'none') }}
          onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
          onPointerUp={e => sidebarPressUp(e.currentTarget, isActive ? SHADOW_CARD : SHADOW_SOFT)}
          onPointerCancel={e => sidebarPressUp(e.currentTarget, isActive ? SHADOW_CARD : 'none')}
        >
          <div className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150"
            style={{ background: TEAL, opacity: isActive ? 1 : 0, transform: `translateX(${isActive ? '0px' : '-1px'}) scaleY(${isActive ? 1 : 0.6})` }} />

          {isFolder && (
            <ChevronRight size={12} className="shrink-0 transition-transform duration-150"
              style={{ color: TEAL, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
          )}
          <NodeIcon node={node} isActive={isActive} isOpen={isOpen} />

          {renaming ? (
            <RenameInput
              initialValue={node.name}
              onCommit={name => { renameNode(node.id, name); setRenaming(false) }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="flex-1 min-w-0 truncate text-[13px]">{node.name}</span>
          )}
        </button>

        {/* ⋯ context menu trigger — single button replaces all action icons */}
        {!renaming && (
          <div className="relative shrink-0">
            <button
              type="button"
              title="Actions"
              className="flex h-5 w-5 items-center justify-center rounded transition-colors"
              style={{
                color: TEXT_DIM,
                opacity: hovered || menuOpen ? 1 : 0,
                transition: 'opacity 120ms',
                pointerEvents: hovered || menuOpen ? 'auto' : 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
              onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            >
              <MoreHorizontal size={13} />
            </button>

            {menuOpen && (
              <ContextMenu items={menuItems} onClose={() => setMenuOpen(false)} />
            )}
          </div>
        )}

        {/* Hidden file input for uploads */}
        <input ref={uploadRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileSelected} />
      </div>

      {/* Inline creation input */}
      {creatingIn && (
        <div style={{ paddingLeft: indent + (isFolder ? 26 : 14) }} className="pr-2 py-0.5">
          <RenameInput
            initialValue={creatingIn === 'folder' ? 'Nouveau dossier' : 'Note.md'}
            onCommit={name => commitCreate(name, creatingIn)}
            onCancel={() => setCreatingIn(null)}
          />
        </div>
      )}

      {/* Children */}
      {isFolder && isOpen && children.length > 0 && (
        <SortableContext items={children} strategy={verticalListSortingStrategy}>
          {children.map(cid => {
            const child = nodes[cid]
            if (!child) return null
            return <SortableNodeRow key={cid} node={child} depth={depth + 1} activeNodeId={activeNodeId} folderId={folderId} />
          })}
        </SortableContext>
      )}
    </div>
  )
}

// ─── WorkspaceTree ────────────────────────────────────────────────────────
export function WorkspaceTree() {
  const { BORDER, PANEL_BG, TEAL, TEXT, TEXT_DIM, SHADOW_SOFT, isDark } = usePrismTheme()
  const view = useAppStore(s => s.view)
  const navigate = useAppStore(s => s.navigate)
  const { nodes, childOrder, sectionCollapsed, toggleSection, createFolder, createNote, openTab, createFileNode, moveNode } = useWorkspaceStore()

  const [creatingAt, setCreatingAt] = useState<'folder' | 'note' | null>(null)
  const rootUploadRef = useRef<HTMLInputElement>(null)
  const [activeDragId, setActiveDragId]     = useState<string | null>(null)
  const [folderTargetId, setFolderTargetId] = useState<string | null>(null)

  const activeNodeId = view.type === 'note' ? view.noteId : view.type === 'workspace-file' ? view.nodeId : null
  const rootChildren = childOrder[WORKSPACE_ROOT] ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => { setActiveDragId(active.id as string); setFolderTargetId(null) }
  const handleDragOver  = ({ over }: DragOverEvent) => {
    if (!over) { setFolderTargetId(null); return }
    const overNode = nodes[over.id as string]
    setFolderTargetId(overNode?.type === 'folder' ? over.id as string : null)
  }
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null); setFolderTargetId(null)
    if (!over || active.id === over.id) return
    const activeId = active.id as string; const overId = over.id as string
    const activeNode = nodes[activeId]; const overNode = nodes[overId]
    if (!activeNode || !overNode) return
    if (overNode.type === 'folder') { moveNode(activeId, overNode.id, -1); return }
    const overParentKey = overNode.parentId ?? WORKSPACE_ROOT
    const newIndex = (childOrder[overParentKey] ?? []).indexOf(overId)
    moveNode(activeId, overNode.parentId, newIndex)
  }

  const commitRootCreate = (name: string, kind: 'folder' | 'note') => {
    if (kind === 'folder') createFolder(null, name)
    else { const id = createNote(null, name); openTab(id); navigate({ type: 'note', noteId: id }) }
    setCreatingAt(null)
  }

  const handleRootUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    const userId = useAppStore.getState().authUser?.id; if (!userId) return
    const nodeId = nanoid(8)
    const fileType: 'pdf' | 'image' = file.type === 'application/pdf' ? 'pdf' : 'image'
    try {
      const key = await uploadWorkspaceFile(userId, nodeId, file)
      createFileNode(null, fileType, file.name, key)
      openTab(nodeId); navigate({ type: 'workspace-file', nodeId })
    } catch (err) { console.error('[PRISM] Upload failed', err) }
  }

  return (
    <div className="flex flex-col h-full"
      style={{ background: PANEL_BG, boxShadow: `${SHADOW_SOFT}, inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.78)'}` }}>

      {/* Section header */}
      <div className="flex shrink-0 items-center gap-1 border-t px-2 py-1.5" style={{ borderColor: BORDER }}>
        <button type="button" className="flex flex-1 items-center gap-1.5 min-w-0" onClick={toggleSection}>
          <ChevronRight size={12} className="shrink-0 transition-transform duration-200"
            style={{ color: TEXT_DIM, transform: sectionCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }} />
          <span className="truncate text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Espace libre</span>
        </button>
        {!sectionCollapsed && (
          <div className="flex items-center gap-0.5">
            <button type="button" title="Nouveau dossier"
              className="flex h-5 w-5 items-center justify-center rounded transition-colors"
              style={{ color: TEXT_DIM }} onMouseEnter={e => { e.currentTarget.style.color = TEXT }} onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
              onClick={() => setCreatingAt('folder')}><FolderPlus size={12} /></button>
            <button type="button" title="Nouvelle note"
              className="flex h-5 w-5 items-center justify-center rounded transition-colors"
              style={{ color: TEXT_DIM }} onMouseEnter={e => { e.currentTarget.style.color = TEXT }} onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
              onClick={() => setCreatingAt('note')}><Plus size={12} /></button>
            <button type="button" title="Importer PDF / Image"
              className="flex h-5 w-5 items-center justify-center rounded transition-colors"
              style={{ color: TEXT_DIM }} onMouseEnter={e => { e.currentTarget.style.color = TEXT }} onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
              onClick={() => rootUploadRef.current?.click()}><Upload size={12} /></button>
            <input ref={rootUploadRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleRootUpload} />
          </div>
        )}
      </div>

      {!sectionCollapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          {creatingAt && (
            <div className="py-0.5">
              <RenameInput
                initialValue={creatingAt === 'folder' ? 'Nouveau dossier' : 'Note.md'}
                onCommit={name => commitRootCreate(name, creatingAt)}
                onCancel={() => setCreatingAt(null)}
              />
            </div>
          )}
          {rootChildren.length === 0 && !creatingAt && (
            <p className="px-2 py-2 text-[11px] italic" style={{ color: TEXT_DIM }}>Notes, dossiers, PDF et images.</p>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <SortableContext items={rootChildren} strategy={verticalListSortingStrategy}>
              <div className="space-y-0.5">
                {rootChildren.map(id => {
                  const node = nodes[id]
                  if (!node) return null
                  return <SortableNodeRow key={id} node={node} depth={0} activeNodeId={activeNodeId} folderId={folderTargetId} />
                })}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDragId ? <DragGhost node={nodes[activeDragId]} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  )
}
