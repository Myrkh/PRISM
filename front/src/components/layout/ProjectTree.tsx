/**
 * layout/ProjectTree.tsx — PRISM
 *
 * Arborescence projets/SIFs dans le panneau gauche.
 * Groupés par client → projet → SIF(s).
 * Pinned SIFs en haut pour accès rapide.
 */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import {
  FileText, ChevronRight, Folder, FolderOpen, Pencil, Pin, Plus,
  MoreHorizontal, Download, Upload, Trash2,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { calcSIF } from '@/core/math/pfdCalc'
import { cn } from '@/lib/utils'
import { normalizeSIFTab } from '@/store/types'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { StatusIcon } from '@/shared/StatusIcon'
import { SidebarBody, sidebarHoverIn, sidebarHoverOut, sidebarPressDown, sidebarPressUp } from '@/components/layout/SidebarPrimitives'
import { downloadSIF, downloadProject } from '@/lib/prismFormat'
import { PrismImportModal } from '@/components/PrismImportModal'
import type { Project, SIF } from '@/core/types/sif.types'

// ─── Inline rename input ──────────────────────────────────────────────────
function InlineRenameInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const { BORDER, CARD_BG, TEAL, TEXT } = usePrismTheme()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.select() }, [])
  const commit = useCallback(() => {
    const v = ref.current?.value.trim()
    if (v) onCommit(v)
    else onCancel()
  }, [onCommit, onCancel])
  return (
    <input
      ref={ref}
      defaultValue={initialValue}
      className="min-w-0 flex-1 rounded px-1.5 py-0.5 text-sm outline-none"
      style={{ background: CARD_BG, border: `1px solid ${TEAL}`, color: TEXT, boxShadow: `0 0 0 2px ${TEAL}22` }}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

// ─── Lightweight context menu (shared by project + SIF rows) ─────────────
type TreeMenuItem =
  | { kind: 'action'; label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }
  | { kind: 'separator' }

function TreeContextMenu({ items, onClose }: { items: TreeMenuItem[]; onClose: () => void }) {
  const { CARD_BG, BORDER, TEXT, TEXT_DIM, SHADOW_SOFT } = usePrismTheme()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [onClose])
  return (
    <div
      ref={ref}
      className="absolute z-50 right-0 top-full mt-0.5 rounded-lg py-1 min-w-[180px]"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, boxShadow: `0 8px 24px rgba(0,0,0,0.35), ${SHADOW_SOFT}` }}
      onMouseDown={e => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (item.kind === 'separator') return <div key={i} className="my-1 h-px" style={{ background: BORDER }} />
        return (
          <button
            key={i} type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-left"
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

interface Props {
  projectId: string
  sifId: string
}

export function ProjectTree({ projectId, sifId }: Props) {
  const { BORDER, PAGE_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const navigate = useAppStore(s => s.navigate)
  const view = useAppStore(s => s.view)
  const projects = useAppStore(s => s.projects)
  const pinnedSIFIds = useAppStore(s => s.pinnedSIFIds)
  const togglePinnedSIF = useAppStore(s => s.togglePinnedSIF)
  const openNewSIF = useAppStore(s => s.openNewSIF)
  const activeTab = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : null
  const currentProject = projects.find(p => p.id === projectId)

  const [importModal,      setImportModal]      = useState<{ open: boolean; projectId?: string }>({ open: false })
  const [projectMenuOpen,  setProjectMenuOpen]  = useState<string | null>(null)
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null)
  const deleteProject  = useAppStore(s => s.deleteProject)
  const deleteSIF      = useAppStore(s => s.deleteSIF)
  const updateProject  = useAppStore(s => s.updateProject)
  const updateSIF      = useAppStore(s => s.updateSIF)

  const [openProjects, setOpenProjects] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>()
    if (projectId) initialOpen.add(`p-${projectId}`)
    return initialOpen
  })

  const toggleProject = (k: string) => setOpenProjects(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n
  })

  useEffect(() => {
    if (!projectId) return
    setOpenProjects(prev => {
      const key = `p-${projectId}`
      if (prev.has(key)) return prev
      const n = new Set(prev); n.add(key); return n
    })
  }, [projectId])
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [projects],
  )

  const sifLookup = useMemo(() => {
    const map = new Map<string, { project: (typeof projects)[number]; sif: (typeof projects)[number]['sifs'][number]; ok: boolean }>()
    projects.forEach(proj => {
      proj.sifs.forEach(s => {
        map.set(s.id, {
          project: proj,
          sif: s,
          ok: calcSIF(s, { projectStandard: proj.standard }).meetsTarget,
        })
      })
    })
    return map
  }, [projects])

  const pinnedSet = useMemo(() => new Set(pinnedSIFIds), [pinnedSIFIds])

  // ─── SIF row sub-component ───────────────────────────────────────────────
  const SIFRow = ({
    proj, s, showProject = false, inTree = false,
  }: {
    proj: (typeof projects)[number]
    s: (typeof projects)[number]['sifs'][number]
    showProject?: boolean
    inTree?: boolean
  }) => {
    const [sifMenu, setSifMenu]         = useState(false)
    const [renamingSif, setRenamingSif] = useState(false)
    const ok = sifLookup.get(s.id)?.ok ?? calcSIF(s, { projectStandard: proj.standard }).meetsTarget
    const cur = s.id === sifId && proj.id === projectId
    const isPinned = pinnedSet.has(s.id)
    const childItems = [
      { id: 'cockpit', label: 'Cockpit', marker: '•', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'cockpit' }), active: cur && activeTab === 'cockpit' },
      { id: 'context', label: 'Contexte', marker: '1', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'context' }), active: cur && activeTab === 'context' },
      { id: 'architecture', label: 'Architecture', marker: '2', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'architecture' }), active: cur && activeTab === 'architecture' },
      { id: 'verification', label: 'Verification', marker: '3', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'verification' }), active: cur && activeTab === 'verification' },
      { id: 'exploitation', label: 'Exploitation', marker: '4', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'exploitation' }), active: cur && activeTab === 'exploitation' },
      { id: 'report', label: 'Rapport', marker: '↗', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'report' }), active: cur && activeTab === 'report' },
    ]

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <button type="button"
            onClick={() => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'cockpit' })}
            className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-left transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
            style={{
              backgroundColor: cur ? SURFACE : 'transparent',
              border: `1px solid ${cur ? `${TEAL}24` : 'transparent'}`,
              boxShadow: cur ? SHADOW_CARD : 'none',
              color: cur ? TEXT : TEXT_DIM,
              transform: 'translateY(0) scale(1)',
            }}
            onMouseEnter={e => {
              if (!cur) {
                sidebarHoverIn(e.currentTarget, {
                  background: PAGE_BG,
                  borderColor: `${BORDER}D0`,
                  boxShadow: SHADOW_SOFT,
                  color: TEXT,
                })
              }
            }}
            onMouseLeave={e => {
              if (!cur) {
                sidebarHoverOut(e.currentTarget, {
                  background: 'transparent',
                  borderColor: 'transparent',
                  boxShadow: 'none',
                  color: TEXT_DIM,
                })
              }
              sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : 'none')
            }}
            onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
            onPointerUp={e => sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : SHADOW_SOFT)}
            onPointerCancel={e => sidebarPressUp(e.currentTarget, cur ? SHADOW_CARD : 'none')}
          >
            <div
              className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
              style={{
                background: TEAL,
                opacity: cur ? 1 : 0,
                transform: `translateX(${cur ? '0px' : '-1px'}) scaleY(${cur ? 1 : 0.6})`,
              }}
            />
            {inTree && <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 h-px w-2" style={{ background: `${BORDER}55` }} />}
            <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
              <FileText size={13} style={{ color: cur ? TEAL : TEXT_DIM }} />
              <span
                className="pointer-events-none absolute -bottom-0.5 -right-1 inline-flex h-3 w-3 items-center justify-center rounded-full transition-[opacity,transform] duration-150 ease-out"
                style={{
                  background: SURFACE,
                  boxShadow: SHADOW_SOFT,
                  opacity: cur ? 1 : 0,
                  transform: cur ? 'translateY(0) scale(1)' : 'translateY(1px) scale(0.72)',
                }}
              >
                <Pencil size={8} style={{ color: TEAL }} />
              </span>
            </span>
            <div className="min-w-0 flex-1" onDoubleClick={e => { e.stopPropagation(); setRenamingSif(true) }}>
              {renamingSif ? (
                <InlineRenameInput
                  initialValue={s.sifNumber}
                  onCommit={name => { void updateSIF(proj.id, s.id, { sifNumber: name }); setRenamingSif(false) }}
                  onCancel={() => setRenamingSif(false)}
                />
              ) : (
                <p className="truncate text-sm">{s.sifNumber}</p>
              )}
              {showProject && (
                <p className="truncate text-[10px]" style={{ color: TEXT_DIM }}>{proj.name}</p>
              )}
            </div>
            <StatusIcon ok={ok} />
          </button>
          <button type="button" title={isPinned ? 'Unpin SIF' : 'Pin SIF'}
            onClick={() => togglePinnedSIF(s.id)}
            className="rounded p-1 transition-[background-color,color,box-shadow,transform] duration-150 ease-out"
            style={{ color: isPinned ? TEAL : TEXT_DIM, boxShadow: isPinned ? SHADOW_SOFT : 'none', transform: 'translateY(0) scale(1)' }}
            onMouseEnter={e => {
              sidebarHoverIn(e.currentTarget, {
                background: PAGE_BG,
                borderColor: 'transparent',
                boxShadow: SHADOW_SOFT,
                color: isPinned ? TEAL : TEXT,
              })
            }}
            onMouseLeave={e => {
              sidebarHoverOut(e.currentTarget, {
                background: 'transparent',
                borderColor: 'transparent',
                boxShadow: isPinned ? SHADOW_SOFT : 'none',
                color: isPinned ? TEAL : TEXT_DIM,
              })
            }}
            onPointerDown={e => {
              e.currentTarget.style.transform = 'translateY(1px) scale(0.96)'
              e.currentTarget.style.boxShadow = SHADOW_SOFT
            }}
            onPointerUp={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = SHADOW_SOFT
            }}
            onPointerCancel={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = isPinned ? SHADOW_SOFT : 'none'
            }}>
            <Pin size={12} />
          </button>

          {/* ⋯ SIF context menu */}
          <div className="relative shrink-0">
            <button
              type="button" title="Actions"
              className="flex h-6 w-6 items-center justify-center rounded transition-colors"
              style={{ color: TEXT_DIM }}
              onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
              onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
              onClick={e => { e.stopPropagation(); setSifMenu(v => !v) }}
            >
              <MoreHorizontal size={13} />
            </button>
            {sifMenu && (
              <TreeContextMenu
                onClose={() => setSifMenu(false)}
                items={[
                  {
                    kind: 'action', label: 'Renommer', icon: <Pencil size={12} />,
                    onClick: () => setRenamingSif(true),
                  },
                  {
                    kind: 'action', label: 'Exporter (.prism)', icon: <Download size={12} />,
                    onClick: () => downloadSIF(s as unknown as SIF, proj as unknown as Project),
                  },
                  { kind: 'separator' },
                  {
                    kind: 'action', label: 'Supprimer', icon: <Trash2 size={12} />, danger: true,
                    onClick: () => { void deleteSIF(proj.id, s.id) },
                  },
                ]}
              />
            )}
          </div>
        </div>

        {inTree && (
          <div
            className="ml-6 space-y-0.5 overflow-hidden border-l pl-3 transition-[max-height,opacity,transform,padding] duration-200"
            style={{
              borderColor: `${BORDER}AA`,
              maxHeight: cur ? `${childItems.length * 34 + 12}px` : '0px',
              opacity: cur ? 1 : 0,
              transform: cur ? 'translateY(0)' : 'translateY(-6px)',
              pointerEvents: cur ? 'auto' : 'none',
              paddingTop: cur ? '4px' : '0px',
              paddingBottom: cur ? '4px' : '0px',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {childItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2.5 py-1.5 text-left text-[12px] transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                style={{
                  background: item.active ? SURFACE : 'transparent',
                  border: `1px solid ${item.active ? `${TEAL}24` : 'transparent'}`,
                  boxShadow: item.active ? SHADOW_SOFT : 'none',
                  color: item.active ? TEXT : TEXT_DIM,
                  transform: 'translateY(0) scale(1)',
                }}
                onMouseEnter={e => {
                  if (!item.active) {
                    sidebarHoverIn(e.currentTarget, {
                      background: PAGE_BG,
                      borderColor: `${BORDER}D0`,
                      boxShadow: SHADOW_SOFT,
                      color: TEXT,
                    })
                  }
                }}
                onMouseLeave={e => {
                  if (!item.active) {
                    sidebarHoverOut(e.currentTarget, {
                      background: 'transparent',
                      borderColor: 'transparent',
                      boxShadow: 'none',
                      color: TEXT_DIM,
                    })
                  }
                  sidebarPressUp(e.currentTarget, item.active ? SHADOW_SOFT : 'none')
                }}
                onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
                onPointerUp={e => sidebarPressUp(e.currentTarget, item.active ? SHADOW_SOFT : SHADOW_SOFT)}
                onPointerCancel={e => sidebarPressUp(e.currentTarget, item.active ? SHADOW_SOFT : 'none')}
              >
                <div
                  className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
                  style={{
                    background: TEAL,
                    opacity: item.active ? 1 : 0,
                    transform: `translateX(${item.active ? '0px' : '-1px'}) scaleY(${item.active ? 1 : 0.6})`,
                  }}
                />
                <span
                  className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border px-1 text-[9px] font-bold font-mono transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                  style={{
                    borderColor: item.active ? `${TEAL}28` : `${BORDER}A0`,
                    background: item.active ? `${TEAL}10` : PAGE_BG,
                    color: item.active ? TEAL : TEXT_DIM,
                    boxShadow: item.active ? SHADOW_SOFT : 'none',
                    transform: item.active ? 'scale(1)' : 'scale(0.96)',
                  }}
                >
                  {item.marker}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
    {importModal.open && (
      <PrismImportModal
        defaultProjectId={importModal.projectId}
        onClose={() => setImportModal({ open: false })}
      />
    )}
    <SidebarBody>
      <div className="space-y-2">
        {sortedProjects.map((proj, index) => {
          const projOpen = openProjects.has(`p-${proj.id}`)
          const projOk = proj.sifs.length === 0 ||
            proj.sifs
              .map(sif => calcSIF(sif, { projectStandard: proj.standard }))
              .every(result => result.meetsTarget)
          const isCurProj = proj.id === projectId
          const projectActive = projOpen || isCurProj
          return (
            <div key={proj.id} className={cn(index > 0 && 'pt-2')} style={index > 0 ? { borderTop: `1px solid ${BORDER}33` } : undefined}>
              {/* Project header row: toggle button + ⋯ menu */}
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => toggleProject(`p-${proj.id}`)}
                  className="relative flex flex-1 min-w-0 items-center gap-1.5 overflow-hidden rounded-md px-2 py-1.5 font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                  style={{
                    color: projectActive ? TEXT : TEXT_DIM,
                    background: projectActive ? SURFACE : 'transparent',
                    border: `1px solid ${projectActive ? (isCurProj ? `${TEAL}24` : `${BORDER}D0`) : 'transparent'}`,
                    boxShadow: projectActive ? SHADOW_CARD : 'none',
                    transform: 'translateY(0) scale(1)',
                  }}
                  onMouseEnter={e => {
                    if (!projectActive) {
                      sidebarHoverIn(e.currentTarget, {
                        background: PAGE_BG,
                        borderColor: `${BORDER}D0`,
                        boxShadow: SHADOW_SOFT,
                        color: TEXT,
                      })
                    }
                  }}
                  onMouseLeave={e => {
                    if (!projectActive) {
                      sidebarHoverOut(e.currentTarget, {
                        background: 'transparent',
                        borderColor: 'transparent',
                        boxShadow: 'none',
                        color: TEXT_DIM,
                      })
                    }
                    sidebarPressUp(e.currentTarget, projectActive ? SHADOW_CARD : 'none')
                  }}
                  onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
                  onPointerUp={e => sidebarPressUp(e.currentTarget, projectActive ? SHADOW_CARD : SHADOW_SOFT)}
                  onPointerCancel={e => sidebarPressUp(e.currentTarget, projectActive ? SHADOW_CARD : 'none')}>
                  <div
                    className="pointer-events-none absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-[opacity,transform] duration-150 ease-out"
                    style={{
                      background: TEAL,
                      opacity: projectActive ? 1 : 0,
                      transform: `translateX(${projectActive ? '0px' : '-1px'}) scaleY(${projectActive ? 1 : 0.6})`,
                    }}
                  />
                  <ChevronRight
                    size={14}
                    className="shrink-0 transition-transform duration-200"
                    style={{ transform: projOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  />
                  {projOpen ? (
                    <FolderOpen size={15} className="shrink-0" style={{ color: projectActive ? TEAL : TEXT_DIM }} />
                  ) : (
                    <Folder size={15} className="shrink-0" style={{ color: projectActive ? TEAL : TEXT_DIM }} />
                  )}
                  <div className="min-w-0 flex-1 text-left" onDoubleClick={e => { e.stopPropagation(); setRenamingProjectId(proj.id) }}>
                    {renamingProjectId === proj.id ? (
                      <InlineRenameInput
                        initialValue={proj.name}
                        onCommit={name => { void updateProject(proj.id, { name }); setRenamingProjectId(null) }}
                        onCancel={() => setRenamingProjectId(null)}
                      />
                    ) : (
                      <p className="truncate">{proj.name}</p>
                    )}
                    <p className="truncate text-[10px]" style={{ color: TEXT_DIM }}>{[proj.client, proj.ref].filter(Boolean).join(' · ')}</p>
                  </div>
                  <StatusIcon ok={projOk} />
                </button>

                {/* ⋯ project context menu */}
                <div className="relative shrink-0">
                  <button
                    type="button" title="Actions projet"
                    className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                    style={{ color: TEXT_DIM }}
                    onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
                    onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
                    onClick={e => { e.stopPropagation(); setProjectMenuOpen(v => v === proj.id ? null : proj.id) }}
                  >
                    <MoreHorizontal size={13} />
                  </button>
                  {projectMenuOpen === proj.id && (
                    <TreeContextMenu
                      onClose={() => setProjectMenuOpen(null)}
                      items={[
                        {
                          kind: 'action', label: 'Renommer', icon: <Pencil size={12} />,
                          onClick: () => setRenamingProjectId(proj.id),
                        },
                        {
                          kind: 'action', label: 'Exporter projet (.prism)', icon: <Download size={12} />,
                          onClick: () => downloadProject(proj as unknown as Project),
                        },
                        {
                          kind: 'action', label: 'Importer une SIF…', icon: <Upload size={12} />,
                          onClick: () => setImportModal({ open: true, projectId: proj.id }),
                        },
                        { kind: 'separator' },
                        {
                          kind: 'action', label: 'Supprimer le projet', icon: <Trash2 size={12} />, danger: true,
                          onClick: () => { void deleteProject(proj.id) },
                        },
                      ]}
                    />
                  )}
                </div>
              </div>
              <div
                className="overflow-hidden transition-[max-height,opacity,transform,padding] duration-200"
                style={{
                  maxHeight: projOpen
                    ? `${Math.max(96, proj.sifs.length * 92 + (isCurProj ? 232 : 0) + 72)}px`
                    : '0px',
                  opacity: projOpen ? 1 : 0,
                  transform: projOpen ? 'translateY(0)' : 'translateY(-6px)',
                  pointerEvents: projOpen ? 'auto' : 'none',
                  paddingTop: projOpen ? '4px' : '0px',
                  paddingBottom: projOpen ? '2px' : '0px',
                  transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <div className="relative mt-0.5 pl-8">
                  <div className="absolute left-[15px] top-0 bottom-0 w-px" style={{ background: `${BORDER}55` }} />
                  <div className="space-y-0.5 py-1">
                    {proj.sifs.length === 0 && (
                      <div className="px-2 py-1 text-xs italic" style={{ color: TEXT_DIM }}>Aucune SIF dans ce projet.</div>
                    )}
                    {proj.sifs
                      .slice()
                      .sort((left, right) => left.sifNumber.localeCompare(right.sifNumber, 'fr', { sensitivity: 'base' }))
                      .map(s => (
                        <SIFRow key={s.id} proj={proj} s={s} inTree />
                      ))}
                    {/* Bouton + SIF contextuel au projet */}
                    <button
                      type="button"
                      onClick={() => openNewSIF(proj.id)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                      style={{
                        color: TEXT_DIM,
                        background: isDark ? 'rgba(255,255,255,0.015)' : 'transparent',
                        border: `1px solid ${isDark ? `${BORDER}66` : 'transparent'}`,
                        transform: 'translateY(0) scale(1)',
                      }}
                      onMouseEnter={e => {
                        sidebarHoverIn(e.currentTarget, {
                          background: PAGE_BG,
                          borderColor: `${BORDER}D0`,
                          boxShadow: SHADOW_SOFT,
                          color: TEXT,
                        })
                      }}
                      onMouseLeave={e => {
                        sidebarHoverOut(e.currentTarget, {
                          background: isDark ? 'rgba(255,255,255,0.015)' : 'transparent',
                          borderColor: isDark ? `${BORDER}66` : 'transparent',
                          boxShadow: 'none',
                          color: TEXT_DIM,
                        })
                      }}
                      onPointerDown={e => sidebarPressDown(e.currentTarget, SHADOW_SOFT)}
                      onPointerUp={e => sidebarPressUp(e.currentTarget, SHADOW_SOFT)}
                      onPointerCancel={e => sidebarPressUp(e.currentTarget, 'none')}
                      title={`Nouvelle SIF dans ${proj.name}`}
                    >
                      <Plus size={11} className="shrink-0" />
                      <span>Nouvelle SIF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </SidebarBody>
    </>
  )
}
