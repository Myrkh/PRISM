import { useMemo, useRef, useState, useEffect } from 'react'
import { Moon, Settings, Sun, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { SILBadge } from '@/components/shared/SILBadge'
import { calcSIF } from '@/core/math/pfdCalc'
import { SettingsModal } from './SettingsModal'
import { CommandPalette } from './CommandPalette'

export function AppHeader() {
  const isDark      = useAppStore(s => s.isDark)
  const toggleTheme = useAppStore(s => s.toggleTheme)
  const view        = useAppStore(s => s.view)
  const navigate    = useAppStore(s => s.navigate)
  const projects    = useAppStore(s => s.projects)

  const [isUserMenuOpen,  setIsUserMenuOpen]  = useState(false)
  const [isSettingsOpen,  setIsSettingsOpen]  = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu on outside click / Escape
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setIsUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsUserMenuOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Current SIF (only in dashboard view)
  const sif = view.type === 'sif-dashboard'
    ? projects.find(p => p.id === view.projectId)?.sifs.find(s => s.id === view.sifId)
    : undefined

  const calcResult = useMemo(() => sif ? calcSIF(sif) : null, [sif])

  // Whether we're in the full workbench (hides the nav selector — handled by left panel)
  const isWorkbench = view.type === 'sif-dashboard'

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 supports-[backdrop-filter]:backdrop-blur-md dark:border-[#2B323A] dark:bg-[#14181C]/95">
        <div className="h-14 px-4 flex items-center gap-3">

          {/* Logo — always visible */}
          <button
            onClick={() => navigate({ type: 'projects' })}
            className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity"
          >
            <img src="/favicon2.png" alt="PRISM" className="h-7 w-7 rounded-sm object-contain" />
            <span className="text-2xl font-extrabold tracking-wide dark:text-[#DDE3EA]">PRISM</span>
            {!isWorkbench && (
              <span className="hidden lg:inline text-xs text-muted-foreground ml-1">SIL Workspace</span>
            )}
          </button>
          
          {/* SIF title (workbench only) */}
          {isWorkbench && sif && (
            <>
              <div className="h-6 w-px bg-border/80 mx-2" />
              <h1 className="text-[15px] font-bold truncate text-foreground">
                {sif.sifNumber} · {sif.title || sif.description || sif.sifNumber}
              </h1>
            </>
          )}

          {/* When NOT in workbench: show breadcrumb / project name */}
          {!isWorkbench && view.type === 'sif-list' && (() => {
            const proj = projects.find(p => p.id === view.projectId)
            return proj ? (
              <span className="text-sm text-muted-foreground truncate">
                → {proj.name}
              </span>
            ) : null
          })()}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <CommandPalette onOpenSettings={() => setIsSettingsOpen(true)} />

            {/* SIL badge (workbench only) */}
            {calcResult && <SILBadge sil={calcResult.SIL} size="md" />}

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost" size="icon"
                className="rounded-full dark:text-[#D8E0E8]"
                onClick={() => setIsUserMenuOpen(v => !v)}
              >
                <UserCircle2 className="h-6 w-6" />
              </Button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-10 w-52 rounded-xl border border-border/70 bg-card/95 p-1.5 shadow-xl supports-[backdrop-filter]:backdrop-blur-sm z-50">
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => { setIsSettingsOpen(true); setIsUserMenuOpen(false) }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Settings
                    </span>
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => { toggleTheme(); setIsUserMenuOpen(false) }}
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
      </header>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}
