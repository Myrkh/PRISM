/**
 * src/types/index.ts — PRISM Launcher
 */

export type LauncherView = 'home' | 'library' | 'updates' | 'settings'

export type AuthMode = 'login' | 'signup'

export type InstallStatus =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'up_to_date' }
  | { phase: 'downloading'; progress: number; label: string }
  | { phase: 'installing'; progress: number }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

export interface Release {
  tag:        string
  name:       string
  publishedAt: string
  notes:      string[]
  downloadUrl: string
  size:       string
}

export interface AuthUser {
  email:    string
  fullName: string
  initials: string
}
