/**
 * src/App.tsx — PRISM Launcher
 * Composant racine : gestion du thème, de l'auth, et routage global.
 * Auth → LauncherShell (avec TitleBar).
 */

import { useState } from 'react'
import { useTheme }        from './hooks/useTheme'
import { TitleBar }        from './components/TitleBar'
import { AuthScreen }      from './components/AuthScreen'
import { LauncherShell }   from './components/LauncherShell'
import type { AuthUser }   from './types'

// Déclaration globale pour les APIs Electron exposées via preload
declare global {
  interface Window {
    electron?: {
      minimize:     () => void
      maximize:     () => void
      close:        () => void
      launchPrism:  () => void
      openDataDir:  () => void
    }
  }
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [user, setUser] = useState<AuthUser | null>({
    email: 'test@prism.io',
    fullName: 'Test User',
    initials: 'TU',
  })

  const handleAuth = (u: AuthUser) => setUser(u)

  const handleLogout = () => {
    localStorage.removeItem('prism_desktop_token')
    setUser(null)
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ background: theme.PAGE_BG }}
    >
      <TitleBar t={theme} />

      {user
        ? (
          <LauncherShell
            t={theme}
            user={user}
            onLogout={handleLogout}
            onToggleTheme={toggleTheme}
          />
        )
        : (
          <AuthScreen onAuth={handleAuth} />
        )
      }
    </div>
  )
}
