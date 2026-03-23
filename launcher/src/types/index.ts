/**
 * src/types/index.ts — PRISM Launcher
 */

export type LauncherView = 'home' | 'library' | 'updates' | 'settings' | 'admin'

export type AuthMode = 'login' | 'signup'

export type UserRole = 'admin' | 'user'

export interface AuthUser {
  id:        number
  email:     string
  fullName:  string
  initials:  string
  role:      UserRole
  active:    boolean
  createdAt: string
  lastLogin: string | null
}

export interface AdminUser extends AuthUser {}

export interface LicenseInfo {
  company:     string
  seats:       number
  expires_at:  string | null
  activated_at: string
  key_display: string
}

export interface AuditEntry {
  id:         number
  user_id:    number | null
  user_email: string | null
  action:     string
  detail:     string | null
  timestamp:  string
}

export type InstallStatus =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'up_to_date' }
  | { phase: 'downloading'; progress: number; label: string }
  | { phase: 'installing';  progress: number; label?: string }
  | { phase: 'ready' }   // Launcher only: installer downloaded, pending quitAndInstall
  | { phase: 'done' }
  | { phase: 'error'; message: string }

export interface LauncherSettings {
  prismWindow: {
    rememberBounds:         boolean
    defaultSize:            'last_used' | '1280x800' | '1440x900' | '1920x1080' | 'maximized'
    rememberPosition:       boolean
    minimizeLauncherOnOpen: boolean
  }
  backend: {
    startupTimeoutSecs: number
    autoStartPrism:     boolean
    autoUpdatePrism:    boolean
  }
  session: {
    durationHours: 1 | 4 | 8 | 24
  }
}

export interface Release {
  tag:         string
  name:        string
  publishedAt: string
  notes:       string[]
  downloadUrl: string
  size:        string
}
