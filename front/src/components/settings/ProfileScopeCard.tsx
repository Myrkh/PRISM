import { useState, type MouseEvent } from 'react'
import type { SettingsStrings } from '@/i18n/settings'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface ProfileScopeCardProps {
  strings: SettingsStrings
  active: boolean
  onOpenProfile: () => void
  onOpenAppSettings: () => void
}

function getInitials(value: string | null | undefined): string {
  if (!value) return 'PR'
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PR'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase()
}

export function ProfileScopeCard({ strings, active, onOpenProfile, onOpenAppSettings }: ProfileScopeCardProps) {
  const profile = useAppStore(state => state.profile)
  const authUser = useAppStore(state => state.authUser)
  const signOut = useAppStore(state => state.signOut)
  const { BORDER, CARD_BG, PANEL_BG, PAGE_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const [signingOut, setSigningOut] = useState(false)

  const displayName = profile?.fullName || authUser?.user_metadata?.full_name || authUser?.email || strings.profile.values.unavailable
  const displayEmail = profile?.email || authUser?.email || strings.profile.values.unavailable
  const avatarUrl = profile?.avatarUrl || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null
  const initials = getInitials(displayName)
  const cardBackground = active ? CARD_BG : PANEL_BG
  const footerBackground = isDark ? 'rgba(255,255,255,0.03)' : PAGE_BG
  const signOutColor = isDark ? '#f6c56d' : '#92400e'

  const handleSignOut = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    try {
      setSigningOut(true)
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div
      className='w-full overflow-hidden rounded-t-lg rounded-b-none border'
      style={{
        borderColor: active ? TEAL + '66' : BORDER,
        background: cardBackground,
        boxShadow: active ? 'inset 0 1px 0 ' + (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.86)') : 'none',
      }}
    >
      <div
        aria-hidden='true'
        className='h-1.5 w-full'
        style={{ background: 'linear-gradient(90deg, ' + TEAL + ' 0%, ' + TEAL_DIM + ' 58%, ' + TEAL + ' 100%)' }}
      />

      <button
        type='button'
        onClick={onOpenProfile}
        className='w-full px-3 py-3 text-left transition-colors'
        style={{ background: cardBackground }}
      >
        <div className='flex items-center gap-3'>
          <div
            className='relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border'
            style={{
              borderColor: active ? TEAL + '55' : BORDER,
              background: avatarUrl ? PANEL_BG : 'linear-gradient(145deg, ' + TEAL + ' 0%, ' + (isDark ? '#0B5660' : '#005E66') + ' 100%)',
              boxShadow: 'inset 0 1px 0 ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)'),
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className='h-full w-full object-cover' />
            ) : (
              <span className='text-[13px] font-black tracking-[0.08em] text-white'>
                {initials}
              </span>
            )}
          </div>

          <div className='min-w-0 flex-1'>
            <p className='truncate text-[13px] font-semibold' style={{ color: TEXT }}>
              {displayName}
            </p>
            <p className='mt-0.5 truncate text-[11px]' style={{ color: TEXT_DIM }}>
              {displayEmail}
            </p>
          </div>
        </div>
      </button>

      <div className='grid grid-cols-2 gap-px border-t' style={{ borderColor: BORDER, background: BORDER }}>
        <button
          type='button'
          onClick={event => {
            event.stopPropagation()
            if (active) {
              onOpenAppSettings()
              return
            }
            onOpenProfile()
          }}
          className='h-8 px-3 text-[11px] font-semibold transition-colors'
          style={{ background: footerBackground, color: active ? TEAL_DIM : TEXT }}
        >
          {active ? strings.profileCard.prismSettings : strings.profileCard.editProfile}
        </button>
        <button
          type='button'
          onClick={event => { void handleSignOut(event) }}
          disabled={signingOut}
          className='h-8 px-3 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed'
          style={{ background: footerBackground, color: signingOut ? TEXT_DIM : signOutColor }}
        >
          {signingOut ? strings.profile.session.signingOut : strings.profile.session.signOutAction}
        </button>
      </div>
    </div>
  )
}
