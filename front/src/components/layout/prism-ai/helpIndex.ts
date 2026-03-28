import type { Project } from '@/core/types'
import { getDocChapters } from '@/docs'
import type { DocBlock, DocResolvedChapter } from '@/docs/types'
import type { AppLocale } from '@/i18n/types'
import { buildProjectCommandSeed } from './commands'

export type PrismHelpEntryKind = 'command' | 'doc'

export interface PrismHelpEntry {
  id: string
  kind: PrismHelpEntryKind
  badge: string
  label: string
  meta: string
  query: string
  attachmentName: string
  attachmentContent: string
  searchText: string
  rank: number
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function renderBlock(block: DocBlock, locale: AppLocale): string {
  const isFr = locale === 'fr'
  const parts: string[] = [`## ${block.title}`, block.intro]

  if (block.points.length > 0) {
    parts.push(...block.points.map(point => `- ${point}`))
  }

  if (block.example) {
    parts.push(
      isFr ? '### Exemple' : '### Example',
      `${isFr ? '- Titre' : '- Title'}: ${block.example.title}`,
      `${isFr ? '- Résumé' : '- Summary'}: ${block.example.summary}`,
      ...block.example.steps.map(step => `- ${step}`),
    )
    if (block.example.result) {
      parts.push(`${isFr ? '- Résultat' : '- Result'}: ${block.example.result}`)
    }
  }

  if (block.actions && block.actions.length > 0) {
    parts.push(
      isFr ? '### Actions disponibles' : '### Available actions',
      ...block.actions.map(action => `- ${action.label}${action.hint ? ` — ${action.hint}` : ''}`),
    )
  }

  if (block.snippet) {
    parts.push(`### Extrait: ${block.snippet.title}`, '```', block.snippet.code, '```')
  }

  if (block.snippets && block.snippets.length > 0) {
    parts.push(...block.snippets.flatMap(snippet => [`### Extrait: ${snippet.title}`, '```', snippet.code, '```']))
  }

  return parts.join('\n\n')
}

function renderChapterAttachment(chapter: DocResolvedChapter, locale: AppLocale): string {
  const isFr = locale === 'fr'
  const parts: string[] = [`# ${chapter.title}`, chapter.summary]

  if (chapter.highlights.length > 0) {
    parts.push(isFr ? '## Repères' : '## Highlights', ...chapter.highlights.map(highlight => `- ${highlight.label}: ${highlight.value}`))
  }

  parts.push(...chapter.blocks.map(block => renderBlock(block, locale)))
  return parts.join('\n\n')
}

function buildCommandHelpEntries(locale: AppLocale, currentProject: Project | null): PrismHelpEntry[] {
  const isFr = locale === 'fr'
  const createSifSeed = currentProject ? buildProjectCommandSeed('create_sif', currentProject) : '>create_sif project:REF '
  const draftSifSeed = currentProject ? buildProjectCommandSeed('draft_sif', currentProject) : '>draft_sif project:REF '
  const createLibrarySeed = currentProject ? buildProjectCommandSeed('create_library', currentProject) : '>create_library project:REF '

  const entries: Array<Omit<PrismHelpEntry, 'searchText' | 'rank'>> = [
    {
      id: 'help-command-strict',
      kind: 'command',
      badge: 'CMD',
      label: 'strict',
      meta: isFr ? 'Mode strict PRISM AI' : 'PRISM AI strict mode',
      query: 'strict',
      attachmentName: 'PRISM Help · strict',
      attachmentContent: isFr
        ? [
            '# Commande PRISM AI `>strict`',
            '## Syntaxe',
            '- `>strict` active le mode strict.',
            '- `>strict off` désactive le mode strict.',
            '## Effet',
            '- réponses sobres et structurées',
            '- hypothèses explicites',
            '- aucune invention si la donnée manque',
            '- prudence renforcée sur IEC 61511',
            '## Contexte utilisé',
            '- conversation courante',
            '- fichiers `.prism` injectés automatiquement',
            '- SIF / fichiers workspace joints si présents',
          ].join('\n\n')
        : [
            '# PRISM AI command `>strict`',
            '## Syntax',
            '- `>strict` enables strict mode.',
            '- `>strict off` disables strict mode.',
            '## Effect',
            '- terse, structured answers',
            '- explicit assumptions',
            '- no guessing when data is missing',
            '- stronger IEC 61511 caution',
          ].join('\n\n'),
    },
    {
      id: 'help-command-create-project',
      kind: 'command',
      badge: 'CMD',
      label: 'create_project',
      meta: isFr ? 'Créer un projet gouverné au contrat .prism' : 'Create a governed .prism project',
      query: 'create_project',
      attachmentName: 'PRISM Help · create_project',
      attachmentContent: isFr
        ? [
            '# Commande PRISM AI `>create_project`',
            '## Syntaxe',
            '- `>create_project Décrivez le projet, le client, le site, l’unité et les objectifs.`',
            '## Contexte lu automatiquement',
            '- `.prism/context.md`',
            '- `.prism/conventions.md`',
            '- `.prism/standards.md`',
            '- pièces jointes workspace éventuelles',
            '## Résultat',
            '- contrat JSON `.prism` projet structuré',
            '- preview projet avant application',
            '- JSON temporaire éditable si besoin',
          ].join('\n\n')
        : [
            '# PRISM AI command `>create_project`',
            '## Syntax',
            '- `>create_project Describe the project, client, site, unit, and goals.`',
            '## Context used',
            '- `.prism/context.md`',
            '- `.prism/conventions.md`',
            '- `.prism/standards.md`',
            '- optional workspace attachments',
          ].join('\n\n'),
    },
    {
      id: 'help-command-create-sif',
      kind: 'command',
      badge: 'CMD',
      label: 'create_sif',
      meta: isFr ? 'Créer une SIF gouvernée avec preview workflow' : 'Create a governed SIF with workflow preview',
      query: 'create_sif',
      attachmentName: 'PRISM Help · create_sif',
      attachmentContent: isFr
        ? [
            '# Commande PRISM AI `>create_sif`',
            '## Syntaxe',
            `- Exemple: \`${createSifSeed}Créer une SIF de surpression pour R-201 avec fermeture de XV-201.\``,
            '## Paramètre obligatoire',
            '- `project:REF` ou `project:"Nom du projet"`',
            '## Contexte lu automatiquement',
            '- `.prism/context.md`',
            '- `.prism/conventions.md`',
            '- `.prism/standards.md`',
            '- registre SIF du workspace',
            '- métadonnées du projet cible',
            '- pièces jointes workspace éventuelles',
            '## Résultat',
            '- JSON structuré SIF',
            '- preview du vrai workflow SIF',
            '- Apply / Discard / JSON',
          ].join('\n\n')
        : [
            '# PRISM AI command `>create_sif`',
            '## Syntax',
            `- Example: \`${createSifSeed}Create an overpressure SIF for R-201 with XV-201 final action.\``,
            '## Required parameter',
            '- `project:REF` or `project:"Project name"`',
          ].join('\n\n'),
    },
    {
      id: 'help-command-draft-sif',
      kind: 'command',
      badge: 'CMD',
      label: 'draft_sif',
      meta: isFr ? 'Préparer un brouillon SIF sans appliquer' : 'Prepare a SIF draft without applying it',
      query: 'draft_sif',
      attachmentName: 'PRISM Help · draft_sif',
      attachmentContent: isFr
        ? [
            '# Commande PRISM AI `>draft_sif`',
            '## Syntaxe',
            `- Exemple: \`${draftSifSeed}Prépare un brouillon de SIF niveau haut sur R-201.\``,
            '## Différence avec `create_sif`',
            '- même contrat gouverné',
            '- même preview workflow',
            '- mais rien n’est créé tant que vous n’appliquez pas',
          ].join('\n\n')
        : [
            '# PRISM AI command `>draft_sif`',
            '## Syntax',
            `- Example: \`${draftSifSeed}Prepare a high-level SIF draft for R-201.\``,
          ].join('\n\n'),
    },
    {
      id: 'help-command-create-library',
      kind: 'command',
      badge: 'CMD',
      label: 'create_library',
      meta: isFr ? 'Créer un template Library gouverné' : 'Create a governed Library template',
      query: 'create_library',
      attachmentName: 'PRISM Help · create_library',
      attachmentContent: isFr
        ? [
            '# Commande PRISM AI `>create_library`',
            '## Syntaxe',
            `- Exemple projet: \`${createLibrarySeed}Créer un transmetteur de pression SIL 2 pour surpression R-201.\``,
            '- Exemple utilisateur: `>create_library Créer un starter capteur pression pour bibliothèque personnelle.`',
            '## Contexte lu automatiquement',
            '- `.prism/context.md`',
            '- `.prism/conventions.md`',
            '- `.prism/standards.md`',
            '- projet cible si `project:...` est fourni',
            '- pièces jointes workspace éventuelles',
            '## Résultat',
            '- contrat `prism.component-templates`',
            '- preview dans le vrai panneau Library',
            '- JSON temporaire éditable si besoin',
          ].join('\n\n')
        : [
            '# PRISM AI command `>create_library`',
            '## Syntax',
            `- Example: \`${createLibrarySeed}Create a SIL 2 pressure transmitter template for R-201 overpressure.\``,
          ].join('\n\n'),
    },
    {
      id: 'help-command-draft-note',
      kind: 'command',
      badge: 'CMD',
      label: 'draft_note',
      meta: isFr ? 'Créer une note Markdown propre dans le workspace' : 'Create a clean markdown note in the workspace',
      query: 'draft_note',
      attachmentName: 'PRISM Help · draft_note',
      attachmentContent: isFr
        ? [
            '# Commande PRISM AI `>draft_note`',
            '## Syntaxe',
            '- `>draft_note Résume les hypothèses restantes pour la SIF-103.`',
            '## Effet',
            '- l’IA retourne uniquement le contenu utile de la note',
            '- la note est créée automatiquement dans le workspace',
            '- pas d’intro ni d’outro conversationnelle dans la note',
          ].join('\n\n')
        : [
            '# PRISM AI command `>draft_note`',
            '## Syntax',
            '- `>draft_note Summarize the remaining assumptions for SIF-103.`',
          ].join('\n\n'),
    },
    {
      id: 'help-command-attach',
      kind: 'command',
      badge: 'CTX',
      label: '# attach',
      meta: isFr ? 'Joindre une SIF ou un fichier workspace' : 'Attach a SIF or workspace file',
      query: '#',
      attachmentName: 'PRISM Help · attachments',
      attachmentContent: isFr
        ? [
            '# Mode `#` — attacher du contexte',
            '## Syntaxe',
            '- tapez `#` puis recherchez une SIF, une note, un PDF, une image ou un JSON',
            '## Effet',
            '- la sélection joint le document à la conversation courante',
            '- les fichiers `.prism` sont déjà injectés automatiquement',
          ].join('\n\n')
        : [
            '# `#` mode — attach context',
            '## Syntax',
            '- type `#` then search a SIF, note, PDF, image, or JSON file',
          ].join('\n\n'),
    },
    {
      id: 'help-command-help',
      kind: 'command',
      badge: 'DOC',
      label: '? help',
      meta: isFr ? 'Interroger la documentation PRISM complète' : 'Query the complete PRISM documentation',
      query: '?',
      attachmentName: 'PRISM Help · help-mode',
      attachmentContent: isFr
        ? [
            '# Mode `?` — documentation et aide PRISM',
            '## Syntaxe',
            '- `?create_sif` pour la syntaxe d’une commande',
            '- `?library` pour la documentation Library',
            '- `?proof test` pour retrouver un sujet dans la doc PRISM',
            '## Effet',
            '- PRISM AI reçoit la documentation locale pertinente en contexte',
            '- la réponse doit se fonder sur cette doc et dire clairement si l’info manque',
          ].join('\n\n')
        : [
            '# `?` mode — PRISM documentation and help',
            '## Syntax',
            '- `?create_sif` for command syntax',
            '- `?library` for Library documentation',
          ].join('\n\n'),
    },
  ]

  return entries.map((entry, index) => ({
    ...entry,
    searchText: normalize(`${entry.label} ${entry.meta} ${entry.attachmentContent}`),
    rank: index,
  }))
}

function buildDocHelpEntries(locale: AppLocale): PrismHelpEntry[] {
  const isFr = locale === 'fr'

  const docChapters = getDocChapters(locale)

  return docChapters.map((chapter, index) => {
    const attachmentContent = renderChapterAttachment(chapter, locale)
    const blockText = chapter.blocks.flatMap(block => [block.title, block.intro, ...block.points]).join(' ')
    const highlightText = chapter.highlights.map(highlight => `${highlight.label} ${highlight.value}`).join(' ')

    return {
      id: `help-doc-${chapter.id}`,
      kind: 'doc' as const,
      badge: 'DOC',
      label: chapter.title,
      meta: isFr ? `Documentation PRISM · ${chapter.kicker}` : `PRISM documentation · ${chapter.kicker}`,
      query: chapter.title,
      attachmentName: `PRISM Docs · ${chapter.title}`,
      attachmentContent,
      searchText: normalize(`${chapter.title} ${chapter.summary} ${highlightText} ${blockText}`),
      rank: 100 + index,
    }
  })
}

export function getPrismCommandHelpEntries(locale: AppLocale, currentProject: Project | null): PrismHelpEntry[] {
  return buildCommandHelpEntries(locale, currentProject)
}

export function getPrismDocHelpEntries(locale: AppLocale): PrismHelpEntry[] {
  return buildDocHelpEntries(locale)
}

function scoreHelpEntry(entry: PrismHelpEntry, normalizedQuery: string): number {
  if (!normalizedQuery) return 1000 - entry.rank

  let score = 0
  if (normalize(entry.label) === normalizedQuery) score += 180
  if (normalize(entry.query) === normalizedQuery) score += 160
  if (normalize(entry.label).includes(normalizedQuery)) score += 80
  if (normalize(entry.meta).includes(normalizedQuery)) score += 40

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    if (entry.searchText.includes(token)) score += 12
    if (normalize(entry.label).includes(token)) score += 18
  }

