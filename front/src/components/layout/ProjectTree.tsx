/**
 * layout/ProjectTree.tsx — PRISM
 *
 * Arborescence projets/SIFs dans le panneau gauche.
 * Groupés par client → projet → SIF(s).
 * Pinned SIFs en haut pour accès rapide.
 */
import { useMemo, useState, useEffect } from 'react'
import {
  FileText, ChevronDown, ChevronRight, Folder, Pin, Plus,
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
  const { BORDER, PAGE_BG, TEAL, TEXT, TEXT_DIM } = usePrismTheme()
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
      { id: 'cockpit', label: 'Cockpit', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'cockpit' }), active: cur && activeTab === 'cockpit' },
      { id: 'context', label: 'Contexte', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'context' }), active: cur && activeTab === 'context' },
      { id: 'architecture', label: 'Architecture', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'architecture' }), active: cur && activeTab === 'architecture' },
      { id: 'verification', label: 'Verification', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'verification' }), active: cur && activeTab === 'verification' },
      { id: 'exploitation', label: 'Exploitation', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'exploitation' }), active: cur && activeTab === 'exploitation' },
      { id: 'history', label: 'Historique', onClick: () => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'history' }), active: cur && activeTab === 'history' },
    ]

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <button type="button"
            onClick={() => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'cockpit' })}
            className="w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors flex relative"
            style={{
              backgroundColor: cur ? 'rgba(0, 155, 164, 0.15)' : 'transparent',
              color: cur ? TEXT : TEXT_DIM,
            }}
            onMouseEnter={e => { if (!cur) e.currentTarget.style.backgroundColor = PAGE_BG }}
            onMouseLeave={e => { if (!cur) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            {inTree && <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 h-px w-2" style={{ background: `${BORDER}55` }} />}
            {inTree && cur && <div className="absolute left-[-11px] top-1 bottom-1 w-0.5 bg-teal-400 rounded-full" />}
            <FileText size={13} className="shrink-0" style={{ color: cur ? TEAL : TEXT_DIM }} />
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
            className="rounded p-1 transition-colors"
            style={{ color: isPinned ? TEAL : TEXT_DIM }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = PAGE_BG }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            <Pin size={12} />
          </button>
        </div>

        {inTree && cur && (
          <div className="ml-6 border-l pl-3 py-1 space-y-0.5" style={{ borderColor: `${BORDER}AA` }}>
            {childItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] transition-colors"
                style={{
                  background: item.active ? 'rgba(0, 155, 164, 0.12)' : 'transparent',
                  color: item.active ? TEXT : TEXT_DIM,
                }}
              >
                <ChevronRight size={12} className="shrink-0" style={{ color: item.active ? TEAL : TEXT_DIM }} />
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
    <div className="flex-1 overflow-y-auto px-2 py-3 text-[13px]" style={{ color: TEXT }}>
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
          return (
            <div key={proj.id} className={cn(index > 0 && 'pt-2')} style={index > 0 ? { borderTop: `1px solid ${BORDER}33` } : undefined}>
              <button type="button" onClick={() => toggleProject(`p-${proj.id}`)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-semibold transition-colors"
                style={{ color: isCurProj ? TEXT : TEXT_DIM }}>
                {projOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                <Folder size={15} className="shrink-0" style={{ color: isCurProj ? TEAL : TEXT_DIM }} />
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate">{proj.name}</p>
                  <p className="truncate text-[10px]" style={{ color: TEXT_DIM }}>{[proj.client, proj.ref].filter(Boolean).join(' · ')}</p>
                </div>
                <StatusIcon ok={projOk} />
              </button>
              {projOpen && (
                <div className="mt-0.5 pl-8 relative">
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
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] transition-colors"
                      style={{ color: TEXT_DIM }}
                      title={`Nouvelle SIF dans ${proj.name}`}
                    >
                      <Plus size={11} className="shrink-0" />
                      <span>Nouvelle SIF</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
