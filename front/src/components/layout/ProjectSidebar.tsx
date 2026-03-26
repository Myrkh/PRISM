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
import { ChevronRight, FolderPlus, FilePlus, FileCode2, FileText, Lock, Pin, RefreshCw, Upload } from 'lucide-react'
import { PRISM_EDITABLE_FILES, PRISM_FILE_META } from '@/store/types'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useAppStore } from '@/store/appStore'
import { calcSIF } from '@/core/math/pfdCalc'
import { normalizeSIFTab } from '@/store/types'
import { ProjectTree } from '@/components/layout/ProjectTree'
import { PrismImportModal } from '@/components/PrismImportModal'
import { WorkspaceTree } from '@/components/workspace/WorkspaceTree'
import { getShellStrings } from '@/i18n/shell'
import { useLocaleStrings } from '@/i18n/useLocale'
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
  const strings = useLocaleStrings(getShellStrings)
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
        title={strings.projectSidebar.unpin}
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
  const strings = useLocaleStrings(getShellStrings)
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
        title={strings.projectSidebar.unpin}
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

// ─── .prism section ───────────────────────────────────────────────────────
function PrismSection() {
  const { BORDER, TEAL, TEAL_DIM, TEXT, TEXT_DIM, PAGE_BG, SURFACE, SHADOW_CARD, isDark } = usePrismTheme()
  const navigate  = useAppStore(s => s.navigate)
  const view      = useAppStore(s => s.view)
  const [collapsed, setCollapsed] = useState(true)
  const [knowledgeCollapsed, setKnowledgeCollapsed] = useState(true)

  const activeFile = view.type === 'prism-file' ? view.filename : null

  const editableFiles = PRISM_EDITABLE_FILES.map(f => ({
    id: f,
    label: PRISM_FILE_META[f].label,
  }))

  const knowledgeFiles = [
    'iec61511-part1.md',
    'sil-methodology.md',
    'hazop-lopa.md',
    'components-guide.md',
    'prism-guide.md',
  ]

  return (
    <div
      className="shrink-0 border-t"
      style={{ borderColor: BORDER }}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-1 border-b px-2 py-1.5"
        style={{ borderColor: BORDER, background: isDark ? `${TEAL}08` : `${TEAL}05` }}
      >
        <button
          type="button"
          className="flex flex-1 items-center gap-1.5 min-w-0"
          onClick={() => setCollapsed(c => !c)}
        >
          <ChevronRight
            size={12}
            className="shrink-0 transition-transform duration-200"
            style={{ color: TEAL, transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
          />
          <FileCode2 size={11} style={{ color: TEAL, flexShrink: 0 }} />
          <span className="truncate text-[10px] font-bold uppercase tracking-widest" style={{ color: TEAL }}>
            .prism
          </span>
        </button>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ background: `${TEAL}14`, color: TEAL_DIM }}
        >
          AI
        </span>
      </div>

      {!collapsed && (
        <div className="py-1">
          {/* Editable context files */}
          {editableFiles.map(f => {
            const cur = activeFile === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => navigate({ type: 'prism-file', filename: f.id })}
                className="relative flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
                style={{
                  background: cur ? SURFACE : 'transparent',
                  borderLeft: cur ? `2px solid ${TEAL}` : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!cur) e.currentTarget.style.background = PAGE_BG }}
                onMouseLeave={e => { if (!cur) e.currentTarget.style.background = 'transparent' }}
              >
                <FileText size={11} style={{ color: cur ? TEAL : TEXT_DIM, flexShrink: 0 }} />
                <span className="flex-1 min-w-0 truncate text-[11.5px]" style={{ color: cur ? TEXT : TEXT_DIM }}>
                  {f.id}
                </span>
              </button>
            )
          })}

          {/* sif-registry.md — auto-generated */}
          {(() => {
            const cur = activeFile === 'sif-registry.md'
            return (
              <button
                type="button"
                onClick={() => navigate({ type: 'prism-file', filename: 'sif-registry.md' })}
                className="relative flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors"
                style={{
                  background: cur ? SURFACE : 'transparent',
                  borderLeft: cur ? `2px solid ${TEAL}` : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!cur) e.currentTarget.style.background = PAGE_BG }}
                onMouseLeave={e => { if (!cur) e.currentTarget.style.background = 'transparent' }}
              >
                <RefreshCw size={11} style={{ color: cur ? TEAL : TEXT_DIM, flexShrink: 0 }} />
                <span className="flex-1 min-w-0 truncate text-[11.5px]" style={{ color: cur ? TEXT : TEXT_DIM }}>
                  sif-registry.md
                </span>
                <span
                  className="shrink-0 rounded px-1 text-[8px] font-bold uppercase tracking-widest"
                  style={{ background: `${TEAL}14`, color: TEAL_DIM }}
                >
                  auto
                </span>
              </button>
            )
          })()}

          {/* knowledge/ — bundled, read-only */}
          <div className="mt-0.5 px-2 pb-1">
            <button
              type="button"
              onClick={() => setKnowledgeCollapsed(c => !c)}
              className="flex w-full items-center gap-1.5 rounded px-1 py-1 transition-colors"
              style={{ color: TEXT_DIM }}
              onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
              onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
            >
              <ChevronRight
                size={10}
                className="shrink-0 transition-transform duration-200"
                style={{ transform: knowledgeCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
              />
              <span className="text-[10.5px]">knowledge/</span>
              <Lock size={9} style={{ opacity: 0.5 }} />
            </button>
            {!knowledgeCollapsed && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {knowledgeFiles.map(f => (
                  <div
                    key={f}
                    className="flex items-center gap-2 rounded px-2 py-1"
                  >
                    <FileText size={10} style={{ color: TEXT_DIM, opacity: 0.5, flexShrink: 0 }} />
                    <span className="truncate text-[10.5px]" style={{ color: TEXT_DIM, opacity: 0.5 }}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ProjectSidebar ───────────────────────────────────────────────────────
const MIN_TOP       = 80
const MIN_BOTTOM    = 36
const DEFAULT_SPLIT = 0.60

export function ProjectSidebar({ projectId, sifId }: { projectId: string; sifId: string }) {
  const strings = useLocaleStrings(getShellStrings)
  const { BORDER, PANEL_BG, TEXT, TEXT_DIM, SHADOW_SOFT, isDark } = usePrismTheme()
  const openNewProject  = useAppStore(s => s.openNewProject)
  const openNewSIF      = useAppStore(s => s.openNewSIF)
  const pinnedSIFIds    = useAppStore(s => s.pinnedSIFIds)
  const pinnedCollapsed = useAppStore(s => s.projectSidebarPinnedCollapsed)
  const projectsCollapsed = useAppStore(s => s.projectSidebarProjectsCollapsed)
  const togglePinnedCollapsed = useAppStore(s => s.toggleProjectSidebarPinnedCollapsed)
  const toggleProjectsCollapsed = useAppStore(s => s.toggleProjectSidebarProjectsCollapsed)
  const view            = useAppStore(s => s.view)

  const { pinnedNodeIds, sectionCollapsed: workspaceCollapsed } = useWorkspaceStore()

  const activeNoteId = view.type === 'note' ? view.noteId : null
  const hasPins = pinnedSIFIds.length > 0 || pinnedNodeIds.length > 0

  const [importModalOpen, setImportModalOpen] = useState(false)

  // Sidebar sections live in the app store so they survive view remounts.

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
        boxShadow: `${SHADOW_SOFT}, inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.78)'}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.88)'}`,
      }}
    >
      {/* ── 1. ÉPINGLÉS ── */}
      {hasPins && (
        <div className="shrink-0">
          <SectionHeader
            label={strings.projectSidebar.pinned}
            collapsed={pinnedCollapsed}
            onToggle={togglePinnedCollapsed}
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
          label={strings.projectSidebar.projects}
          collapsed={projectsCollapsed}
          onToggle={toggleProjectsCollapsed}
          actions={
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                title={strings.projectSidebar.newProject}
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
                title={strings.projectSidebar.newSif}
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
                title={strings.projectSidebar.importPrism}
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

      {/* ── 4. .PRISM — Workspace Intelligence ── */}
      <PrismSection />
    </div>
    </>
  )
}
