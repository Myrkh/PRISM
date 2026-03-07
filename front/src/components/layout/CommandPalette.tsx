import { useState, useEffect, useRef } from 'react'
import { useAppStore, type SIFTab } from '@/store/appStore'
import {
  Search, Settings, Moon, Sun, FolderPlus, FilePlus,
  LayoutDashboard, Network, BarChart3, Shield, FlaskConical,
  FileText, Home, ChevronRight, Pencil, Keyboard, ListChecks, History,
} from 'lucide-react'
import { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark } from '@/styles/tokens'

const PANEL = dark.panel

// ─── Design tokens PRISM dark ─────────────────────────────────────────────
// ─── Tab config ───────────────────────────────────────────────────────────
const TABS: { id: SIFTab; label: string; Icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Dashboard',   Icon: LayoutDashboard },
  { id: 'architecture', label: 'Loop Editor', Icon: Network         },
  { id: 'analysis',     label: 'Calculations',Icon: BarChart3       },
  { id: 'compliance',   label: 'Compliance',  Icon: Shield          },
  { id: 'prooftest',    label: 'Proof Test',  Icon: FlaskConical    },
  { id: 'report',       label: 'Reports',     Icon: FileText        },
]

export function CommandPalette({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [open, setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const projects        = useAppStore(s => s.projects)
  const view            = useAppStore(s => s.view)
  const navigate        = useAppStore(s => s.navigate)
  const setTab          = useAppStore(s => s.setTab)
  const isDark          = useAppStore(s => s.isDark)
  const toggleTheme     = useAppStore(s => s.toggleTheme)
  const openNewProject  = useAppStore(s => s.openNewProject)
  const openNewSIF      = useAppStore(s => s.openNewSIF)
  const openEditProject = useAppStore(s => s.openEditProject)
  const openEditSIF     = useAppStore(s => s.openEditSIF)

  // Projet + SIF courants (si on est dans un dashboard)
  const currentProjectId = view.type === 'sif-dashboard' ? view.projectId : null
  const currentSifId     = view.type === 'sif-dashboard' ? view.sifId     : null
  const currentProject   = currentProjectId ? projects.find(p => p.id === currentProjectId) : null
  const currentSif       = currentProject && currentSifId
    ? currentProject.sifs.find(s => s.id === currentSifId)
    : null

  // ─ Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open) { setSearch(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  const run = (fn: () => void) => { setOpen(false); fn() }

  // ─ Groups ─────────────────────────────────────────────────────────────

  // Groupe : Vue courante (contextuel)
  const currentViewGroup = currentSif && currentProject ? {
    heading: `${currentSif.sifNumber} — ${currentSif.title || 'Sans titre'}`,
    items: [
      ...TABS.map(tab => ({
        label: `Aller à ${tab.label}`,
        keywords: `tab ${tab.id} ${tab.label}`,
        Icon: tab.Icon,
        onSelect: () => run(() => setTab(tab.id)),
        isActive: view.type === 'sif-dashboard' && view.tab === tab.id,
      })),
      {
        label: 'Modifier cette SIF',
        keywords: 'éditer modifier sif',
        Icon: Pencil,
        onSelect: () => run(() => openEditSIF(currentSif.id)),
        isActive: false,
      },
    ],
  } : null

  // Groupe : Créer
  const createGroup = {
    heading: 'Créer',
    items: [
      {
        label: 'Nouveau projet',
        keywords: 'créer nouveau projet new project',
        Icon: FolderPlus,
        onSelect: () => run(openNewProject),
        isActive: false,
      },
      {
        label: currentProject
          ? `Nouvelle SIF dans ${currentProject.name}`
          : 'Nouvelle SIF',
        keywords: 'créer nouvelle sif new',
        Icon: FilePlus,
        onSelect: () => run(() => openNewSIF(currentProjectId ?? undefined)),
        isActive: false,
      },
    ],
  }

  // Groupe : Navigation projets
  const projectsGroup = {
    heading: 'Projets',
    items: projects.map(p => ({
      label: p.name,
      keywords: `projet project ${p.name} ${p.ref} ${p.client}`,
      Icon: FolderPlus,
      onSelect: () => run(() => {
        const firstSif = p.sifs[0]
        if (firstSif) navigate({ type: 'sif-dashboard', projectId: p.id, sifId: firstSif.id, tab: 'overview' })
        else navigate({ type: 'projects' })
      }),
      isActive: currentProjectId === p.id,
    })),
  }

  // Groupe : Navigation SIFs (toutes)
  const sifsGroup = {
    heading: 'SIFs',
    items: projects.flatMap(p =>
      p.sifs.map(s => ({
        label: `${s.sifNumber}${s.title ? ' — ' + s.title : ''}`,
        keywords: `sif ${s.sifNumber} ${s.title} ${s.processTag} ${p.name}`,
        Icon: Shield,
        meta: p.name,
        onSelect: () => run(() => navigate({ type: 'sif-dashboard', projectId: p.id, sifId: s.id, tab: 'overview' })),
        isActive: currentSifId === s.id,
      }))
    ),
  }

  // Groupe : Général
  const generalGroup = {
    heading: 'Général',
    items: [
      {
        label: 'Tableau de bord (accueil)',
        keywords: 'accueil home dashboard projets',
        Icon: Home,
        onSelect: () => run(() => navigate({ type: 'projects' })),
        isActive: view.type === 'projects',
      },
      {
        label: isDark ? 'Passer en mode clair' : 'Passer en mode sombre',
        keywords: 'theme dark light mode',
        Icon: isDark ? Sun : Moon,
        onSelect: () => run(toggleTheme),
        isActive: false,
      },
      {
        label: 'Review Queue',
        keywords: 'review queue backlog priorités',
        Icon: ListChecks,
        onSelect: () => run(() => navigate({ type: 'review-queue' })),
        isActive: view.type === 'review-queue',
      },
      {
        label: 'Audit Log',
        keywords: 'audit log historique timeline',
        Icon: History,
        onSelect: () => run(() => navigate({ type: 'audit-log' })),
        isActive: view.type === 'audit-log',
      },
      {
        label: 'Paramètres',
        keywords: 'settings paramètres',
        Icon: Settings,
        onSelect: () => run(onOpenSettings),
        isActive: false,
      },
    ],
  }

  // Filtrage par search
  const filterItems = (items: typeof generalGroup.items) => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    )
  }

  const groups = [
    ...(currentViewGroup ? [currentViewGroup] : []),
    createGroup,
    projectsGroup,
    sifsGroup,
    generalGroup,
  ].map(g => ({ ...g, items: filterItems(g.items as typeof generalGroup.items) }))
    .filter(g => g.items.length > 0)

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs transition-colors"
        style={{ color: TEXT_DIM, border: `1px solid ${BORDER}`, background: 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEXT }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_DIM }}
      >
        <Search size={13} />
        Actions rapides
        <span className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold"
          style={{ background: '#0C1117', border: `1px solid ${BORDER}`, color: TEXT_DIM }}>
          ⌘K
        </span>
      </button>

      {/* Overlay — z-[60] pour passer au-dessus du header z-50 */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={() => setOpen(false)}
        >
          {/* Palette */}
          <div
            className="relative flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
            style={{
              background: PANEL, borderColor: BORDER,
              width: '90%', maxWidth: 580,
              maxHeight: '70vh',
              boxShadow: `0 0 0 1px ${BORDER}, 0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${TEAL}08`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 border-b shrink-0"
              style={{ borderColor: BORDER }}>
              <Search size={15} style={{ color: TEXT_DIM, flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setOpen(false)}
                placeholder="Rechercher une action, SIF, projet…"
                className="flex-1 h-12 bg-transparent text-sm outline-none"
                style={{ color: TEXT }}
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ color: TEXT_DIM, border: `1px solid ${BORDER}` }}>
                  esc
                </button>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto py-2">
              {groups.length === 0 && (
                <div className="py-12 text-center text-sm" style={{ color: TEXT_DIM }}>
                  Aucun résultat pour « {search} »
                </div>
              )}

              {groups.map(group => (
                <div key={group.heading} className="mb-1">
                  {/* Group heading */}
                  <p className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: TEXT_DIM }}>
                    {group.heading}
                  </p>

                  {/* Items */}
                  {(group.items as typeof generalGroup.items).map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onSelect}
                      className="group w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1D232A')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Icon */}
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: item.isActive ? `${TEAL}20` : '#1D232A',
                          border: `1px solid ${item.isActive ? TEAL + '50' : BORDER}`,
                        }}>
                        <item.Icon size={13} style={{ color: item.isActive ? TEAL : TEXT_DIM }} />
                      </div>

                      {/* Label + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: item.isActive ? TEAL_DIM : TEXT }}>
                          {item.label}
                        </p>
                        {'meta' in item && item.meta && (
                          <p className="text-[10px] truncate" style={{ color: TEXT_DIM }}>{item.meta as string}</p>
                        )}
                      </div>

                      {/* Active indicator */}
                      {item.isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${TEAL}20`, color: TEAL_DIM, border: `1px solid ${TEAL}40` }}>
                          Actif
                        </span>
                      )}

                      <ChevronRight size={12} style={{ color: BORDER, flexShrink: 0 }} className="group-hover:opacity-100 opacity-0 transition-opacity" />
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 shrink-0 border-t"
              style={{ borderColor: BORDER }}>
              <span className="text-[10px]" style={{ color: TEXT_DIM }}>
                <kbd className="font-mono px-1 rounded" style={{ border: `1px solid ${BORDER}` }}>↑↓</kbd> naviguer
              </span>
              <span className="text-[10px]" style={{ color: TEXT_DIM }}>
                <kbd className="font-mono px-1 rounded" style={{ border: `1px solid ${BORDER}` }}>↵</kbd> sélectionner
              </span>
              <span className="text-[10px]" style={{ color: TEXT_DIM }}>
                <kbd className="font-mono px-1 rounded" style={{ border: `1px solid ${BORDER}` }}>esc</kbd> fermer
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
