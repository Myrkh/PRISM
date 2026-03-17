/**
 * layout/ProjectTree.tsx — PRISM
 *
 * Arborescence projets/SIFs dans le panneau gauche.
 * Groupés par client → projet → SIF(s).
 * Pinned SIFs en haut pour accès rapide.
 */
import { useMemo, useState, useEffect } from 'react'
import {
  FileText, ChevronRight, Folder, FolderOpen, Pencil, Pin, Plus,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { calcSIF } from '@/core/math/pfdCalc'
import { cn } from '@/lib/utils'
import { normalizeSIFTab } from '@/store/types'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { StatusIcon } from '@/shared/StatusIcon'

interface Props {
  projectId: string
  sifId: string
}

export function ProjectTree({ projectId, sifId }: Props) {
  const { BORDER, PAGE_BG, PANEL_BG, SHADOW_CARD, SHADOW_SOFT, SURFACE, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const navigate = useAppStore(s => s.navigate)
  const view = useAppStore(s => s.view)
  const projects = useAppStore(s => s.projects)
  const pinnedSIFIds = useAppStore(s => s.pinnedSIFIds)
  const togglePinnedSIF = useAppStore(s => s.togglePinnedSIF)
  const openNewSIF = useAppStore(s => s.openNewSIF)
  const activeTab = view.type === 'sif-dashboard' ? normalizeSIFTab(view.tab) : null
  const currentProject = projects.find(p => p.id === projectId)

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
  const pinnedItems = useMemo(
    () => pinnedSIFIds.map(id => sifLookup.get(id)).filter((x): x is NonNullable<typeof x> => !!x),
    [pinnedSIFIds, sifLookup],
  )

  const pressDown = (target: HTMLElement, shadow: string) => {
    target.style.transform = 'translateY(1px) scale(0.994)'
    target.style.boxShadow = shadow
  }

  const pressUp = (target: HTMLElement, shadow: string) => {
    target.style.transform = 'translateY(0) scale(1)'
    target.style.boxShadow = shadow
  }

  const hoverIn = (target: HTMLElement, {
    background,
    borderColor,
    boxShadow,
    color,
  }: {
    background: string
    borderColor: string
    boxShadow: string
    color?: string
  }) => {
    target.style.backgroundColor = background
    target.style.borderColor = borderColor
    target.style.boxShadow = boxShadow
    target.style.transform = 'translateY(-0.5px) scale(1)'
    if (color) target.style.color = color
  }

  const hoverOut = (target: HTMLElement, {
    background,
    borderColor,
    boxShadow,
    color,
  }: {
    background: string
    borderColor: string
    boxShadow: string
    color?: string
  }) => {
    target.style.backgroundColor = background
    target.style.borderColor = borderColor
    target.style.boxShadow = boxShadow
    target.style.transform = 'translateY(0) scale(1)'
    if (color) target.style.color = color
  }

  // ─── SIF row sub-component ───────────────────────────────────────────────
  const SIFRow = ({
    proj, s, showProject = false, inTree = false,
  }: {
    proj: (typeof projects)[number]
    s: (typeof projects)[number]['sifs'][number]
    showProject?: boolean
    inTree?: boolean
  }) => {
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
                hoverIn(e.currentTarget, {
                  background: PAGE_BG,
                  borderColor: `${BORDER}D0`,
                  boxShadow: SHADOW_SOFT,
                  color: TEXT,
                })
              }
            }}
            onMouseLeave={e => {
              if (!cur) {
                hoverOut(e.currentTarget, {
                  background: 'transparent',
                  borderColor: 'transparent',
                  boxShadow: 'none',
                  color: TEXT_DIM,
                })
              }
              pressUp(e.currentTarget, cur ? SHADOW_CARD : 'none')
            }}
            onPointerDown={e => pressDown(e.currentTarget, SHADOW_SOFT)}
            onPointerUp={e => pressUp(e.currentTarget, cur ? SHADOW_CARD : SHADOW_SOFT)}
            onPointerCancel={e => pressUp(e.currentTarget, cur ? SHADOW_CARD : 'none')}
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
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{s.sifNumber}</p>
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
              hoverIn(e.currentTarget, {
                background: PAGE_BG,
                borderColor: 'transparent',
                boxShadow: SHADOW_SOFT,
                color: isPinned ? TEAL : TEXT,
              })
            }}
            onMouseLeave={e => {
              hoverOut(e.currentTarget, {
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
                    hoverIn(e.currentTarget, {
                      background: PAGE_BG,
                      borderColor: `${BORDER}D0`,
                      boxShadow: SHADOW_SOFT,
                      color: TEXT,
                    })
                  }
                }}
                onMouseLeave={e => {
                  if (!item.active) {
                    hoverOut(e.currentTarget, {
                      background: 'transparent',
                      borderColor: 'transparent',
                      boxShadow: 'none',
                      color: TEXT_DIM,
                    })
                  }
                  pressUp(e.currentTarget, item.active ? SHADOW_SOFT : 'none')
                }}
                onPointerDown={e => pressDown(e.currentTarget, SHADOW_SOFT)}
                onPointerUp={e => pressUp(e.currentTarget, item.active ? SHADOW_SOFT : SHADOW_SOFT)}
                onPointerCancel={e => pressUp(e.currentTarget, item.active ? SHADOW_SOFT : 'none')}
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
    <div
      className="flex-1 overflow-y-auto px-2 py-3 text-[13px]"
      style={{
        color: TEXT,
        background: PANEL_BG,
        boxShadow: `${SHADOW_SOFT}, inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.78)'}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.88)'}, inset 0 -1px 0 ${isDark ? 'rgba(0,0,0,0.24)' : 'rgba(15,23,42,0.05)'}`,
      }}
    >
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Pinned SIFs</p>
      <div className="mb-3 space-y-0.5">
        {pinnedItems.length === 0 ? (
          <div className="px-2 py-1 text-xs italic" style={{ color: TEXT_DIM }}>Pin frequently used SIFs for quick access.</div>
        ) : (
          pinnedItems.map(({ project, sif }) => (
            <SIFRow key={`pin-${sif.id}`} proj={project} s={sif} showProject />
          ))
        )}
      </div>

      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Projects</p>
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
              <button type="button" onClick={() => toggleProject(`p-${proj.id}`)}
                className="relative flex w-full items-center gap-1.5 overflow-hidden rounded-md px-2 py-1.5 font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out"
                style={{
                  color: projectActive ? TEXT : TEXT_DIM,
                  background: projectActive ? SURFACE : 'transparent',
                  border: `1px solid ${projectActive ? (isCurProj ? `${TEAL}24` : `${BORDER}D0`) : 'transparent'}`,
                  boxShadow: projectActive ? SHADOW_CARD : 'none',
                  transform: 'translateY(0) scale(1)',
                }}
                onMouseEnter={e => {
                  if (!projectActive) {
                    hoverIn(e.currentTarget, {
                      background: PAGE_BG,
                      borderColor: `${BORDER}D0`,
                      boxShadow: SHADOW_SOFT,
                      color: TEXT,
                    })
                  }
                }}
                onMouseLeave={e => {
                  if (!projectActive) {
                    hoverOut(e.currentTarget, {
                      background: 'transparent',
                      borderColor: 'transparent',
                      boxShadow: 'none',
                      color: TEXT_DIM,
                    })
                  }
                  pressUp(e.currentTarget, projectActive ? SHADOW_CARD : 'none')
                }}
                onPointerDown={e => pressDown(e.currentTarget, SHADOW_SOFT)}
                onPointerUp={e => pressUp(e.currentTarget, projectActive ? SHADOW_CARD : SHADOW_SOFT)}
                onPointerCancel={e => pressUp(e.currentTarget, projectActive ? SHADOW_CARD : 'none')}>
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
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate">{proj.name}</p>
                  <p className="truncate text-[10px]" style={{ color: TEXT_DIM }}>{[proj.client, proj.ref].filter(Boolean).join(' · ')}</p>
                </div>
                <StatusIcon ok={projOk} />
              </button>
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
                        hoverIn(e.currentTarget, {
                          background: PAGE_BG,
                          borderColor: `${BORDER}D0`,
                          boxShadow: SHADOW_SOFT,
                          color: TEXT,
                        })
                      }}
                      onMouseLeave={e => {
                        hoverOut(e.currentTarget, {
                          background: isDark ? 'rgba(255,255,255,0.015)' : 'transparent',
                          borderColor: isDark ? `${BORDER}66` : 'transparent',
                          boxShadow: 'none',
                          color: TEXT_DIM,
                        })
                      }}
                      onPointerDown={e => pressDown(e.currentTarget, SHADOW_SOFT)}
                      onPointerUp={e => pressUp(e.currentTarget, SHADOW_SOFT)}
                      onPointerCancel={e => pressUp(e.currentTarget, 'none')}
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
    </div>
  )
}
