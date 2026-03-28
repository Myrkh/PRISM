/**
 * Command palette modes — VS Code-style prefix detection.
 *
 * ''  (no prefix) → default: all items (current behavior)
 * '>' → commands: actions, toggles, navigation
 * '#' → sif: search SIFs by number / title / tag
 * '@' → symbols: components in current SIF architecture
 * '?' → help: list of available modes
 */

export type CommandMode = 'default' | 'commands' | 'sif' | 'symbols' | 'help'

/** Semantic badge colors per mode — intentionally distinct from the TEAL token palette. */
const MODE_COLORS = {
  commands: '#60A5FA', // blue-400   — actions & system commands
  sif:      '#4ADE80', // green-400  — SIF navigation & workspace
  symbols:  '#F59E0B', // amber-400  — architecture symbols & library
  help:     '#A78BFA', // violet-400 — documentation & help
} as const

export interface ModeConfig {
  prefix: string
  mode: CommandMode
  badge: string
  badgeColor: string
  placeholder: string
}

export const COMMAND_MODES: ModeConfig[] = [
  {
    prefix:      '>',
    mode:        'commands',
    badge:       'COMMANDES',
    badgeColor:  MODE_COLORS.commands,
    placeholder: 'Rechercher une commande ou action…',
  },
  {
    prefix:      '#',
    mode:        'sif',
    badge:       'SIF & WORKSPACE',
    badgeColor:  MODE_COLORS.sif,
    placeholder: 'SIF, note, PDF, image…',
  },
  {
    prefix:      '@',
    mode:        'symbols',
    badge:       'SYMBOLES',
    badgeColor:  MODE_COLORS.symbols,
    placeholder: 'Composant dans la SIF courante…',
  },
  {
    prefix:      '?',
    mode:        'help',
    badge:       'AIDE',
    badgeColor:  MODE_COLORS.help,
    placeholder: 'Commande, sujet ou chapitre de documentation PRISM…',
  },
]

/** Parse the raw input and return the active mode + clean query. */
export function detectMode(raw: string): {
  mode: CommandMode
  query: string
  config: ModeConfig | null
} {
  if (!raw) return { mode: 'default', query: '', config: null }
  const config = COMMAND_MODES.find(m => raw.startsWith(m.prefix)) ?? null
  if (!config) return { mode: 'default', query: raw, config: null }
  return { mode: config.mode, query: raw.slice(config.prefix.length).trimStart(), config }
}

/** Dispatch a custom event to open the palette, optionally pre-filled. */
export function openPalette(search = '') {
  document.dispatchEvent(
    new CustomEvent('prism:palette:open', { detail: { search } }),
  )
}

/** Dispatch a custom event to toggle the palette. */
export function togglePalette() {
  document.dispatchEvent(
    new CustomEvent('prism:palette:toggle'),
  )
}
