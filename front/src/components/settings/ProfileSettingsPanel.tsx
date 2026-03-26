import { useState, type ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SettingsStrings } from '@/i18n/settings'
import type { AppLocale } from '@/i18n/types'
import { useAppStore, type ProfileSettingsSection } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'

interface ProfileSettingsPanelProps {
  locale: AppLocale
  section: ProfileSettingsSection
  strings: SettingsStrings
}

function formatDateTime(locale: AppLocale, value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDate(locale: AppLocale, value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'medium',
  }).format(date)
}

function formatProvider(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'github') return 'GitHub'
  if (normalized === 'google') return 'Google'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function ProfileSettingRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  const { BORDER, CARD_BG, TEXT, TEXT_DIM } = usePrismTheme()

  return (
    <div className='flex items-center justify-between gap-4 rounded-xl border px-4 py-3' style={{ borderColor: BORDER, background: CARD_BG }}>
      <div className='min-w-0'>
        <p className='text-sm font-semibold' style={{ color: TEXT }}>{label}</p>
        {hint ? <p className='mt-1 text-xs leading-relaxed' style={{ color: TEXT_DIM }}>{hint}</p> : null}
      </div>
      <div className='min-w-0 shrink-0 text-right'>{children}</div>
    </div>
  )
}

function ValueText({ value, breakAll = false }: { value: string; breakAll?: boolean }) {
  const { TEXT } = usePrismTheme()

  return (
    <p className={breakAll ? 'max-w-[280px] break-all text-sm font-semibold' : 'max-w-[280px] text-sm font-semibold'} style={{ color: TEXT }}>
      {value}
    </p>
  )
}

export function ProfileSettingsPanel({ locale, section, strings }: ProfileSettingsPanelProps) {
  const profile = useAppStore(state => state.profile)
  const authUser = useAppStore(state => state.authUser)
  const signOut = useAppStore(state => state.signOut)
  const [signingOut, setSigningOut] = useState(false)

  const fallback = strings.profile.values.unavailable
  const displayName = profile?.fullName || authUser?.user_metadata?.full_name || authUser?.email || fallback
  const displayEmail = profile?.email || authUser?.email || fallback
  const provider = formatProvider(profile?.provider || authUser?.app_metadata?.provider || authUser?.user_metadata?.provider || null, strings.profileCard.providerFallback)
  const userId = profile?.id || authUser?.id || fallback
  const profileUpdated = formatDateTime(locale, profile?.updatedAt, fallback)
  const lastSignIn = formatDateTime(locale, profile?.lastSignInAt || authUser?.last_sign_in_at || null, fallback)
  const memberSince = formatDate(locale, profile?.createdAt, fallback)

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className='space-y-4 p-5'>
      {section === 'account' ? (
        <>
          <ProfileSettingRow label={strings.profile.account.fullName}>
            <ValueText value={displayName} />
          </ProfileSettingRow>

          <ProfileSettingRow label={strings.profile.account.email}>
            <ValueText value={displayEmail} />
          </ProfileSettingRow>

          <ProfileSettingRow label={strings.profile.account.provider}>
            <ValueText value={provider} />
          </ProfileSettingRow>

          <ProfileSettingRow label={strings.profile.account.profileUpdated}>
            <ValueText value={profileUpdated} />
          </ProfileSettingRow>

          <ProfileSettingRow label={strings.profile.account.userId}>
            <ValueText value={userId} breakAll />
          </ProfileSettingRow>
        </>
      ) : (
        <>
          <ProfileSettingRow label={strings.profile.session.currentSession}>
            <ValueText value={strings.profile.values.active} />
          </ProfileSettingRow>

          <ProfileSettingRow label={strings.profile.session.provider}>
            <ValueText value={provider} />
          </ProfileSettingRow>

          <ProfileSettingRow label={strings.profile.session.lastSignIn}>
            <ValueText value={lastSignIn} />
          </ProfileSettingRow>

          <ProfileSettingRow label={strings.profile.session.memberSince}>
            <ValueText value={memberSince} />
          </ProfileSettingRow>

          <ProfileSettingRow label={strings.profile.session.signOutTitle} hint={strings.profile.session.signOutHint}>
            <Button variant='outline' onClick={() => { void handleSignOut() }} disabled={signingOut}>
              <LogOut size={14} className='mr-2' />
              {signingOut ? strings.profile.session.signingOut : strings.profile.session.signOutAction}
            </Button>
          </ProfileSettingRow>
        </>
      )}
    </div>
  )
}
