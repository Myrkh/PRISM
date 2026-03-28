import type { SettingsStrings } from '@/i18n/settings'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

function getInitials(value: string | null | undefined): string {
  if (!value) return 'PR'
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PR'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase()
}

export function ProfileScopeCard({
  strings,
  onClick,
}: {
  strings: SettingsStrings
  onClick: () => void
}) {
  const profile = useAppStore(state => state.profile)
  const authUser = useAppStore(state => state.authUser)
  const { CARD_BG, TEAL, TEAL_DIM, TEXT, TEXT_DIM, isDark } = usePrismTheme()

  const displayName  = profile?.fullName || authUser?.user_metadata?.full_name || authUser?.email || strings.profile.values.unavailable
  const displayEmail = profile?.email || authUser?.email || strings.profile.values.unavailable
  const avatarUrl    = profile?.avatarUrl || authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null
  const initials     = getInitials(displayName)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full overflow-hidden rounded-xl border text-left transition-opacity hover:opacity-90"
      style={{
        borderColor: `${TEAL}55`,
        background: CARD_BG,
      }}
    >
      {/* Teal accent bar */}
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${TEAL} 0%, ${TEAL_DIM} 58%, ${TEAL} 100%)` }}
      />

      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Avatar */}
        <div
          className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border"
          style={{
            borderColor: `${TEAL}45`,
            background: avatarUrl
              ? 'transparent'
              : `linear-gradient(145deg, ${TEAL} 0%, ${isDark ? '#0B5660' : '#005E66'} 100%)`,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[12px] font-black tracking-[0.06em] text-white">{initials}</span>
          )}
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold" style={{ color: TEXT }}>
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-[11px]" style={{ color: TEXT_DIM }}>
            {displayEmail}
          </p>
        </div>

        {/* Chevron hint */}
        <svg
          className="shrink-0"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ color: `${TEAL}80` }}
        >
          <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}
