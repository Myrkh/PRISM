/**
 * styles/tokens.ts — PRISM Design System
 *
 * Single source of truth pour toutes les constantes visuelles.
 * Importé par tous les composants au lieu de redéfinir localement.
 *
 * Convention :
 *   – dark.*  → dark mode (default)
 *   – light.* → light mode (DA KORE paper style)
 *   – Colors  → brand / semantic
 */

// ─── Dark Mode (default) ─────────────────────────────────────────────────
export const dark = {
  rail:    '#0F1318',
  panel:   '#14181C',
  card:    '#23292F',
  card2:   '#1D232A',
  page:    '#1A1F24',
  border:  '#2A3138',
  text:    '#DFE8F1',
  textDim: '#8FA0B1',
} as const

// ─── Light Mode (DA KORE paper) ──────────────────────────────────────────
export const light = {
  rail:    '#E9EEF3',
  panel:   '#EDF2F6',
  card:    '#FFFFFF',
  card2:   '#F6F8FB',
  page:    '#F2F5F8',
  border:  '#D5DDE6',
  text:    '#18212B',
  textDim: '#667281',
} as const

// ─── Brand Colors ────────────────────────────────────────────────────────
export const colors = {
  teal:      '#009BA4',
  tealDim:   '#5FD8D2',
  tealDark:  '#007A82',
  navy:      '#003D5C',
  navyDark:  '#002A42',
} as const

// ─── Subsystem Colors ────────────────────────────────────────────────────
export const subsystemColors: Record<string, string> = {
  sensor:   '#0284C7',
  logic:    '#7C3AED',
  actuator: '#EA580C',
} as const

// ─── Status Colors ───────────────────────────────────────────────────────
export const statusColors: Record<string, string> = {
  active:    '#16A34A',
  completed: '#2563EB',
  archived:  '#6B7280',
  draft:     '#6B7280',
  in_review: '#F59E0B',
  verified:  '#0284C7',
  approved:  '#16A34A',
} as const

export const statusLabels: Record<string, string> = {
  active:    'Actif',
  completed: 'Clôturé',
  archived:  'Archivé',
  draft:     'Draft',
  in_review: 'In Review',
  verified:  'Verified',
  approved:  'Approved',
} as const

// ─── Semantic Colors ─────────────────────────────────────────────────────
export const semantic = {
  success:    '#4ADE80',
  successDim: '#15803D',
  warning:    '#F59E0B',
  warningDim: '#B45309',
  error:      '#EF4444',
  errorDim:   '#DC2626',
  info:       '#60A5FA',
} as const

// ─── Geometry ────────────────────────────────────────────────────────────
export const radius = 8

// ─── Convenience re-exports (backward compat — used by most components) ─
// These match the local const names that were duplicated everywhere.
export const RAIL_BG  = dark.rail
export const PANEL_BG = dark.panel
export const CARD_BG  = dark.card
export const SURFACE  = dark.card2    // Inner cards / table background — contrasts with CARD_BG
export const PAGE_BG  = dark.page
export const BORDER   = dark.border
export const TEXT     = dark.text
export const TEXT_DIM = dark.textDim
export const TEAL     = colors.teal
export const TEAL_DIM = colors.tealDim
export const NAVY     = colors.navy
export const NAVY2    = colors.navyDark
export const R        = radius
