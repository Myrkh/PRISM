/**
 * AppHeader.tsx — PRISM v3 (refactored)
 */
import { useRef, useState, useEffect } from 'react'
import { LogOut, Moon, Settings, Sun, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocaleStrings } from '@/i18n/useLocale'
import { getShellStrings } from '@/i18n/shell'
import { useAppStore } from '@/store/appStore'
import { normalizeSIFTab } from '@/store/types'
import { semantic } from '@/styles/tokens'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { CommandPalette } from './CommandPalette'

function getUserInitials(value: string | null | undefined): string {
  if (!value) return 'U'
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function AppHeader() {
  const { BORDER, RAIL_BG, PANEL_BG, PAGE_BG, SHADOW_SOFT, SHADOW_TAB, TEAL_DIM, TEXT, TEXT_DIM, isDark: themeIsDark } = usePrismTheme()
  const strings = useLocaleStrings(getShellStrings)
  const toggleTheme = useAppStore(s => s.toggleTheme)
  const view = useAppStore(s => s.view)
  const navigate = useAppStore(s => s.navigate)
  const projects = useAppStore(s => s.projects)
  const authUser = useAppStore(s => s.authUser)
  const profile = useAppStore(s => s.profile)
  const signOut = useAppStore(s => s.signOut)

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const displayName = profile?.fullName || authUser?.user_metadata?.full_name || authUser?.email || strings.header.fallbackUser
  const displayEmail = profile?.email || authUser?.email || ''
  const avatarUrl = profile?.avatarUrl || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null
  const initials = getUserInitials(displayName)

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsUserMenuOpen(false)
    } catch {
      // store handles error surfacing
    }
  }

  const breadcrumb = (() => {
    if (view.type === 'sif-dashboard') {
      const project = projects.find(p => p.id === view.projectId)
      const sif = project?.sifs.find(s => s.id === view.sifId)
      if (!project || !sif) return null

      return (
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            onClick={() => navigate({ type: 'projects' })}
            className="shrink-0 text-[13px] transition-colors hover:opacity-80"
            style={{ color: TEXT_DIM }}
          >
            {project.name}
          </button>
          <ChevronRight size={13} style={{ color: TEXT_DIM, flexShrink: 0 }} />
          <span className="truncate text-[13px] font-semibold" style={{ color: TEXT }}>
            {sif.sifNumber}
            {sif.title ? <span style={{ color: TEXT_DIM, fontWeight: 400 }}> · {sif.title}</span> : null}
          </span>
          <ChevronRight size={13} style={{ color: TEXT_DIM, flexShrink: 0 }} />
          <span className="shrink-0 text-[13px] font-medium" style={{ color: TEAL_DIM }}>
            {strings.sifTabLabels[normalizeSIFTab(view.tab)] ?? normalizeSIFTab(view.tab)}
          </span>
        </div>
      )
    }

    const label = strings.viewLabels[view.type]
    if (!label || view.type === 'projects') return null
    return <span className="text-[13px] font-semibold" style={{ color: TEXT }}>{label}</span>
  })()

  return (
    <header
      className="sticky top-0 z-50 grid h-12 items-center border-b"
      style={{
        gridTemplateColumns: '288px 1fr auto',
        background: RAIL_BG,
        borderColor: BORDER,
        boxShadow: `${SHADOW_TAB}, inset 0 1px 0 ${themeIsDark ? 'rgba(255,255,255,0.085)' : 'rgba(255,255,255,0.92)'}, inset 0 -1px 0 ${themeIsDark ? 'rgba(0,0,0,0.28)' : 'rgba(15,23,42,0.06)'}`,
      }}
    >
      <div
        className="flex h-full items-center border-r px-2"
        style={{
          borderColor: BORDER,
          boxShadow: `inset -1px 0 0 ${themeIsDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)'}, inset 0 1px 0 ${themeIsDark ? 'rgba(255,255,255,0.04)' : 'transparent'}`,
        }}
      >
        <button
          onClick={() => navigate({ type: 'projects' })}
          className="flex items-center gap-2 transition-opacity hover:opacity-85"
        >
          <img src="/favicon2.png" alt="PRISM" className="h-8 w-8 rounded object-contain" />
          <span className="text-[17px] font-black tracking-widest" style={{ color: TEXT_DIM }}>
            PRISM
          </span>
        </button>
      </div>

      <div className="flex min-w-0 items-center px-5">{breadcrumb}</div>

      <div className="flex items-center gap-1.5 px-3">
        <CommandPalette
          onOpenSettings={() => navigate({ type: 'settings', section: 'general' })}
          onOpenDocs={() => navigate({ type: 'docs' })}
          onOpenSearch={() => navigate({ type: 'search' })}
          onOpenLibrary={() => navigate({ type: 'library' })}
        />

        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full p-0"
            onClick={() => setIsUserMenuOpen(v => !v)}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: PAGE_BG,
                  color: TEXT,
                  border: `1px solid ${BORDER}`,
                  boxShadow: `${SHADOW_SOFT}, inset 0 1px 0 ${themeIsDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)'}`,
                }}
              >
                {initials}
              </span>
            )}
          </Button>

          {isUserMenuOpen && (
            <div
              className="absolute right-0 top-10 z-50 w-64 rounded-xl border p-1.5 shadow-2xl"
              style={{
                background: PANEL_BG,
                backgroundImage: themeIsDark ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)' : 'none',
                borderColor: BORDER,
                boxShadow: `${SHADOW_SOFT}, inset 0 1px 0 ${themeIsDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)'}`,
              }}
            >
              <div className="mb-1 rounded-lg px-3 py-2.5" style={{ background: PAGE_BG }}>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{displayName}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: TEXT_DIM }}>
                  {displayEmail || strings.header.authenticatedUser}
                </p>
              </div>

              {[
                {
                  icon: Settings,
                  label: strings.header.userMenuSettings,
                  onClick: () => {
                    navigate({ type: 'settings', section: 'general' })
                    setIsUserMenuOpen(false)
                  },
                },
                {
                  icon: themeIsDark ? Sun : Moon,
                  label: themeIsDark ? strings.header.userMenuLight : strings.header.userMenuDark,
                  onClick: () => {
                    toggleTheme()
                    setIsUserMenuOpen(false)
                  },
                },
                {
                  icon: LogOut,
                  label: strings.header.userMenuSignOut,
                  danger: true,
                  onClick: () => {
                    void handleSignOut()
                  },
                },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors"
                  style={{ color: item.danger ? semantic.error : TEXT_DIM }}
                  onMouseEnter={event => {
                    event.currentTarget.style.background = item.danger ? `${semantic.error}15` : PAGE_BG
                    event.currentTarget.style.color = item.danger ? semantic.error : TEXT
                  }}
                  onMouseLeave={event => {
                    event.currentTarget.style.background = 'transparent'
                    event.currentTarget.style.color = item.danger ? semantic.error : TEXT_DIM
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
