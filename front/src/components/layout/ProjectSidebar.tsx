/**
 * layout/ProjectSidebar.tsx
 *
 * Sidebar shell — three collapsible sections:
 *   1. ÉPINGLÉS  — pinned SIFs + pinned workspace notes (always visible at top)
 *   2. PROJETS   — collapsible, ProjectTree
 *   3. ESPACE LIBRE — collapsible, WorkspaceTree
 * Sections 2 & 3 separated by a drag-to-resize handle.
 */
import { useState, useRef, useEffect, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronRight, FolderPlus, FilePlus, FileText, Pin, Upload } from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useAppStore } from '@/store/appStore'
import { calcSIF } from '@/core/math/pfdCalc'
import { normalizeSIFTab } from '@/store/types'
import { ProjectTree } from '@/components/layout/ProjectTree'
import { PrismImportModal } from '@/components/PrismImportModal'
import { WorkspaceTree } from '@/components/workspace/WorkspaceTree'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { StatusIcon } from '@/shared/StatusIcon'
import {
  sidebarHoverIn, sidebarHoverOut, sidebarPressDown, sidebarPressUp,
} from '@/components/layout/SidebarPrimitives'

// ─── Drag handle between Projets / Espace libre ───────────────────────────
function SectionDivider({
  isResizing,
  onPointerDown,
}: {
  isResizing: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
}) {
  const { BORDER, TEAL } = usePrismTheme()
  const [hovered, setHovered] = useState(false)
  const active = isResizing || hovered
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className="relative flex shrink-0 cursor-row-resize items-center justify-center transition-colors"
      style={{ height: 6, background: active ? `${TEAL}18` : 'transparent', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        className="h-0.5 w-8 rounded-full transition-all"
        style={{ background: active ? TEAL : `${BORDER}88`, opacity: active ? 0.9 : 0.5 }}
      />
    </div>
  )
}

// ─── Section header (shared pattern) ─────────────────────────────────────
function SectionHeader({
  label,
  collapsed,
  onToggle,
  actions,
}: {
  label: string
  collapsed: boolean
  onToggle: () => void
  actions?: React.ReactNode
}) {
  const { BORDER, TEXT_DIM } = usePrismTheme()
  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5"
      style={{ borderColor: BORDER }}
    >
      <button
        type="button"
        className="flex flex-1 items-center gap-1.5 min-w-0"
        onClick={onToggle}
      >
        <ChevronRight
          size={12}
          className="shrink-0 transition-transform duration-200"
          style={{ color: TEXT_DIM, transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
        />
        <span className="truncate text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
          {label}
        </span>
      </button>
      {!collapsed && actions}
    </div>
  )
}

// ─── Pinned SIF row ───────────────────────────────────────────────────────
function PinnedSIFRow({
  projectId: projId,
  sifId: sid,
  currentProjectId,
  currentSifId,
}: {
  projectId: string
  sifId: string
  currentProjectId: string
  currentSifId: string
}) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const projects        = useAppStore(s => s.projects)
  const navigate        = useAppStore(s => s.navigate)
  const togglePinnedSIF = useAppStore(s => s.togglePinnedSIF)
  const view            = useAppStore(s => s.view)

  const project = projects.find(p => p.id === projId)
  const sif     = project?.sifs.find(s => s.id === sid)
  if (!project || !sif) return null

  const ok  = calcSIF(sif, { projectStandard: project.standard }).meetsTarget
  const cur = sid === currentSifId && projId === currentProjectId
  const activeTab = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : null

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => navigate({ type: 'sif-dashboard', projectId: projId, sifId: sid, tab: activeTab ?? 'cockpit' })}
        className="relative flex flex-1 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
        style={{
          background: cur ? SURFACE : 'transparent',
          border: `1px solid ${cur ? `${TEAL}24` : 'transparent'}`,
          boxShadow: cur ? SHADOW_CARD : 'none',
          color: cur ? TEXT : TEXT_DIM,
          transform: 'translateY(0) scale(1)',
        }}
        onMouseEnter={e => { if (!cur) sidebarHoverIn(e.currentTarget, { background: PAGE_BG, borderColor: `${BORDER}D0`, boxShadow: SHADOW_SOFT, color: TEXT }) }}
        onMouseLeave={e => { if (!cur) sidebarHoverOut(e.currentTarget, { background: 'transparent', borderColor: 'transparent', boxShadow: 'none', color: TEXT_DIM }); sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : 'none') }}
        onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
        onPointerUp={e => sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : SHADOW_SOFT)}
        onPointerCancel={e => sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : 'none')}
      >
        <div
          className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150"
          style={{ background: TEAL, opacity: cur ? 1 : 0, transform: `translateX(${cur ? '0px' : '-1px'}) scaleY(${cur ? 1 : 0.6})` }}
        />
        <FileText size={13} className="shrink-0" style={{ color: cur ? TEAL : TEXT_DIM }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px]">{sif.sifNumber}</p>
          <p className="truncate text-[10px]" style={{ color: TEXT_DIM }}>{project.name}</p>
        </div>
        <StatusIcon ok={ok} />
      </button>
      <button
        type="button"
        title="Désépingler"
        onClick={() => togglePinnedSIF(sid)}
        className="rounded p-1 transition-colors shrink-0"
        style={{ color: TEAL }}
        onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
        onMouseLeave={e => { e.currentTarget.style.color = TEAL }}
      >
        <Pin size={12} />
      </button>
    </div>
  )
}

