/**
 * helpGroups — builds the '?' mode command groups:
 *   - Search modes reference
 *   - Command palette shortcuts
 *   - PRISM AI command help entries
 *   - Documentation chapters + sections
 */
import { AtSign, Hash, HelpCircle, Search, Terminal } from 'lucide-react'
import { getEffectiveKeybinding } from '@/core/shortcuts/defaults'
import { getRegisteredShortcutEntries } from '@/core/commands/registry'
import { buildDocBlockId } from '@/components/docs/DocsNavigation'
import { getPrismCommandHelpEntries } from '@/components/layout/prism-ai/helpIndex'
import type { AppLocale } from '@/i18n/types'
import type { ShellStrings } from '@/i18n/shell'
import type { AppPreferences } from '@/core/models/appPreferences'
import type { DocResolvedChapter, DocBlock } from '@/docs/types'
import type { Project } from '@/core/types/sif.types'
import type { CommandGroup } from './types'

interface HelpGroupsOptions {
  locale: AppLocale
  strings: ShellStrings
  preferences: AppPreferences
  docChapters: DocResolvedChapter[]
  docGroupLabels: Map<string, string>
  currentProject: Project | null
  setSearch: (s: string) => void
  openDocsTarget: (chapterId: string, blockId?: string) => void
}

export function buildHelpGroups({
  locale,
  strings,
  preferences,
  docChapters,
  docGroupLabels,
  currentProject,
  setSearch,
  openDocsTarget,
}: HelpGroupsOptions): CommandGroup[] {
  // ── Search modes ────────────────────────────────────────────────────────────

  const modesGroup: CommandGroup = {
    heading: locale === 'fr' ? 'Modes de recherche' : 'Search modes',
    items: [
      {
        id: 'help-mode-default',
        label: locale === 'fr' ? '(aucun préfixe) — Recherche globale' : '(no prefix) — Global search',
        keywords: 'default search recherche globale mode help aide',
        Icon: Search,
        meta: locale === 'fr'
          ? 'SIF, notes, PDF, composants, templates…'
          : 'SIFs, notes, PDFs, components, templates…',
        onSelect: () => setSearch(''),
        isActive: false,
        level: 0,
      },
      {
        id: 'help-mode-commands',
        label: locale === 'fr' ? '> Commandes & actions' : '> Commands & actions',
        keywords: 'commands commandes actions mode help aide',
        Icon: Terminal,
        meta: locale === 'fr'
          ? 'Actions globales sans navigation brute.'
          : 'Global actions without raw navigation entries.',
        onSelect: () => setSearch('>'),
        isActive: false,
        level: 0,
      },
      {
        id: 'help-mode-sif',
        label: '# SIF & Workspace',
        keywords: 'sif search number numéro titre workspace note pdf image json prism mode help aide',
        Icon: Hash,
        meta: locale === 'fr'
          ? 'Naviguer vers une SIF, un fichier workspace ou un fichier .prism'
          : 'Navigate to a SIF, a workspace file, or a .prism file',
        onSelect: () => setSearch('#'),
        isActive: false,
        level: 0,
      },
      {
        id: 'help-mode-symbols',
        label: locale === 'fr' ? '@ Symboles — SIF & Library' : '@ Symbols — SIF & Library',
        keywords: 'symbols symboles composants architecture library mode help aide',
        Icon: AtSign,
        meta: locale === 'fr'
          ? 'Composants de toutes les SIF + templates Library'
          : 'Components from all SIFs + Library templates',
        onSelect: () => setSearch('@'),
        isActive: false,
        level: 0,
      },
    ],
  }

  // ── Command palette shortcuts ────────────────────────────────────────────────

  const shortcutsGroup: CommandGroup = {
    heading: locale === 'fr' ? 'Raccourcis command palette' : 'Command palette shortcuts',
    items: getRegisteredShortcutEntries()
      .filter(entry => entry.id === 'commandPalette' || entry.id === 'commandMode')
      .map(entry => ({
        id: `help-shortcut-${entry.id}`,
        label: `${getEffectiveKeybinding(entry.id, preferences.userKeybindings) || '—'} — ${locale === 'fr' ? entry.commandFr : entry.commandEn}`,
        keywords: `shortcut raccourci keyboard clavier ${entry.id} ${entry.commandFr} ${entry.commandEn}`.toLowerCase(),
        Icon: entry.id === 'commandMode' ? Terminal : HelpCircle,
        meta: entry.id === 'commandMode'
          ? (locale === 'fr' ? 'Préremplit le préfixe > dans la palette.' : 'Preloads the > prefix in the palette.')
          : (locale === 'fr' ? 'Ouvre ou ferme la palette globale.' : 'Opens or closes the global palette.'),
        onSelect: () => { /* informational only */ },
        isActive: false,
        level: 0 as const,
      })),
  }

  // ── PRISM AI command help ────────────────────────────────────────────────────

  const commandsGroup: CommandGroup = {
    heading: locale === 'fr' ? 'Aide des commandes' : 'Command help',
    items: getPrismCommandHelpEntries(locale, currentProject).map(entry => ({
      id: `help-command-${entry.id}`,
      label: entry.label.startsWith('>') || entry.label.startsWith('#') || entry.label.startsWith('?')
        ? entry.label
        : `>${entry.label}`,
      keywords: `help aide command commande ${entry.query} ${entry.meta}`.toLowerCase(),
      Icon: entry.label.startsWith('#') ? Hash : entry.label.startsWith('?') ? HelpCircle : Terminal,
      meta: entry.meta,
      onSelect: () => {
        if (entry.query === '#' || entry.query === '?') {
          setSearch(entry.query)
          return
        }
        setSearch(`?${entry.query}`)
      },
      isActive: false,
      level: 0 as const,
    })),
  }

  // ── Documentation chapters ───────────────────────────────────────────────────

  const docGroups: CommandGroup[] = docChapters.map(chapter => ({
    heading: `${docGroupLabels.get(chapter.group) ?? chapter.group} · ${chapter.title}`,
    items: [
      {
        id: `help-doc-${chapter.id}`,
        label: chapter.title,
        keywords: `doc documentation ${chapter.title} ${chapter.group} ${chapter.summary} help aide`.toLowerCase(),
        Icon: chapter.Icon,
        meta: chapter.summary,
        onSelect: () => openDocsTarget(chapter.id),
        isActive: false,
        level: 0 as const,
      },
      ...chapter.blocks.map((block: DocBlock, index: number) => ({
        id: `help-doc-block-${chapter.id}-${index}`,
        label: block.title,
        keywords: `doc documentation ${chapter.title} ${block.title} ${block.intro} ${(block.points ?? []).join(' ')} help aide`.toLowerCase(),
        Icon: chapter.Icon,
        meta: chapter.title,
        onSelect: () => openDocsTarget(chapter.id, buildDocBlockId(chapter.id, block, index)),
        isActive: false,
        level: 1 as const,
      })),
    ],
  }))

  return [modesGroup, shortcutsGroup, commandsGroup, ...docGroups]
}