  return score
}

export function findPrismHelpEntries(query: string, locale: AppLocale, currentProject: Project | null): PrismHelpEntry[] {
  const entries = [...buildCommandHelpEntries(locale, currentProject), ...buildDocHelpEntries(locale)]
  const normalizedQuery = normalize(query)

  return entries
    .map(entry => ({ entry, score: scoreHelpEntry(entry, normalizedQuery) }))
    .filter(item => !normalizedQuery || item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.rank - right.entry.rank)
    .map(item => item.entry)
}

export function buildPrismHelpAttachments(entries: PrismHelpEntry[], locale: AppLocale): Array<{
  kind: 'note'
  node_id: string
  name: string
  content: string
}> {
  const selectedEntries = entries.slice(0, 3)
  if (selectedEntries.length > 0) {
    return selectedEntries.map(entry => ({
      kind: 'note' as const,
      node_id: entry.id,
      name: entry.attachmentName,
      content: entry.attachmentContent,
    }))
  }

  const fallbackContent = locale === 'fr'
    ? '# Documentation PRISM\n\nAucune entrée documentaire précise n’a été trouvée pour cette requête. Répondez uniquement si l’information est présente dans le contexte PRISM disponible; sinon dites-le clairement.'
    : '# PRISM documentation\n\nNo precise documentation entry was found for this query. Only answer if the information is present in the available PRISM context; otherwise say so clearly.'

  return [{
    kind: 'note' as const,
    node_id: 'help-fallback',
    name: 'PRISM Docs · fallback',
    content: fallbackContent,
  }]
}