// ─── Pinned note row ──────────────────────────────────────────────────────
function PinnedNoteRow({ nodeId, activeNoteId }: { nodeId: string; activeNoteId: string | null }) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
  const navigate = useAppStore(s => s.navigate)
  const { nodes, unpinNode, openNoteTab } = useWorkspaceStore()
  const node = nodes[nodeId]
  if (!node || node.type !== 'note') return null

  const cur = nodeId === activeNoteId
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => { openNoteTab(nodeId); navigate({ type: 'note', noteId: nodeId }) }}
        className="relative flex flex-1 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
        style={{
          background: cur ? SURFACE : 'transparent',
          border: `1px solid ${cur ? `${TEAL}24` : 'transparent'}`,
          boxShadow: cur ? SHADOW_CARD : 'none',
          color: cur ? TEXT : TEXT_DIM,
          transform: 'translateY(0) scale(1)',
        }}
        onMouseEnter={e => { if (!cur) sidebarHoverIn(e.currentTarget, { background: PAGE_BG, borderColor: `${BORDER}D0`, boxShadow: SHADOW_SOFT, color: TEXT }) }}
        onMouseLeave={e => { if (!cur) sidebarHoverOut(e.currentTarget, { background: 'transparent', borderColor: 'transparent', boxShadow: 'none', color: TEXT_DIM }); sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : 'none') }}
        onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
        onPointerUp={e => sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : SHADOW_SOFT)}
        onPointerCancel={e => sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : 'none')}
      >
        <div
          className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150"
          style={{ background: TEAL, opacity: cur ? 1 : 0, transform: `translateX(${cur ? '0px' : '-1px'}) scaleY(${cur ? 1 : 0.6})` }}
        />
        <FileText size={13} className="shrink-0" style={{ color: cur ? TEAL : TEXT_DIM }} />
        <span className="flex-1 min-w-0 truncate text-[12px]">{node.name}</span>
      </button>
      <button
        type="button"
        title="Désépingler"
        onClick={() => unpinNode(nodeId)}
        className="rounded p-1 transition-colors shrink-0"
        style={{ color: TEAL }}
        onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
        onMouseLeave={e => { e.currentTarget.style.color = TEAL }}
      >
        <Pin size={12} />
      </button>
    </div>
  )
}

// ─── ProjectSidebar ───────────────────────────────────────────────────────
const MIN_TOP       = 80
const MIN_BOTTOM    = 36
const DEFAULT_SPLIT = 0.60

