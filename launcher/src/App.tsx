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
      launchPrism:      () => void
      openDataDir:      () => void
      isPrismInstalled: () => Promise<boolean>
      getVersions:      () => Promise<{ launcher: string; prism: string | null }>
      getRecentProjects: () => Promise<unknown[]>
      getSettings:       () => Promise<unknown>
      setSettings:       (patch: unknown) => Promise<unknown>
      checkUpdate:            () => Promise<unknown>
      installUpdate:          (url: string) => Promise<unknown>
      onProgress:             (cb: (d: unknown) => void) => void
      offProgress:            (cb: (d: unknown) => void) => void
      checkLauncherUpdate:    () => Promise<unknown>
      downloadLauncherUpdate: (url: string) => Promise<unknown>
      applyLauncherUpdate:    () => Promise<unknown>
      onLauncherProgress:     (cb: (d: unknown) => void) => void
      offLauncherProgress:    (cb: (d: unknown) => void) => void
      isSetup:     () => Promise<boolean>
      login:       (p: { email: string; password: string }) => Promise<{ ok: boolean; user?: AuthUser; sessionToken?: string; error?: string }>
      logout:      (token: string) => Promise<void>
      createUser:  (p: { email?: string; fullName?: string; password?: string; role?: string; token?: string }) => Promise<{ ok: boolean; user?: AuthUser; error?: string }>
      updateUser:  (p: { token: string; userId: number; patches: Record<string, unknown> }) => Promise<{ ok: boolean; user?: AuthUser }>
      getUsers:    (token: string) => Promise<AuthUser[]>
      getAudit:    (token: string) => Promise<unknown[]>
      getLicense:  (token: string) => Promise<unknown>
      setLicense:  (p: { token: string; [key: string]: unknown }) => Promise<{ ok: boolean }>
      openDocs:    () => Promise<void>
      isDesktop:   boolean
      platform:    string
    }
  }
}

type AppPhase = 'loading' | 'setup' | 'auth' | 'app'

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [phase, setPhase]        = useState<AppPhase>('loading')
  const [user,  setUser]         = useState<AuthUser | null>(null)
  const [sessionToken, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!window.electron) {
      // Dev Vite seul (pas d'Electron) — mock user admin pour voir le shell
      setUser({ id: 1, email: 'dev@prism.io', fullName: 'Dev User',
                initials: 'DU', role: 'admin', active: true,
                createdAt: '', lastLogin: null })
      setToken('dev-token')
      setPhase('app')
      return
    }
    window.electron.isSetup().then(ready => {
      setPhase(ready ? 'auth' : 'setup')
    })
  }, [])

  const handleSetupDone = () => setPhase('auth')

  const handleAuth = (u: AuthUser, token: string) => {
    setUser(u)
    setToken(token)
    setPhase('app')
  }

  const handleLogout = () => {
    if (sessionToken) window.electron?.logout?.(sessionToken)
    setUser(null)
    setToken(null)
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
        sessionToken={sessionToken!}
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
