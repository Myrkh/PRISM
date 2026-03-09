export type OAuthProviderName = 'google' | 'github'
export type PasswordSignUpResult = 'signed_in' | 'pending_confirmation'

export interface UserProfile {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  provider: string | null
  createdAt: string
  updatedAt: string
  lastSignInAt: string | null
}
