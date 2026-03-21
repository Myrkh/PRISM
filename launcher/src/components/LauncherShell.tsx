/**
 * LauncherShell.tsx — PRISM Launcher
 * Shell principal : TopBar pleine largeur + contenu + FooterBar.
 * LeftPanel supprimé — layout plus aéré, pattern launcher moderne.
 */

import { useEffect, useState } from 'react'
import { TopBar }      from './TopBar'
import { FooterBar }   from './FooterBar'
import { HomeView }    from './HomeView'
import { UpdatesView } from './UpdatesView'
import { SettingsView } from './SettingsView'
import { LibraryView } from './LibraryView'
import type { ThemeTokens } from '../hooks/useTheme'
import type { LauncherView, AuthUser } from '../types'

type BackendStatus = 'checking' | 'ready' | 'offline'

function useBackend(): BackendStatus {
  const [s, set] = useState<BackendStatus>('checking')
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(1500) })
        set(r.ok ? 'ready' : 'offline')
      } catch { set('offline') }
    }
    void check()
    const id = setInterval(check, 10_000)
    return () => clearInterval(id)
  }, [])
  return s
}

interface LauncherShellProps {
  t:             ThemeTokens
  user:          AuthUser
  onLogout:      () => void
  onToggleTheme: () => void
}

export function LauncherShell({ t, user, onLogout, onToggleTheme }: LauncherShellProps) {
  const [view, setView]       = useState<LauncherView>('home')
  const [currentUser, setCurrentUser] = useState(user)
  const status = useBackend()
  const ready  = status === 'ready'

  // Ctrl+L → lancer PRISM
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        window.electron?.launchPrism?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      <TopBar
        t={t}
        view={view}
        user={currentUser}
        ready={ready}
        onView={setView}
        onLogout={onLogout}
        onToggleTheme={onToggleTheme}
        onUpdate={patch => setCurrentUser(u => ({ ...u, ...patch }))}
      />

      <div className="flex flex-1 overflow-hidden" style={{ background: t.PAGE_BG }}>
        {view === 'home'     && <HomeView     t={t} ready={ready} />}
        {view === 'library'  && <LibraryView  t={t} />}
        {view === 'updates'  && <UpdatesView  t={t} />}
        {view === 'settings' && <SettingsView t={t} onToggleTheme={onToggleTheme} />}
      </div>

      <FooterBar t={t} />
    </div>
  )
}
