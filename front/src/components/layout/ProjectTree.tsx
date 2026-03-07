/**
 * layout/ProjectTree.tsx — PRISM
 *
 * Arborescence projets/SIFs dans le panneau gauche.
 * Groupés par client → projet → SIF(s).
 * Pinned SIFs en haut pour accès rapide.
 */
import { useMemo, useState, useEffect } from 'react'
import {
  FileText, ChevronDown, ChevronRight, Folder, Building2, Pin,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { calcSIF } from '@/core/math/pfdCalc'
import { cn } from '@/lib/utils'
import { BORDER, TEAL, TEXT, TEXT_DIM } from '@/styles/tokens'
import { StatusIcon } from '@/shared/StatusIcon'

interface Props {
  projectId: string
  sifId: string
}

export function ProjectTree({ projectId, sifId }: Props) {
  const navigate = useAppStore(s => s.navigate)
  const projects = useAppStore(s => s.projects)
  const pinnedSIFIds = useAppStore(s => s.pinnedSIFIds)
  const togglePinnedSIF = useAppStore(s => s.togglePinnedSIF)
  const currentProject = projects.find(p => p.id === projectId)

  const normalizeClient = (client: string | undefined) => {
    const v = (client ?? '').trim()
    return v || 'Unassigned client'
  }

  const currentClientKey = currentProject ? normalizeClient(currentProject.client).toLowerCase() : null

  const [openClients, setOpenClients] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>()
    if (currentClientKey) initialOpen.add(`c-${currentClientKey}`)
    return initialOpen
  })

  const [openProjects, setOpenProjects] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>()
    if (projectId) initialOpen.add(`p-${projectId}`)
    return initialOpen
  })

  const toggleClient = (k: string) => setOpenClients(prev => {
    const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n
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

  useEffect(() => {
    if (!currentClientKey) return
    setOpenClients(prev => {
      const key = `c-${currentClientKey}`
      if (prev.has(key)) return prev
      const n = new Set(prev); n.add(key); return n
    })
  }, [currentClientKey])

  const clientGroups = useMemo(() => {
    const map = new Map<string, { label: string; projects: typeof projects }>()
    projects.forEach(proj => {
      const label = normalizeClient(proj.client)
      const key = label.toLowerCase()
      const existing = map.get(key)
      if (existing) existing.projects.push(proj)
      else map.set(key, { label, projects: [proj] as typeof projects })
    })

    return Array.from(map.entries())
      .map(([key, group]) => ({
        key,
        label: group.label,
        projects: [...group.projects].sort((a, b) =>
          a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
        ),
        sifCount: group.projects.reduce((acc, p) => acc + p.sifs.length, 0),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }))
  }, [projects])

  const sifLookup = useMemo(() => {
    const map = new Map<string, { project: (typeof projects)[number]; sif: (typeof projects)[number]['sifs'][number]; ok: boolean }>()
    projects.forEach(proj => {
      proj.sifs.forEach(s => {
        map.set(s.id, { project: proj, sif: s, ok: calcSIF(s).meetsTarget })
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
    const ok = sifLookup.get(s.id)?.ok ?? calcSIF(s).meetsTarget
    const cur = s.id === sifId && proj.id === projectId
    const isPinned = pinnedSet.has(s.id)

    return (
      <div className="flex items-center gap-1">
        <button type="button"
          onClick={() => navigate({ type: 'sif-dashboard', projectId: proj.id, sifId: s.id, tab: 'overview' })}
          className="w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors flex relative"
          style={{
            backgroundColor: cur ? 'rgba(0, 155, 164, 0.15)' : 'transparent',
            color: cur ? TEXT : '#C1CDD8',
          }}
          onMouseEnter={e => { if (!cur) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { if (!cur) e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          {inTree && <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 h-px w-2 bg-white/10" />}
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
          className="rounded p-1 transition-colors hover:bg-white/10"
          style={{ color: isPinned ? TEAL : TEXT_DIM }}>
          <Pin size={12} />
        </button>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto px-2 py-3 text-[13px]" style={{ color: TEXT }}>
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Pinned SIFs</p>
      <div className="mb-3 space-y-0.5">
        {pinnedItems.length === 0 ? (
          <div className="px-2 py-1 text-xs italic text-white/35">Pin frequently used SIFs for quick access.</div>
        ) : (
          pinnedItems.map(({ project, sif }) => (
            <SIFRow key={`pin-${sif.id}`} proj={project} s={sif} showProject />
          ))
        )}
      </div>

      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>Clients</p>
      {clientGroups.map((group, gi) => {
        const clientOpen = openClients.has(`c-${group.key}`)
        return (
          <div key={group.key} className={cn(gi > 0 && 'mt-3 pt-3 border-t border-white/10')}>
            <button type="button" onClick={() => toggleClient(`c-${group.key}`)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-semibold transition-colors hover:bg-white/5"
              style={{ color: TEXT_DIM }}>
              {clientOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
              <Building2 size={14} className="shrink-0" style={{ color: TEAL }} />
              <span className="flex-1 truncate text-left">{group.label}</span>
              <span className="text-[10px] font-mono" style={{ color: TEXT_DIM }}>
                {group.projects.length}P · {group.sifCount}S
              </span>
            </button>

            {clientOpen && (
              <div className="mt-0.5 pl-2 space-y-1">
                {group.projects.map(proj => {
                  const projOpen = openProjects.has(`p-${proj.id}`)
                  const projOk = proj.sifs.length === 0 || proj.sifs.map(calcSIF).every(r => r.meetsTarget)
                  const isCurProj = proj.id === projectId
                  return (
                    <div key={proj.id}>
                      <button type="button" onClick={() => toggleProject(`p-${proj.id}`)}
                        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-semibold transition-colors hover:bg-white/5"
                        style={{ color: isCurProj ? TEXT : TEXT_DIM }}>
                        {projOpen ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
                        <Folder size={15} className="shrink-0" style={{ color: isCurProj ? TEAL : TEXT_DIM }} />
                        <span className="flex-1 truncate text-left">{proj.name}</span>
                        <StatusIcon ok={projOk} />
                      </button>
                      {projOpen && (
                        <div className="mt-0.5 pl-8 relative">
                          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/10" />
                          <div className="space-y-0.5 py-1">
                            {proj.sifs.length === 0 && (
                              <div className="px-2 py-1 text-xs text-white/40 italic">No SIFs in this project.</div>
                            )}
                            {proj.sifs.map(s => (
                              <SIFRow key={s.id} proj={proj} s={s} inTree />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
