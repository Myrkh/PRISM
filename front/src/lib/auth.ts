import type { AuthChangeEvent, Session, Subscription, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { OAuthProviderName, PasswordSignUpResult, UserProfile } from '@/core/types'

function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    fullName: String(row.full_name ?? row.email ?? ''),
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    provider: typeof row.provider === 'string' ? row.provider : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    lastSignInAt: typeof row.last_sign_in_at === 'string' ? row.last_sign_in_at : null,
  }
}

function profilePayloadFromUser(user: User) {
  const meta = user.user_metadata ?? {}
  const appMeta = user.app_metadata ?? {}
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: meta.full_name ?? meta.name ?? meta.user_name ?? user.email?.split('@')[0] ?? '',
    avatar_url: meta.avatar_url ?? meta.picture ?? null,
    provider: appMeta.provider ?? meta.provider ?? null,
    last_sign_in_at: user.last_sign_in_at ?? new Date().toISOString(),
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(`Auth session: ${error.message}`)
  return data.session
}

export function subscribeToAuthState(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): Subscription {
  const { data } = supabase.auth.onAuthStateChange(callback)
  return data.subscription
}

export async function signInWithOAuthProvider(provider: OAuthProviderName): Promise<void> {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}${window.location.hash}`
    : undefined

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  })

  if (error) throw new Error(`OAuth sign-in: ${error.message}`)
}

export async function signInWithPasswordCredentials(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Password sign-in: ${error.message}`)
}

export async function signUpWithPasswordCredentials(
  email: string,
  password: string,
  fullName: string,
  metadata?: { company?: string; jobTitle?: string },
): Promise<PasswordSignUpResult> {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}${window.location.hash}`
    : undefined

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        company: metadata?.company?.trim() || null,
        job_title: metadata?.jobTitle?.trim() || null,
      },
      emailRedirectTo: redirectTo,
    },
  })

  if (error) throw new Error(`Password sign-up: ${error.message}`)
  return data.session ? 'signed_in' : 'pending_confirmation'
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}${window.location.hash}`
    : undefined

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw new Error(`Password reset: ${error.message}`)
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`Auth sign-out: ${error.message}`)
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(`Profile fetch: ${error.message}`)
  return data ? rowToProfile(data) : null
}

export async function upsertProfileFromUser(user: User): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profilePayloadFromUser(user), { onConflict: 'id' })
    .select('*')
    .single()

  if (error) throw new Error(`Profile sync: ${error.message}`)
  return rowToProfile(data)
}
