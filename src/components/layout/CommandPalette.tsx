import { useEffect, useMemo, useState } from 'react'
import {
  FolderKanban,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'

type CommandItem = {
  id: string
  label: string
  hint: string
  group: 'Navigation' | 'Creation' | 'Workspace'
  keywords: string
  run: () => void
}

interface CommandPaletteProps {
  onOpenSettings: () => void
}

export function CommandPalette({ onOpenSettings }: CommandPaletteProps) {
  const projects = useAppStore(s => s.projects)
  const view = useAppStore(s => s.view)
  const isDark = useAppStore(s => s.isDark)
  const navigate = useAppStore(s => s.navigate)
  const openNewProject = useAppStore(s => s.openNewProject)
  const openNewSIF = useAppStore(s => s.openNewSIF)
  const toggleTheme = useAppStore(s => s.toggleTheme)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(v => !v)
      }
    }

    document.addEventListener('keydown', onShortcut)
    return () => document.removeEventListener('keydown', onShortcut)
  }, [])

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: 'nav-projects',
        label: 'Open all projects',
        hint: 'Go to global workspace home',
        group: 'Navigation',
        keywords: 'projects home workspace',
        run: () => navigate({ type: 'projects' }),
      },
      {
        id: 'create-project',
        label: 'Create new project',
        hint: 'Open project creation modal',
        group: 'Creation',
        keywords: 'new create project',
        run: () => {
          navigate({ type: 'projects' })
          openNewProject()
        },
      },
      {
        id: 'workspace-settings',
        label: 'Open settings',
        hint: 'Theme and workspace preferences',
        group: 'Workspace',
        keywords: 'settings preferences appearance',
        run: onOpenSettings,
      },
      {
        id: 'workspace-theme',
        label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
        hint: 'Toggle appearance theme',
        group: 'Workspace',
        keywords: 'theme dark light appearance',
        run: toggleTheme,
      },
    ]

    projects.forEach(project => {
      items.push({
        id: `project:${project.id}`,
        label: `Open project · ${project.name}`,
        hint: `${project.sifs.length} SIF${project.sifs.length > 1 ? 's' : ''}`,
        group: 'Navigation',
        keywords: `${project.name} ${project.ref} project`,
        run: () => navigate({ type: 'sif-list', projectId: project.id }),
      })

      if (view.type !== 'projects' && view.projectId === project.id) {
        items.push({
          id: `create-sif:${project.id}`,
          label: `Create new SIF in ${project.name}`,
          hint: 'Open SIF modal',
          group: 'Creation',
          keywords: `new sif create ${project.name}`,
          run: openNewSIF,
        })
      }

      project.sifs.forEach(sif => {
        items.push({
          id: `sif:${project.id}:${sif.id}`,
          label: `${sif.sifNumber} · ${sif.title || 'Untitled SIF'}`,
          hint: project.name,
          group: 'Navigation',
          keywords: `${project.name} ${sif.sifNumber} ${sif.title}`,
          run: () => navigate({ type: 'sif-dashboard', projectId: project.id, sifId: sif.id, tab: 'overview' }),
        })
      })
    })

    return items
  }, [isDark, navigate, onOpenSettings, openNewProject, openNewSIF, projects, toggleTheme, view])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands

    return commands.filter(item => {
      const haystack = `${item.label} ${item.hint} ${item.keywords}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [commands, query])

  const grouped = useMemo(() => {
    const buckets: Record<CommandItem['group'], CommandItem[]> = {
      Navigation: [],
      Creation: [],
      Workspace: [],
    }

    filtered.forEach(item => buckets[item.group].push(item))
    return buckets
  }, [filtered])

  const runCommand = (run: () => void) => {
    run()
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        Quick actions
        <span className="rounded border border-border/80 bg-muted/40 px-1.5 py-0.5 text-[10px]">⌘K</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-sm">Command center</DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-3">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search commands, projects or SIFs..."
              className="h-10"
              autoFocus
            />
          </div>

          <div className="max-h-[52vh] overflow-y-auto px-2 pb-3">
            {(['Navigation', 'Creation', 'Workspace'] as const).map(group => {
              const items = grouped[group]
              if (!items.length) return null

              return (
                <div key={group} className="px-2 py-1.5">
                  <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                  <div className="space-y-1">
                    {items.map(item => {
                      const Icon = item.group === 'Navigation'
                        ? LayoutDashboard
                        : item.group === 'Creation'
                          ? Plus
                          : item.id.includes('theme')
                            ? (isDark ? Sun : Moon)
                            : Settings

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => runCommand(item.run)}
                          className={cn(
                            'w-full rounded-lg border border-transparent px-3 py-2 text-left transition-colors',
                            'hover:border-border/70 hover:bg-muted/30',
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 rounded-md border border-border/60 bg-background/70 p-1">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.hint}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {!filtered.length && (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No command found for “{query}”.
              </div>
            )}
          </div>

          <div className="border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Use ⌘K / Ctrl+K anytime</span>
            <span className="inline-flex items-center gap-1"><FolderKanban className="h-3 w-3" /> Designed for fast SIL workflows</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
