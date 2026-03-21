/**
 * src/App.tsx — PRISM Launcher
 * Flow : isSetup? → SetupScreen | AuthScreen → LauncherShell
 */

import { useState, useEffect } from 'react'
import { useTheme }        from './hooks/useTheme'
import { AuthScreen }      from './components/AuthScreen'
import { SetupScreen }     from './components/SetupScreen'
import { LauncherShell }   from './components/LauncherShell'
import { Minus, Square, X } from 'lucide-react'
import { alpha }           from './tokens'
import type { ThemeTokens } from './hooks/useTheme'
import type { AuthUser }   from './types'

declare global {
  interface Window {
    electron?: {
      minimize:    () => void
      maximize:    () => void
      close:       () => void
      launchPrism: () => void
      openDataDir: () => void
      checkUpdate:   () => Promise<unknown>
      installUpdate: (url: string) => Promise<unknown>
      onProgress:    (cb: (d: unknown) => void) => void
      offProgress:   (cb: (d: unknown) => void) => void
      isSetup:     () => Promise<boolean>
      login:       (p: { email: string; password: string }) => Promise<{ ok: boolean; user?: AuthUser; error?: string }>
      createUser:  (p: { email: string; fullName: string; password: string; role?: string; requesterId?: number | null }) => Promise<{ ok: boolean; user?: AuthUser; error?: string }>
      updateUser:  (p: { requesterId: number; userId: number; patches: Record<string, unknown> }) => Promise<{ ok: boolean; user?: AuthUser }>
      getUsers:    () => Promise<AuthUser[]>
      getAudit:    () => Promise<unknown[]>
      getLicense:  () => Promise<unknown>
      setLicense:  (p: unknown) => Promise<{ ok: boolean }>
      isDesktop:   boolean
      platform:    string
    }
  }
}

type AppPhase = 'loading' | 'setup' | 'auth' | 'app'

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [phase, setPhase]    = useState<AppPhase>('loading')
  const [user,  setUser]     = useState<AuthUser | null>(null)

  useEffect(() => {
    if (!window.electron) {
      // Sans Electron (dev Vite seul) — affiche le login, les IPC ne répondront pas
      setPhase('auth')
      return
    }
    window.electron.isSetup().then(ready => {
      setPhase(ready ? 'auth' : 'setup')
    })
  }, [])

  const handleSetupDone = () => setPhase('auth')

  const handleAuth = (u: AuthUser) => {
    setUser(u)
    setPhase('app')
  }

  const handleLogout = () => {
    setUser(null)
    setPhase('auth')
  }

  if (phase === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: theme.PAGE_BG }} />
    )
  }

  if (phase === 'setup') {
    return (
      <WithTitleBar t={theme}>
        <SetupScreen onDone={handleSetupDone} />
      </WithTitleBar>
    )
  }

  if (phase === 'auth') {
    return (
      <WithTitleBar t={theme}>
        <AuthScreen onAuth={handleAuth} />
      </WithTitleBar>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: theme.PAGE_BG }}>
      <LauncherShell
        t={theme}
        user={user!}
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
      />
    </div>
  )
}

// ── Wrapper avec barre de fenêtre pour écrans pre-shell ──────────────────────

function WithTitleBar({ t, children }: { t: ThemeTokens; children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: t.PAGE_BG }}>
      <div
        className="drag flex h-7 shrink-0 select-none items-center justify-end pr-2"
        style={{ background: t.PANEL_BG }}
      >
        <div className="no-drag flex items-center gap-0.5">
          {(['min', 'max', 'close'] as const).map(k => (
            <AuthWinBtn key={k} type={k} t={t} />
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}

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