export function ProjectSidebar({ projectId, sifId }: { projectId: string; sifId: string }) {
  const { BORDER, PANEL_BG, TEXT, TEXT_DIM, SHADOW_SOFT, isDark } = usePrismTheme()
  const openNewProject  = useAppStore(s => s.openNewProject)
  const openNewSIF      = useAppStore(s => s.openNewSIF)
  const pinnedSIFIds    = useAppStore(s => s.pinnedSIFIds)
  const view            = useAppStore(s => s.view)

  const { pinnedNodeIds, sectionCollapsed: workspaceCollapsed } = useWorkspaceStore()

  const activeNoteId = view.type === 'note' ? view.noteId : null
  const hasPins = pinnedSIFIds.length > 0 || pinnedNodeIds.length > 0

  const [importModalOpen, setImportModalOpen] = useState(false)

  // Local collapsed states
  const [pinnedCollapsed,   setPinnedCollapsed]   = useState(false)
  const [projectsCollapsed, setProjectsCollapsed] = useState(false)

  // Resize between Projets and Espace libre
  const containerRef     = useRef<HTMLDivElement>(null)
  const [topRatio, setTopRatio] = useState(DEFAULT_SPLIT)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartY     = useRef<number | null>(null)
  const resizeStartRatio = useRef<number>(DEFAULT_SPLIT)

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    resizeStartY.current     = e.clientY
    resizeStartRatio.current = topRatio
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    if (!isResizing) return
    const onMove = (e: PointerEvent) => {
      if (resizeStartY.current === null) return
      const containerH = containerRef.current?.offsetHeight ?? 400
      const delta = e.clientY - resizeStartY.current
      const newRatio = resizeStartRatio.current + delta / containerH
      setTopRatio(Math.max(MIN_TOP / containerH, Math.min(1 - MIN_BOTTOM / containerH, newRatio)))
    }
    const onStop = () => { setIsResizing(false); resizeStartY.current = null }
    document.body.style.cursor     = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onStop)
    window.addEventListener('pointercancel', onStop)
    return () => {
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onStop)
      window.removeEventListener('pointercancel', onStop)
    }
  }, [isResizing])

  const showDivider = !projectsCollapsed && !workspaceCollapsed

  return (
    <>
    {importModalOpen && <PrismImportModal onClose={() => setImportModalOpen(false)} />}
    <div
      ref={containerRef}
      className="flex flex-col h-full min-h-0 overflow-hidden"
      style={{
        background: PANEL_BG,
        boxShadow: `${SHADOW_SOFT}, inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.78)'}`,
      }}
    >
      {/* ── 1. ÉPINGLÉS ── */}
      {hasPins && (
        <div className="shrink-0">
          <SectionHeader
            label="Épinglés"
            collapsed={pinnedCollapsed}
            onToggle={() => setPinnedCollapsed(c => !c)}
          />
          {!pinnedCollapsed && (
            <div className="px-2 py-1.5 space-y-0.5">
              {pinnedSIFIds.map(sid => {
                const project = useAppStore.getState().projects.find(p => p.sifs.some(s => s.id === sid))
                if (!project) return null
                return (
                  <PinnedSIFRow
                    key={sid}
                    projectId={project.id}
                    sifId={sid}
                    currentProjectId={projectId}
                    currentSifId={sifId}
                  />
                )
              })}
              {pinnedNodeIds.map(nid => (
                <PinnedNoteRow key={nid} nodeId={nid} activeNoteId={activeNoteId} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 2. PROJETS ── */}
      <div
        className="flex flex-col min-h-0"
        style={{
          flex: projectsCollapsed
            ? '0 0 auto'
            : workspaceCollapsed
              ? '1 1 auto'
              : `0 0 ${topRatio * 100}%`,
        }}
      >
        <SectionHeader
          label="Projets"
          collapsed={projectsCollapsed}
          onToggle={() => setProjectsCollapsed(c => !c)}
          actions={
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title="Nouveau projet"
                className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                style={{ color: TEXT_DIM }}
                onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
                onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
                onClick={openNewProject}
              >
                <FolderPlus size={12} />
              </button>
              <button
                type="button"
                title="Nouvelle SIF"
                className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                style={{ color: TEXT_DIM }}
                onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
                onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
                onClick={() => openNewSIF()}
              >
                <FilePlus size={12} />
              </button>
              <button
                type="button"
                title="Importer (.prism)"
                className="flex h-5 w-5 items-center justify-center rounded transition-colors"
                style={{ color: TEXT_DIM }}
                onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
                onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
                onClick={() => setImportModalOpen(true)}
              >
                <Upload size={12} />
              </button>
            </div>
          }
        />
        {!projectsCollapsed && (
          <div className="flex flex-col flex-1 min-h-0">
            <ProjectTree projectId={projectId} sifId={sifId} />
          </div>
        )}
      </div>

      {/* ── Drag separator ── */}
      {showDivider && (
        <SectionDivider isResizing={isResizing} onPointerDown={startResize} />
      )}

      {/* ── 3. ESPACE LIBRE ── */}
      <div className={workspaceCollapsed ? 'shrink-0' : 'flex-1 min-h-0'}>
        <WorkspaceTree />
      </div>
    </div>
    </>
  )
}
