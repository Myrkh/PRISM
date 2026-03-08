import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore, type SIFTab } from '@/store/appStore'
import {
  Search, Settings, Moon, Sun, FolderPlus, FilePlus,
  LayoutDashboard, Network, BarChart3, Shield, FlaskConical,
  FileText, Home, ChevronRight, Pencil, ListChecks, History,
  ClipboardCheck, Cpu, FileWarning, Lightbulb,
} from 'lucide-react'
import { BORDER, TEAL, TEAL_DIM, TEXT, TEXT_DIM, dark } from '@/styles/tokens'

const PANEL = dark.panel

const TABS: { id: SIFTab; label: string; Icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'architecture', label: 'Loop Editor',  Icon: Network },
  { id: 'analysis',     label: 'Calculations', Icon: BarChart3 },
  { id: 'compliance',   label: 'Compliance',   Icon: Shield },
  { id: 'prooftest',    label: 'Proof Test',   Icon: FlaskConical },
  { id: 'report',       label: 'Reports',      Icon: FileText },
]

type CommandItem = {
  id: string
  label: string
  keywords: string
  Icon: React.ElementType
  onSelect: () => void
  isActive: boolean
  meta?: string
  level?: 0 | 1
}

type CommandGroup = {
  heading: string
  items: CommandItem[]
}

