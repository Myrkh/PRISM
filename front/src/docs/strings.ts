import type { DocLocale } from '@/docs/types'

export type DocsUiStrings = {
  windowTitle: string
  heroKicker: string
  heroTitle: string
  heroSummary: string
  howToReadTitle: string
  howToReadSteps: string[]
  tocTitle: string
  collapse: string
  expand: string
  landmarksTitle: string
  sectionsTitle: string
  exampleTitle: string
  availableActionsTitle: string
  chapterBadge: (count: number) => string
  sectionCount: (count: number) => string
  counts: (chapters: number, sections: number) => string
  compactCounts: (chapters: number, sections: number) => string
}

const STRINGS: Record<DocLocale, DocsUiStrings> = {
  fr: {
    windowTitle: 'Documentation PRISM',
    heroKicker: 'Aide & documentation',
    heroTitle: 'Documentation PRISM',
    heroSummary: "Base d'usage complète. Elle explique comment utiliser le front de A à Z, puis comment le moteur interprète la modélisation pour produire des résultats, des rapports et une traçabilité exploitable.",
    howToReadTitle: 'Comment lire',
    howToReadSteps: [
      'Choisir un chapitre depuis la table des matières ou depuis les aperçus ci-dessous.',
      'Utiliser le sommaire interne de chaque chapitre pour naviguer directement à la bonne section.',
      'Les captures, exemples et snippets illustrent un usage réel, pas du décor.',
    ],
    tocTitle: 'Table des matières',
    collapse: 'Réduire',
    expand: 'Tout déployer',
    landmarksTitle: 'Repères',
    sectionsTitle: 'Sections',
    exampleTitle: 'Exemple concret',
    availableActionsTitle: 'Actions disponibles',
    chapterBadge: count => `${count} ch.`,
    sectionCount: count => `${count} sections`,
    counts: (chapters, sections) => `${chapters} chapitres · ${sections} sections`,
    compactCounts: (chapters, sections) => `${chapters} ch · ${sections} sec`,
  },
  en: {
    windowTitle: 'PRISM Documentation',
    heroKicker: 'Help & documentation',
    heroTitle: 'PRISM Documentation',
    heroSummary: 'Complete usage reference. It explains how to use the front-end from A to Z, then how the engine interprets the model to produce results, reports, and traceable outputs.',
    howToReadTitle: 'How to read',
    howToReadSteps: [
      'Choose a chapter from the table of contents or from the previews below.',
      'Use the internal outline of each chapter to jump directly to the right section.',
      'Screenshots, examples, and snippets illustrate real usage, not decoration.',
    ],
    tocTitle: 'Table of contents',
    collapse: 'Collapse',
    expand: 'Expand all',
    landmarksTitle: 'Highlights',
    sectionsTitle: 'Sections',
    exampleTitle: 'Concrete example',
    availableActionsTitle: 'Available actions',
    chapterBadge: count => `${count} ch.`,
    sectionCount: count => `${count} sections`,
    counts: (chapters, sections) => `${chapters} chapters · ${sections} sections`,
    compactCounts: (chapters, sections) => `${chapters} ch · ${sections} sec`,
  },
}

export function getDocsUiStrings(locale: DocLocale): DocsUiStrings {
  return STRINGS[locale] ?? STRINGS.fr
}
