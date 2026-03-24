import type { AppLocale } from '@/i18n/types'
import { resolveAppLocale } from '@/i18n/types'
import { type RecentItem, MAX_RECENT_ITEMS } from './recentItems'

export type AppThemePreference = 'dark' | 'light'

/** Views that can be set as the default landing screen (no SIF-specific views). */
export type LandingView = 'projects' | 'library' | 'engine' | 'audit-log' | 'planning' | 'hazop'
export const LANDING_VIEWS: readonly LandingView[] = ['projects', 'library', 'engine', 'audit-log', 'planning', 'hazop']

export interface AppPreferences {
  language: AppLocale
  theme: AppThemePreference
  engineCompareTolerancePct: number
  workspaceLeftPanelWidth: number
  workspaceRightPanelWidth: number
  /** Whether the 22px status bar at the bottom of the window is visible. */
  statusBarVisible: boolean
  /** Whether the activity bar (left icon rail) is visible. */
  activityBarVisible: boolean
  /** Whether the sidebar (left) and properties (right) panels are swapped. */
  panelsInverted: boolean
  /** Centers the editor column with a max-width, like VS Code Centered Layout. */
  centeredLayout: boolean
  /** Where the command palette dropdown appears: 'top' (under header) or 'center' (floating). */
  commandPalettePosition: 'top' | 'center'
  /** User-defined keybinding overrides: shortcut id → keybinding string (empty = unbound). */
  userKeybindings: Record<string, string>
  /** Default open/closed state applied to accordion sections on first visit. */
  rightPanelDefaultState: 'open' | 'closed'
  /** Persisted accordion closed-section IDs per panel key (e.g. "architecture", "library"). */
  rightPanelSectionStates: Record<string, string[]>

  // ── Startup ──────────────────────────────────────────────────────────────
  /** Screen shown on application startup. */
  defaultLandingView: LandingView

  // ── Engine / SIL display ─────────────────────────────────────────────────
  /** Display PFD/λ values in scientific notation (e.g. 1.23e-4) instead of decimal. */
  useScientificNotation: boolean
  /** Number of significant digits shown for PFD/λ values. */
  decimalRoundingDigits: number

  // ── SIF creation defaults ─────────────────────────────────────────────────
  /** Default mission time (TH) in hours pre-filled when creating a new SIF. */
  defaultMissionTimeTH: number
  /** Default proof-test interval (TI) in hours pre-filled when creating a new SIF. */
  defaultProofTestIntervalTH: number

  // ── Report ────────────────────────────────────────────────────────────────
  /** PDF page size used for report export. */
  pdfPageSize: 'A4' | 'Letter'
  recentItems: RecentItem[]
}

export const APP_PREFERENCES_STORAGE_KEY = 'prism-app-preferences'

export const WORKSPACE_LEFT_PANEL_WIDTH_MIN = 220
export const WORKSPACE_LEFT_PANEL_WIDTH_MAX = 320
export const WORKSPACE_LEFT_PANEL_WIDTH_DEFAULT = 240

export const WORKSPACE_RIGHT_PANEL_WIDTH_MIN = 220
export const WORKSPACE_RIGHT_PANEL_WIDTH_MAX = 720
export const WORKSPACE_RIGHT_PANEL_WIDTH_DEFAULT = 360

