/**
 * src/components/LauncherShell.tsx — PRISM Launcher (v2)
 * Shell principal : Sidebar + vues + FooterBar.
 * Keyboard shortcut Ctrl+L / ⌘L → lancer PRISM.
 */

import { useEffect, useState } from 'react'
import { Sidebar }      from './Sidebar'
import { HomeView }     from './HomeView'
import { UpdatesView }  from './UpdatesView'
import { SettingsView } from './SettingsView'
import { LibraryView }  from './LibraryView'
import { FooterBar }    from './FooterBar'
import type { ThemeTokens } from '../hooks/useTheme'
import type { LauncherView, AuthUser } from '../types'

interface LauncherShellProps {
  t:             ThemeTokens
  user:          AuthUser
  onLogout:      () => void
  onToggleTheme: () => void
}

export function LauncherShell({ t, user, onLogout, onToggleTheme }: LauncherShellProps) {
  const [view, setView] = useState<LauncherView>('home')

  // Ctrl+L / ⌘L → lancer PRISM directement
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
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          t={t}
          view={view}
          onView={setView}
          user={user}
          onLogout={onLogout}
          onToggleTheme={onToggleTheme}
          updateAvailable={true}
        />

        {view === 'home'     && <HomeView     t={t} user={user} />}
        {view === 'library'  && <LibraryView  t={t} />}
        {view === 'updates'  && <UpdatesView  t={t} />}
        {view === 'settings' && <SettingsView t={t} onToggleTheme={onToggleTheme} />}
      </div>

      <FooterBar t={t} />
    </div>
  )
}
