/**
 * src/App.tsx — PRISM Launcher
 * Composant racine : gestion du thème, auth, routage global.
 */

import { useState } from 'react'
import { useTheme }      from './hooks/useTheme'
import { AuthScreen }    from './components/AuthScreen'
import { LauncherShell } from './components/LauncherShell'
import type { AuthUser } from './types'

declare global {
  interface Window {
    electron?: {
      minimize:    () => void
      maximize:    () => void
      close:       () => void
      launchPrism: () => void
      openDataDir: () => void
    }
  }
}

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [user, setUser] = useState<AuthUser | null>({
    email:    'test@prism.io',
    fullName: 'Test User',
    initials: 'TU',
  })

  const handleLogout = () => {
    localStorage.removeItem('prism_desktop_token')
    setUser(null)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: theme.PAGE_BG }}>
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
          /* AuthScreen a sa propre TitleBar intégrée via le glass card */
          <>
            <div
              className="drag flex h-7 shrink-0 select-none items-center justify-end pr-2"
              style={{ background: theme.PANEL_BG }}
            >
              <div className="no-drag flex items-center gap-0.5">
                {(['min', 'max', 'close'] as const).map(k => (
                  <AuthWinBtn key={k} type={k} t={theme} />
                ))}
              </div>
            </div>
            <AuthScreen onAuth={setUser} />
          </>
        )
      }
    </div>
  )
}

import { Minus, Square, X } from 'lucide-react'
import { alpha } from './tokens'
import type { ThemeTokens } from './hooks/useTheme'

function AuthWinBtn({ type, t }: { type: 'min' | 'max' | 'close'; t: ThemeTokens }) {
  const danger = type === 'close'
  const Icon   = type === 'min' ? Minus : type === 'max' ? Square : X
  const size   = type === 'max' ? 8 : 9
  const action = type === 'min'
    ? () => window.electron?.minimize?.()
    : type === 'max'
      ? () => window.electron?.maximize?.()
      : () => window.electron?.close?.()

  return (
    <button
      type="button"
      onClick={action}
      className="flex h-5 w-5 items-center justify-center rounded transition-all"
      style={{ color: alpha(t.TEXT_DIM, '38'), background: 'transparent' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? alpha('#EF4444', '18') : alpha(t.BORDER, '90')
        e.currentTarget.style.color      = danger ? '#EF4444' : alpha(t.TEXT, '80')
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color      = alpha(t.TEXT_DIM, '38')
      }}
    >
      <Icon size={size} />
    </button>
  )
}
