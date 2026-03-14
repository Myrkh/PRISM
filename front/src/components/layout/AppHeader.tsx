/**
 * AppHeader.tsx — PRISM v3 (refactored)
 *
 * Simplifications vs. v2 :
 *   – SettingsModal supprimé (Settings = view dédié, pas modal)
 *   – Theme toggle uniquement dans le user menu
 *   – Breadcrumb contextuel (Project > SIF > Tab) au centre
 *   – Droite : CommandPalette + avatar uniquement
 */
import { useRef, useState, useEffect } from 'react'
import { LogOut, Moon, Settings, Sun, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { normalizeSIFTab } from '@/store/types'
import { CommandPalette } from './CommandPalette'

const TAB_LABELS: Record<string, string> = {
  cockpit:      'Cockpit',
  context:      'Contexte',
  architecture: 'Architecture',
  verification: 'Vérification',
  exploitation: 'Exploitation',
  report:       'Rapport',
}

const VIEW_LABELS: Record<string, string> = {
  'review-queue': 'Review Queue',
  'audit-log':    'Audit Log',
  'sif-history':  'SIF History',
  'engine':       'Engine',
  'hazop':        'HAZOP / LOPA',
  'settings':     'Settings',
  'projects':     'Projects',
}

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

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

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

  const displayName  = profile?.fullName || authUser?.user_metadata?.full_name || authUser?.email || 'User'
  const displayEmail = profile?.email || authUser?.email || ''
  const avatarUrl    = profile?.avatarUrl || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null
  const initials     = getUserInitials(displayName)

  const handleSignOut = async () => {
    try { await signOut(); setIsUserMenuOpen(false) } catch { /* error banner via store */ }
  }

  // ── Breadcrumb ────────────────────────────────────────────────────────
  const Breadcrumb = () => {
    if (view.type === 'sif-dashboard') {
      const project = projects.find(p => p.id === view.projectId)
      const sif     = project?.sifs.find(s => s.id === view.sifId)
      if (!project || !sif) return null
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => navigate({ type: 'projects' })}
            className="text-[13px] transition-colors shrink-0 hover:opacity-80"
            style={{ color: '#8FA0B1' }}
          >
            {project.name}
          </button>
          <ChevronRight size={13} style={{ color: '#4A5568', flexShrink: 0 }} />
          <span className="text-[13px] font-semibold truncate" style={{ color: '#DFE8F1' }}>
            {sif.sifNumber}
            {sif.title ? <span style={{ color: '#8FA0B1', fontWeight: 400 }}> · {sif.title}</span> : null}
          </span>
          <ChevronRight size={13} style={{ color: '#4A5568', flexShrink: 0 }} />
          <span className="text-[13px] font-medium shrink-0" style={{ color: '#5FD8D2' }}>
            {TAB_LABELS[normalizeSIFTab(view.tab)] ?? normalizeSIFTab(view.tab)}
          </span>
        </div>
      )
    }
    const label = VIEW_LABELS[view.type]
    if (!label || view.type === 'projects') return null
    return (
      <span className="text-[13px] font-semibold" style={{ color: '#DFE8F1' }}>{label}</span>
    )
  }

  return (
    <header
      className="sticky top-0 z-50 h-12 grid items-center border-b"
      style={{
        gridTemplateColumns: '288px 1fr auto',
        background: '#0F1318',
        borderColor: '#2A3138',
      }}
    >
      {/* Left Zone — Logo */}
      <div className="h-full flex items-center px-4 border-r" style={{ borderColor: '#2A3138' }}>
        <button
          onClick={() => navigate({ type: 'projects' })}
          className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
        >
          <img src="/favicon2.png" alt="PRISM" className="h-6 w-6 rounded object-contain" />
          <span className="text-[15px] font-black tracking-widest" style={{ color: '#DFE8F1', letterSpacing: '0.12em' }}>
            PRISM
          </span>
          <span
            className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded"
            style={{ background: '#009BA420', color: '#5FD8D2', border: '1px solid #009BA430' }}
          >
            IEC 61511
          </span>
        </button>
      </div>

      {/* Center Zone — Breadcrumb */}
      <div className="flex items-center px-5 min-w-0">
        <Breadcrumb />
      </div>

      {/* Right Zone — Actions */}
      <div className="flex items-center gap-1.5 px-3">
        <CommandPalette onOpenSettings={() => navigate({ type: 'settings', section: 'general' })} />

        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost" size="icon"
            className="rounded-full h-8 w-8 p-0"
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
            <div
              className="absolute right-0 top-10 w-64 rounded-xl border p-1.5 shadow-2xl z-50"
              style={{ background: '#14181C', borderColor: '#2A3138' }}
            >
              {/* User info */}
              <div className="rounded-lg px-3 py-2.5 mb-1" style={{ background: '#1A1F24' }}>
                <p className="text-sm font-semibold" style={{ color: '#DFE8F1' }}>{displayName}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: '#8FA0B1' }}>
                  {displayEmail || 'Authenticated user'}
                </p>
              </div>

              {/* Actions */}
              {[
                {
                  icon: Settings, label: 'Settings',
                  onClick: () => { navigate({ type: 'settings', section: 'general' }); setIsUserMenuOpen(false) },
                },
                {
                  icon: isDark ? Sun : Moon,
                  label: isDark ? 'Light mode' : 'Dark mode',
                  onClick: () => { toggleTheme(); setIsUserMenuOpen(false) },
                },
                {
                  icon: LogOut, label: 'Sign out', danger: true,
                  onClick: () => { void handleSignOut() },
                },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-[13px] flex items-center gap-2.5 transition-colors"
                  style={{ color: item.danger ? '#F87171' : '#8FA0B1' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = item.danger ? '#EF444415' : '#1D232A'
                    e.currentTarget.style.color      = item.danger ? '#F87171'  : '#DFE8F1'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color      = item.danger ? '#F87171' : '#8FA0B1'
                  }}
                  onClick={item.onClick}
                >
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}