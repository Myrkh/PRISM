import { useMemo, useRef, useState, useEffect } from 'react'
import { ChevronRight, ChevronsUpDown, Moon, Settings, ShieldCheck, Sun, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore, selectCurrentSIF } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { calcSIF } from '@/core/math/pfdCalc'
import { SettingsModal } from './SettingsModal'
import { CommandPalette } from './CommandPalette'

export function AppHeader() {
  const isDark = useAppStore(s => s.isDark)
  const toggleTheme = useAppStore(s => s.toggleTheme)
  const view = useAppStore(s => s.view)
  const navigate = useAppStore(s => s.navigate)
  const openEditSIF = useAppStore(s => s.openEditSIF)
  const projects = useAppStore(s => s.projects)
  const sif = useAppStore(selectCurrentSIF)

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [])

  const project = view.type !== 'projects'
    ? projects.find(p => p.id === (view as { projectId: string }).projectId)
    : undefined

  const calcResult = useMemo(() => sif ? calcSIF(sif) : null, [sif])

  const selectorValue = view.type === 'projects'
    ? 'projects'
    : view.type === 'sif-list'
      ? `project:${view.projectId}`
      : `sif:${view.projectId}:${view.sifId}`

  const onSelectorChange = (value: string) => {
    if (value === 'projects') {
      navigate({ type: 'projects' })
      return
    }

    if (value.startsWith('project:')) {
      const projectId = value.split(':')[1]
      navigate({ type: 'sif-list', projectId })
      return
    }

    if (value.startsWith('sif:')) {
      const [, projectId, sifId] = value.split(':')
      navigate({ type: 'sif-dashboard', projectId, sifId, tab: 'overview' })
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 supports-[backdrop-filter]:backdrop-blur-md">
        <div className="h-16 px-6 flex items-center gap-4">
          <button
            onClick={() => navigate({ type: 'projects' })}
            className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
              <ShieldCheck size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">SafeLoop</span>
              <span className="hidden lg:inline text-xs text-muted-foreground ml-2">SIL Workspace</span>
            </div>
          </button>

          <div className="hidden md:flex items-center text-muted-foreground">
            <ChevronRight size={16} />
          </div>

          <div className="min-w-0 max-w-[680px] flex-1">
            <Select value={selectorValue} onValueChange={onSelectorChange}>
              <SelectTrigger className="h-10 rounded-xl border-border/70 bg-card/70">
                <div className="flex items-center gap-2 min-w-0">
                  <SelectValue placeholder="Navigate project / SIF" />
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Workspace</SelectLabel>
                  <SelectItem value="projects">All projects</SelectItem>
                  <SelectSeparator />
                  {projects.flatMap(p => {
                    const projectItems = [
                      <SelectLabel key={`project-label:${p.id}`} className="pt-2 pb-1 normal-case text-xs tracking-normal text-foreground">
                        {p.name}
                      </SelectLabel>,
                      <SelectItem key={`project:${p.id}`} value={`project:${p.id}`}>
                        Open SIF list
                      </SelectItem>,
                      ...p.sifs.map(s => (
                        <SelectItem key={s.id} value={`sif:${p.id}:${s.id}`} className="pl-7">
                          {s.sifNumber} · {s.title || 'Untitled SIF'}
                        </SelectItem>
                      )),
                    ]

                    if (p.sifs.length === 0) {
                      projectItems.push(
                        <SelectItem key={`empty:${p.id}`} value={`project:${p.id}:empty`} disabled className="pl-7 text-muted-foreground">
                          No SIF yet
                        </SelectItem>,
                      )
                    }

                    projectItems.push(<SelectSeparator key={`sep:${p.id}`} />)
                    return projectItems
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {sif && (
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-mono">{sif.sifNumber}</Badge>
              <Badge variant="outline" className="font-mono">Rev. {sif.revision}</Badge>
              <span>{sif.status.replace('_', ' ')}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <CommandPalette onOpenSettings={() => setIsSettingsOpen(true)} />

            {calcResult && <SILBadge sil={calcResult.SIL} size="md" />}

            {view.type === 'sif-dashboard' && sif && (
              <Button variant="outline" size="sm" onClick={() => openEditSIF(sif.id)}>
                Edit SIF
              </Button>
            )}

            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                onClick={() => setIsUserMenuOpen(v => !v)}
              >
                <UserCircle2 className="h-7 w-7" />
              </Button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-xl border border-border/70 bg-card/95 p-1.5 shadow-[0_12px_30px_rgba(2,6,23,0.22),0_2px_10px_rgba(2,6,23,0.12)] supports-[backdrop-filter]:backdrop-blur-sm">
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setIsSettingsOpen(true)
                      setIsUserMenuOpen(false)
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Settings
                    </span>
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      toggleTheme()
                      setIsUserMenuOpen(false)
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {isDark ? 'Light mode' : 'Dark mode'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {project && (
          <div className="h-9 px-6 border-t border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button
                onClick={() => navigate({ type: 'projects' })}
                className="hover:text-foreground transition-colors"
              >
                Projects
              </button>
              <ChevronRight className="h-3.5 w-3.5" />
              <button
                onClick={() => navigate({ type: 'sif-list', projectId: project.id })}
                className="hover:text-foreground transition-colors"
              >
                {project.name}
              </button>
              {sif && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-foreground font-medium">{sif.sifNumber}</span>
                </>
              )}
            </div>

            {view.type === 'sif-dashboard' && project && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate({ type: 'sif-list', projectId: project.id })}
              >
                Back to SIF list
              </Button>
            )}
          </div>
        )}
      </header>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}
