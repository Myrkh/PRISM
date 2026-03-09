import { useRef, useState, useEffect } from 'react'
import { LogOut, Moon, Settings, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { SettingsModal } from './SettingsModal'
import { CommandPalette } from './CommandPalette'

function getUserInitials(value: string | null | undefined): string {
  if (!value) return 'U'
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function AppHeader() {
  const isDark      = useAppStore(s => s.isDark)
  const toggleTheme = useAppStore(s => s.toggleTheme)
  const view        = useAppStore(s => s.view)
  const navigate    = useAppStore(s => s.navigate)
  const projects    = useAppStore(s => s.projects)
  const authUser    = useAppStore(s => s.authUser)
  const profile     = useAppStore(s => s.profile)
  const signOut     = useAppStore(s => s.signOut)

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

  const sif = view.type === 'sif-dashboard'
    ? projects.find(p => p.id === view.projectId)?.sifs.find(s => s.id === view.sifId)
    : undefined

  const isWorkbench = view.type === 'sif-dashboard'
  const displayName = profile?.fullName || authUser?.user_metadata?.full_name || authUser?.email || 'User'
  const displayEmail = profile?.email || authUser?.email || ''
  const avatarUrl = profile?.avatarUrl || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null
  const initials = getUserInitials(displayName)

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsUserMenuOpen(false)
    } catch {
      // Store-level authError banner surfaces the failure.
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 h-14 grid grid-cols-[288px_1fr_auto] items-center border-b border-border/80 bg-background/95 supports-[backdrop-filter]:backdrop-blur-md dark:border-[#2B323A] dark:bg-[#14181C]/95">

        {/* Left Zone: Logo (aligns with left panel's right edge) */}
        <div className="h-full flex items-center px-4 border-r border-border/80">
          <button
            onClick={() => navigate({ type: 'projects' })}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <img src="/favicon2.png" alt="PRISM" className="h-7 w-7 rounded-sm object-contain" />
            <span className="text-2xl font-extrabold tracking-wide dark:text-[#DDE3EA]">PRISM</span>
          </button>
        </div>

        {/* Center Zone: Title */}
        <div className="flex items-center px-4">
          {isWorkbench && sif && (
            <h1 className="text-[15px] font-bold truncate text-foreground">
              {sif.sifNumber} · {sif.title || sif.description || sif.sifNumber}
            </h1>
          )}
          {view.type === 'settings' && (
            <h1 className="text-[15px] font-bold truncate text-foreground">Settings</h1>
          )}
          {view.type === 'review-queue' && (
            <h1 className="text-[15px] font-bold truncate text-foreground">Review Queue</h1>
          )}
          {view.type === 'audit-log' && (
            <h1 className="text-[15px] font-bold truncate text-foreground">Audit Log</h1>
          )}
          {view.type === 'engine' && (
            <h1 className="text-[15px] font-bold truncate text-foreground">Engine</h1>
          )}
        </div>

        {/* Right Zone: Actions */}
        <div className="flex items-center gap-2 px-4">
          <CommandPalette onOpenSettings={() => setIsSettingsOpen(true)} />

          <div className="relative" ref={userMenuRef}>
            <Button
              variant="ghost" size="icon"
              className="rounded-full dark:text-[#D8E0E8]"
              onClick={() => setIsUserMenuOpen(v => !v)}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: '#1D232A', color: '#D8E0E8', border: '1px solid #2B323A' }}
                >
                  {initials}
                </span>
              )}
            </Button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-10 w-72 rounded-xl border border-border/70 bg-card/95 p-1.5 shadow-xl supports-[backdrop-filter]:backdrop-blur-sm z-50">
                <div className="rounded-lg px-3 py-2.5" style={{ background: '#1D232A' }}>
                  <p className="text-sm font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: '#8FA0B1' }}>
                    {displayEmail || 'Authenticated user'}
                  </p>
                </div>

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
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => { void handleSignOut() }}
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Sign out
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

      </header>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}
