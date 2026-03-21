/**
 * src/tokens.ts — PRISM Launcher
 * Tokens identiques à PRISM main app (src/styles/tokens.ts).
 * Source de vérité pour toutes les couleurs et shadows du launcher.
 */

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

export const colors = {
  teal:     '#009BA4',
  tealDim:  '#5FD8D2',
  tealDark: '#007A82',
  navy:     '#003D5C',
  navyDark: '#002A42',
} as const

export const semantic = {
  success:    '#4ADE80',
  successDim: '#15803D',
  warning:    '#F59E0B',
  warningDim: '#B45309',
  error:      '#EF4444',
  errorDim:   '#DC2626',
  info:       '#60A5FA',
} as const

export const shadowsDark = {
  card:  '0 24px 46px rgba(0,0,0,0.34), 0 10px 18px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.16)',
  panel: '0 32px 66px rgba(0,0,0,0.42), 0 12px 24px rgba(0,0,0,0.28), 0 3px 6px rgba(0,0,0,0.18)',
  soft:  '0 14px 28px rgba(0,0,0,0.22), 0 5px 10px rgba(0,0,0,0.15)',
} as const

export const shadowsLight = {
  card:  '0 24px 46px rgba(15,23,42,0.065), 0 10px 18px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.025)',
  panel: '0 30px 64px rgba(15,23,42,0.085), 0 12px 24px rgba(15,23,42,0.05), 0 3px 6px rgba(15,23,42,0.03)',
  soft:  '0 14px 28px rgba(15,23,42,0.05), 0 5px 10px rgba(15,23,42,0.028)',
} as const

/** Alpha hex shorthand */
export function alpha(hex: string, a: string): string {
  return `${hex}${a}`
}
