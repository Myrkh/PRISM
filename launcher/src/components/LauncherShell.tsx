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
import { AdminView }   from './AdminView'
import type { ThemeTokens } from '../hooks/useTheme'
import type { LauncherView, AuthUser } from '../types'

// true = PRISM backend répond sur localhost:8000 (déjà lancé)
function useBackendRunning(): boolean {
  const [running, set] = useState(false)
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(1500) })
        set(r.ok)
      } catch { set(false) }
    }
    void check()
    const id = setInterval(check, 10_000)
    return () => clearInterval(id)
  }, [])
  return running
}

// true = PRISM-backend.exe présent dans le dossier d'installation
function usePrismInstalled(): boolean {
  const [installed, set] = useState(false)
  useEffect(() => {
    window.electron?.isPrismInstalled?.().then(set).catch(() => set(false))
  }, [])
  return installed
}

interface LauncherShellProps {
  t:             ThemeTokens
  user:          AuthUser
  sessionToken:  string
  onLogout:      () => void
  onToggleTheme: () => void
}

export function LauncherShell({ t, user, sessionToken, onLogout, onToggleTheme }: LauncherShellProps) {
  const [view, setView]       = useState<LauncherView>('home')
  const [currentUser, setCurrentUser] = useState(user)
  const running   = useBackendRunning()   // PRISM déjà lancé → glow
  const installed = usePrismInstalled()   // PRISM installé → bouton actif
  const ready     = running               // alias pour compatibilité composants enfants
  const [installedPrismVersion, setInstalledPrismVersion] = useState<string | null>(null)
  const [launchError, setLaunchError] = useState<string | null>(null)

  useEffect(() => {
    window.electron?.getVersions?.().then(v => setInstalledPrismVersion(v.prism)).catch(() => {})
  }, [installed])

  const handleLaunch = async () => {
    setLaunchError(null)
    const result = await window.electron?.launchPrism?.() as { ok: boolean; error?: string } | undefined
    if (result && !result.ok) setLaunchError(result.error ?? 'Erreur inconnue')
  }

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
  }, [handleLaunch])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      <TopBar
        t={t}
        view={view}
        user={currentUser}
        ready={ready}
        installed={installed}
        launchError={launchError}
        onLaunch={handleLaunch}
        onView={setView}
        onLogout={onLogout}
        onToggleTheme={onToggleTheme}
        onUpdate={patch => setCurrentUser(u => ({ ...u, ...patch }))}
      />

      <div className="flex flex-1 overflow-hidden" style={{ background: t.PAGE_BG }}>
        {view === 'home'     && <HomeView     t={t} ready={ready} />}
        {view === 'library'  && <LibraryView  t={t} />}
        {view === 'updates'  && <UpdatesView  t={t} installedVersion={installedPrismVersion} />}
        {view === 'settings' && <SettingsView t={t} onToggleTheme={onToggleTheme} />}
        {view === 'admin'    && <AdminView    t={t} user={currentUser} sessionToken={sessionToken} />}
      </div>

      <FooterBar t={t} />
    </div>
  )
}