export const DEFAULT_MISSION_TIME_TH  = 8760   // 1 year in hours
export const DEFAULT_PROOF_TEST_TI    = 8760   // annual proof test
export const DECIMAL_ROUNDING_MIN     = 1
export const DECIMAL_ROUNDING_MAX     = 8
export const DECIMAL_ROUNDING_DEFAULT = 4

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  language: 'fr',
  theme: 'dark',
  engineCompareTolerancePct: 0.1,
  workspaceLeftPanelWidth: WORKSPACE_LEFT_PANEL_WIDTH_DEFAULT,
  workspaceRightPanelWidth: WORKSPACE_RIGHT_PANEL_WIDTH_DEFAULT,
  statusBarVisible: false,
  activityBarVisible: true,
  panelsInverted: false,
  centeredLayout: false,
  commandPalettePosition: 'top',
  userKeybindings: {},
  rightPanelDefaultState: 'open',
  rightPanelSectionStates: {},
  defaultLandingView: 'projects',
  useScientificNotation: false,
  decimalRoundingDigits: DECIMAL_ROUNDING_DEFAULT,
  defaultMissionTimeTH: DEFAULT_MISSION_TIME_TH,
  defaultProofTestIntervalTH: DEFAULT_PROOF_TEST_TI,
  pdfPageSize: 'A4',
  recentItems: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value === null ? false : typeof value === 'object'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function resolveAppPreferences(input?: Partial<AppPreferences> | null): AppPreferences {
  const source = isRecord(input) ? input : {}
  const language = resolveAppLocale(typeof source.language === 'string' ? source.language : null)
  const theme = source.theme === 'light' ? 'light' : DEFAULT_APP_PREFERENCES.theme
  const tolerance = typeof source.engineCompareTolerancePct === 'number' && Number.isFinite(source.engineCompareTolerancePct)
    ? clamp(source.engineCompareTolerancePct, 0, 5)
    : DEFAULT_APP_PREFERENCES.engineCompareTolerancePct
  const workspaceLeftPanelWidth = typeof source.workspaceLeftPanelWidth === 'number' && Number.isFinite(source.workspaceLeftPanelWidth)
    ? Math.round(clamp(source.workspaceLeftPanelWidth, WORKSPACE_LEFT_PANEL_WIDTH_MIN, WORKSPACE_LEFT_PANEL_WIDTH_MAX))
    : DEFAULT_APP_PREFERENCES.workspaceLeftPanelWidth
  const workspaceRightPanelWidth = typeof source.workspaceRightPanelWidth === 'number' && Number.isFinite(source.workspaceRightPanelWidth)
    ? Math.round(clamp(source.workspaceRightPanelWidth, WORKSPACE_RIGHT_PANEL_WIDTH_MIN, WORKSPACE_RIGHT_PANEL_WIDTH_MAX))
    : DEFAULT_APP_PREFERENCES.workspaceRightPanelWidth

  const statusBarVisible = typeof source.statusBarVisible === 'boolean'
    ? source.statusBarVisible
    : DEFAULT_APP_PREFERENCES.statusBarVisible

  const activityBarVisible = typeof source.activityBarVisible === 'boolean'
    ? source.activityBarVisible : DEFAULT_APP_PREFERENCES.activityBarVisible
  const panelsInverted = typeof source.panelsInverted === 'boolean'
    ? source.panelsInverted : DEFAULT_APP_PREFERENCES.panelsInverted
  const centeredLayout = typeof source.centeredLayout === 'boolean'
    ? source.centeredLayout : DEFAULT_APP_PREFERENCES.centeredLayout
  const commandPalettePosition = source.commandPalettePosition === 'center' ? 'center' as const
    : DEFAULT_APP_PREFERENCES.commandPalettePosition

  const userKeybindings: Record<string, string> = {}
  if (isRecord(source.userKeybindings)) {
    for (const [k, v] of Object.entries(source.userKeybindings)) {
      if (typeof k === 'string' && typeof v === 'string') userKeybindings[k] = v
    }
  }

  const rightPanelDefaultState: 'open' | 'closed' = source.rightPanelDefaultState === 'closed' ? 'closed' : 'open'

  const rightPanelSectionStates: Record<string, string[]> = {}
  if (isRecord(source.rightPanelSectionStates)) {
    for (const [k, v] of Object.entries(source.rightPanelSectionStates)) {
      if (typeof k === 'string' && Array.isArray(v)) {
        rightPanelSectionStates[k] = v.filter((s): s is string => typeof s === 'string')
      }
    }
  }

  const defaultLandingView: LandingView = LANDING_VIEWS.includes(source.defaultLandingView as LandingView)
    ? (source.defaultLandingView as LandingView)
    : DEFAULT_APP_PREFERENCES.defaultLandingView

  const useScientificNotation = typeof source.useScientificNotation === 'boolean'
    ? source.useScientificNotation : DEFAULT_APP_PREFERENCES.useScientificNotation

  const decimalRoundingDigits = typeof source.decimalRoundingDigits === 'number' && Number.isFinite(source.decimalRoundingDigits)
    ? Math.round(clamp(source.decimalRoundingDigits, DECIMAL_ROUNDING_MIN, DECIMAL_ROUNDING_MAX))
    : DEFAULT_APP_PREFERENCES.decimalRoundingDigits

  const defaultMissionTimeTH = typeof source.defaultMissionTimeTH === 'number' && Number.isFinite(source.defaultMissionTimeTH) && source.defaultMissionTimeTH > 0
    ? source.defaultMissionTimeTH
    : DEFAULT_APP_PREFERENCES.defaultMissionTimeTH

  const defaultProofTestIntervalTH = typeof source.defaultProofTestIntervalTH === 'number' && Number.isFinite(source.defaultProofTestIntervalTH) && source.defaultProofTestIntervalTH > 0
    ? source.defaultProofTestIntervalTH
    : DEFAULT_APP_PREFERENCES.defaultProofTestIntervalTH

  const pdfPageSize: 'A4' | 'Letter' = source.pdfPageSize === 'Letter' ? 'Letter' : 'A4'

  const recentItems: RecentItem[] = Array.isArray(source.recentItems)
    ? (source.recentItems as RecentItem[]).slice(0, MAX_RECENT_ITEMS)
    : []

  return {
    language,
    theme,
    engineCompareTolerancePct: Number(tolerance.toFixed(2)),
    workspaceLeftPanelWidth,
    workspaceRightPanelWidth,
    statusBarVisible,
    activityBarVisible,
    panelsInverted,
    centeredLayout,
    commandPalettePosition,
    userKeybindings,
    rightPanelDefaultState,
    rightPanelSectionStates,
    defaultLandingView,
    useScientificNotation,
    decimalRoundingDigits,
    defaultMissionTimeTH,
    defaultProofTestIntervalTH,
    pdfPageSize,
    recentItems,
  }
}

export function loadAppPreferences(): AppPreferences {
  if (typeof window === 'undefined') return DEFAULT_APP_PREFERENCES

  try {
    const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY)
    if (raw === null || raw === '') return DEFAULT_APP_PREFERENCES
    return resolveAppPreferences(JSON.parse(raw))
  } catch {
    return DEFAULT_APP_PREFERENCES
  }
}

export function saveAppPreferences(preferences: AppPreferences): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      APP_PREFERENCES_STORAGE_KEY,
      JSON.stringify(resolveAppPreferences(preferences)),
    )
  } catch {
    // Best-effort local persistence only.
  }
}

export function applyAppPreferencesToDocument(preferences: AppPreferences): void {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', preferences.theme === 'dark')
  document.documentElement.lang = preferences.language
}