export function CommandPalette({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const projects = useAppStore(s => s.projects)
  const view = useAppStore(s => s.view)
  const navigate = useAppStore(s => s.navigate)
  const setTab = useAppStore(s => s.setTab)
  const setRightPanelTab = useAppStore(s => s.setRightPanelTab)
  const isDark = useAppStore(s => s.isDark)
  const toggleTheme = useAppStore(s => s.toggleTheme)
  const openNewProject = useAppStore(s => s.openNewProject)
  const openNewSIF = useAppStore(s => s.openNewSIF)
  const openEditProject = useAppStore(s => s.openEditProject)
  const openEditSIF = useAppStore(s => s.openEditSIF)

  const currentProjectId = view.type === 'sif-dashboard' ? view.projectId : null
  const currentSifId = view.type === 'sif-dashboard' ? view.sifId : null
  const currentProject = currentProjectId ? projects.find(project => project.id === currentProjectId) ?? null : null
  const currentSif = currentProject && currentSifId
    ? currentProject.sifs.find(sif => sif.id === currentSifId) ?? null
    : null

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(prev => !prev)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])

  const run = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  const goToTab = (tab: SIFTab) => run(() => setTab(tab))
  const goToRightPanelTab = (tab: SIFTab, section: 'analysis' | 'compliance' | 'prooftest', panelTab: string) =>
    run(() => {
      setRightPanelTab(section, panelTab)
      setTab(tab)
    })

  const currentViewGroup: CommandGroup | null = currentSif && currentProject ? {
    heading: `${currentSif.sifNumber} — ${currentSif.title || 'Untitled'}`,
    items: [
      {
        id: 'goto-overview',
        label: 'Go to Dashboard',
        keywords: 'go dashboard overview accueil tableau de bord',
        Icon: LayoutDashboard,
        onSelect: () => goToTab('overview'),
        isActive: view.type === 'sif-dashboard' && view.tab === 'overview',
        level: 0,
      },
      {
        id: 'goto-architecture',
        label: 'Go to Loop Editor',
        keywords: 'go architecture loop editor éditeur boucle',
        Icon: Network,
        onSelect: () => goToTab('architecture'),
        isActive: view.type === 'sif-dashboard' && view.tab === 'architecture',
        level: 0,
      },
      {
        id: 'goto-analysis',
        label: 'Go to Calculations',
        keywords: 'go calculations analysis calculs analyse',
        Icon: BarChart3,
        onSelect: () => goToTab('analysis'),
        isActive: view.type === 'sif-dashboard' && view.tab === 'analysis',
        level: 0,
      },
      {
        id: 'goto-analysis-general',
        label: 'General panel',
        keywords: 'analysis panel general calculations right panel panneau général',
        Icon: ClipboardCheck,
        onSelect: () => goToRightPanelTab('analysis', 'analysis', 'general'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-analysis-curve',
        label: 'Curve panel',
        keywords: 'analysis panel curve calculations right panel panneau courbe',
        Icon: BarChart3,
        onSelect: () => goToRightPanelTab('analysis', 'analysis', 'chart'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-analysis-pie',
        label: 'Pie panel',
        keywords: 'analysis panel pie calculations right panel panneau camembert',
        Icon: BarChart3,
        onSelect: () => goToRightPanelTab('analysis', 'analysis', 'pie'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-compliance',
        label: 'Go to Compliance',
        keywords: 'go compliance conformité',
        Icon: Shield,
        onSelect: () => goToTab('compliance'),
        isActive: view.type === 'sif-dashboard' && view.tab === 'compliance',
        level: 0,
      },
      {
        id: 'goto-compliance-summary',
        label: 'Summary panel',
        keywords: 'compliance panel summary right panel panneau résumé',
        Icon: ClipboardCheck,
        onSelect: () => goToRightPanelTab('compliance', 'compliance', 'summary'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-compliance-gap',
        label: 'Gaps panel',
        keywords: 'compliance panel gaps right panel panneau écarts gap',
        Icon: FileWarning,
        onSelect: () => goToRightPanelTab('compliance', 'compliance', 'gap'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-compliance-assumptions',
        label: 'Assumptions panel',
        keywords: 'compliance panel assumptions right panel panneau registre assumptions',
        Icon: Lightbulb,
        onSelect: () => goToRightPanelTab('compliance', 'compliance', 'assumptions'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-compliance-evidence',
        label: 'Evidence panel',
        keywords: 'compliance panel evidence right panel panneau preuves',
        Icon: Shield,
        onSelect: () => goToRightPanelTab('compliance', 'compliance', 'evidence'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-prooftest',
        label: 'Go to Proof Test',
        keywords: 'go proof test test de preuve',
        Icon: FlaskConical,
        onSelect: () => goToTab('prooftest'),
        isActive: view.type === 'sif-dashboard' && view.tab === 'prooftest',
        level: 0,
      },
      {
        id: 'goto-prooftest-status',
        label: 'Status panel',
        keywords: 'proof test panel status right panel panneau statut',
        Icon: ClipboardCheck,
        onSelect: () => goToRightPanelTab('prooftest', 'prooftest', 'status'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-prooftest-campaign',
        label: 'Campaign panel',
        keywords: 'proof test panel campaign right panel panneau campagne en cours',
        Icon: FlaskConical,
        onSelect: () => goToRightPanelTab('prooftest', 'prooftest', 'campaign'),
        isActive: false,
        level: 1,
      },
      {
        id: 'goto-report',
        label: 'Go to Reports',
        keywords: 'go report reports rapport rapports',
        Icon: FileText,
        onSelect: () => goToTab('report'),
        isActive: view.type === 'sif-dashboard' && view.tab === 'report',
        level: 0,
      },
      {
        id: 'edit-current-sif',
        label: 'Edit this SIF',
        keywords: 'edit current sif modifier cette sif',
        Icon: Pencil,
        onSelect: () => run(() => openEditSIF(currentSif.id)),
        isActive: false,
        level: 0,
      },
      {
        id: 'edit-current-project',
        label: 'Edit current project',
        keywords: 'edit current project modifier projet courant',
        Icon: Pencil,
        onSelect: () => run(() => openEditProject(currentProject.id)),
        isActive: false,
        meta: currentProject.name,
        level: 0,
      },
    ],
  } : null

  const createGroup: CommandGroup = {
    heading: 'Create',
    items: [
      {
        id: 'new-project',
        label: 'New project',
        keywords: 'create new project créer nouveau projet',
        Icon: FolderPlus,
        onSelect: () => run(openNewProject),
        isActive: false,
        level: 0,
      },
      {
        id: 'new-sif',
        label: currentProject
          ? `New SIF in ${currentProject.name}`
          : 'New SIF',
        keywords: 'create new sif créer nouvelle sif',
        Icon: FilePlus,
        onSelect: () => run(() => openNewSIF(currentProjectId ?? undefined)),
        isActive: false,
        level: 0,
      },
    ],
  }

  const projectsGroup: CommandGroup = {
    heading: 'Projects',
    items: projects.map(project => ({
      id: `project-${project.id}`,
      label: project.name,
      keywords: `project projet ${project.name} ${project.ref} ${project.client}`,
      Icon: FolderPlus,
      onSelect: () => run(() => {
        const firstSif = project.sifs[0]
        if (firstSif) {
          navigate({ type: 'sif-dashboard', projectId: project.id, sifId: firstSif.id, tab: 'overview' })
        } else {
          navigate({ type: 'projects' })
        }
      }),
      isActive: currentProjectId === project.id,
      meta: project.ref || project.client || undefined,
      level: 0,
    })),
  }

  const sifsGroup: CommandGroup = {
    heading: 'SIFs',
    items: projects.flatMap(project =>
      project.sifs.map(sif => ({
        id: `sif-${sif.id}`,
        label: `${sif.sifNumber}${sif.title ? ` — ${sif.title}` : ''}`,
        keywords: `sif ${sif.sifNumber} ${sif.title} ${sif.processTag} ${project.name}`,
        Icon: Shield,
        meta: project.name,
        onSelect: () => run(() => navigate({ type: 'sif-dashboard', projectId: project.id, sifId: sif.id, tab: 'overview' })),
        isActive: currentSifId === sif.id,
        level: 0,
      })),
    ),
  }

  const generalGroup: CommandGroup = {
    heading: 'General',
    items: [
      {
        id: 'home-dashboard',
        label: 'Home dashboard',
        keywords: 'home dashboard accueil projets',
        Icon: Home,
        onSelect: () => run(() => navigate({ type: 'projects' })),
        isActive: view.type === 'projects',
        level: 0,
      },
      {
        id: 'toggle-theme',
        label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
        keywords: 'theme dark light mode thème sombre clair',
        Icon: isDark ? Sun : Moon,
        onSelect: () => run(toggleTheme),
        isActive: false,
        level: 0,
      },
      {
        id: 'review-queue',
        label: 'Review Queue',
        keywords: 'review queue backlog priorities priorités',
        Icon: ListChecks,
        onSelect: () => run(() => navigate({ type: 'review-queue' })),
        isActive: view.type === 'review-queue',
        level: 0,
      },
      {
        id: 'audit-log',
        label: 'Audit Log',
        keywords: 'audit log historique timeline',
        Icon: History,
        onSelect: () => run(() => navigate({ type: 'audit-log' })),
        isActive: view.type === 'audit-log',
        level: 0,
      },
      {
        id: 'sif-history',
        label: 'SIF History',
        keywords: 'sif history historique révisions',
        Icon: History,
        onSelect: () => run(() => navigate({ type: 'sif-history' })),
        isActive: view.type === 'sif-history',
        level: 0,
      },
      {
        id: 'engine',
        label: 'Engine',
        keywords: 'engine compute solver markov monte carlo python backend quant',
        Icon: Cpu,
        onSelect: () => run(() => navigate({ type: 'engine' })),
        isActive: view.type === 'engine',
        level: 0,
      },
      {
        id: 'hazop',
        label: 'HAZOP / LOPA',
        keywords: 'hazop lopa scenarios scénarios',
        Icon: FlaskConical,
        onSelect: () => run(() => navigate({ type: 'hazop' })),
        isActive: view.type === 'hazop',
        level: 0,
      },
      {
        id: 'settings',
        label: 'Settings',
        keywords: 'settings paramètres',
        Icon: Settings,
        onSelect: () => run(onOpenSettings),
        isActive: view.type === 'settings',
        level: 0,
      },
    ],
  }

  const filterItems = (items: CommandItem[]) => {
    if (!search.trim()) return items
    const query = search.toLowerCase()
    return items.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.keywords.toLowerCase().includes(query) ||
      (item.meta?.toLowerCase().includes(query) ?? false),
    )
  }

  const groups: CommandGroup[] = [
    ...(currentViewGroup ? [currentViewGroup] : []),
    createGroup,
    projectsGroup,
    sifsGroup,
    generalGroup,
  ]
    .map(group => ({ ...group, items: filterItems(group.items) }))
    .filter(group => group.items.length > 0)

  let flatIndex = 0
  const indexedGroups = groups.map(group => ({
    ...group,
    items: group.items.map(item => ({
      ...item,
      flatIndex: flatIndex++,
    })),
  }))
  const visibleItems = indexedGroups.flatMap(group => group.items)
  const defaultSelectedIndex = visibleItems.findIndex(item => item.isActive)
  const initialSelectedIndex = visibleItems.length === 0 ? -1 : (defaultSelectedIndex >= 0 ? defaultSelectedIndex : 0)

  useEffect(() => {
    if (!open) {
      setSelectedIndex(-1)
      return
    }
    setSelectedIndex(initialSelectedIndex)
  }, [open, search, initialSelectedIndex])

  useEffect(() => {
    if (!open) return undefined

    const down = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }

      if (!visibleItems.length) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex(prev => (prev + 1) % visibleItems.length)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex(prev => (prev <= 0 ? visibleItems.length - 1 : prev - 1))
        return
      }

      if (event.key === 'Enter' && selectedIndex >= 0) {
        event.preventDefault()
        visibleItems[selectedIndex]?.onSelect()
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, selectedIndex, visibleItems])

  useEffect(() => {
    if (!open || selectedIndex < 0) return
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, selectedIndex])

  const overlay = open ? (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          background: PANEL,
          borderColor: BORDER,
          width: '90%',
          maxWidth: 580,
          maxHeight: '70vh',
          boxShadow: `0 0 0 1px ${BORDER}, 0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${TEAL}08`,
        }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <Search size={15} style={{ color: TEXT_DIM, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search for an action, SIF, or project..."
            className="flex-1 h-12 bg-transparent text-sm outline-none"
            style={{ color: TEXT }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ color: TEXT_DIM, border: `1px solid ${BORDER}` }}
            >
              esc
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2" role="listbox" aria-label="Quick Actions">
          {groups.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: TEXT_DIM }}>
              No results for "{search}"
            </div>
          )}

          {indexedGroups.map(group => (
            <div key={group.heading} className="mb-1">
              <p
                className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest"
                style={{ color: TEXT_DIM }}
              >
                {group.heading}
              </p>

              {group.items.map(item => (
                <button
                  key={item.id}
                  ref={node => {
                    itemRefs.current[item.flatIndex] = node
                  }}
                  type="button"
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                  className="group w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  role="option"
                  aria-selected={item.flatIndex === selectedIndex}
                  style={{ background: item.flatIndex === selectedIndex ? '#1D232A' : 'transparent' }}
                >
                  <div
                    className="shrink-0 transition-colors"
                    style={{
                      marginLeft: item.level === 1 ? 18 : 0,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: item.isActive ? `${TEAL}20` : '#1D232A',
                        border: `1px solid ${item.isActive ? `${TEAL}50` : BORDER}`,
                      }}
                    >
                      <item.Icon size={13} style={{ color: item.isActive ? TEAL : TEXT_DIM }} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{
                        color: item.isActive ? TEAL_DIM : TEXT,
                        fontSize: item.level === 1 ? '13px' : '14px',
                        fontWeight: item.level === 1 ? 500 : 600,
                      }}
                    >
                      {item.label}
                    </p>
                    {item.meta && (
                      <p className="text-[10px] truncate" style={{ color: TEXT_DIM }}>{item.meta}</p>
                    )}
                  </div>

                  {item.isActive && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${TEAL}20`, color: TEAL_DIM, border: `1px solid ${TEAL}40` }}
                    >
                      Active
                    </span>
                  )}

                  <ChevronRight
                    size={12}
                    style={{ color: BORDER, flexShrink: 0 }}
                    className="group-hover:opacity-100 opacity-0 transition-opacity"
                  />
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 shrink-0 border-t" style={{ borderColor: BORDER }}>
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>
            <kbd className="font-mono px-1 rounded" style={{ border: `1px solid ${BORDER}` }}>↑↓</kbd> navigate
          </span>
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>
            <kbd className="font-mono px-1 rounded" style={{ border: `1px solid ${BORDER}` }}>↵</kbd> select
          </span>
          <span className="text-[10px]" style={{ color: TEXT_DIM }}>
            <kbd className="font-mono px-1 rounded" style={{ border: `1px solid ${BORDER}` }}>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs transition-colors"
        style={{ color: TEXT_DIM, border: `1px solid ${BORDER}`, background: 'transparent' }}
        onMouseEnter={event => {
          event.currentTarget.style.borderColor = TEAL
          event.currentTarget.style.color = TEXT
        }}
        onMouseLeave={event => {
          event.currentTarget.style.borderColor = BORDER
          event.currentTarget.style.color = TEXT_DIM
        }}
      >
        <Search size={13} />
        Quick Actions
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold"
          style={{ background: '#0C1117', border: `1px solid ${BORDER}`, color: TEXT_DIM }}
        >
          ⌘K
        </span>
      </button>

      {overlay && typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
    </>
  )
}
