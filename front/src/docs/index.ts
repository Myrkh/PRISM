import type { ElementType } from 'react'
import {
  BookOpenText,
  ClipboardCheck,
  Cpu,
  FileText,
  FlaskConical,
  FolderPlus,
  LayoutDashboard,
  Network,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import type {
  DocChapterData,
  DocChapterSource,
  DocGroupMeta,
  DocIconName,
  DocLocale,
  DocResolvedChapter,
  LocalizedDocGroupMeta,
} from '@/docs/types'
import { gettingStartedChapter } from '@/docs/chapters/front/gettingStarted.chapter'
import { navigationChapter } from '@/docs/chapters/front/navigation.chapter'
import { projectsAndSifChapter } from '@/docs/chapters/front/projectsAndSif.chapter'
import { contextChapter } from '@/docs/chapters/front/context.chapter'
import { architectureChapter } from '@/docs/chapters/front/architecture.chapter'
import { libraryChapter } from '@/docs/chapters/front/library.chapter'
import { searchChapter } from '@/docs/chapters/front/search.chapter'
import { prismAiChapter } from '@/docs/chapters/front/prismAi.chapter'
import { verificationChapter } from '@/docs/chapters/front/verification.chapter'
import { exploitationChapter } from '@/docs/chapters/front/exploitation.chapter'
import { reportChapter } from '@/docs/chapters/front/report.chapter'
import { auditLogChapter } from '@/docs/chapters/front/auditLog.chapter'
import { engineWorkspaceChapter } from '@/docs/chapters/front/engineWorkspace.chapter'
import { engineOverviewChapter } from '@/docs/chapters/engine/overview.chapter'
import { engineRuntimeChapter } from '@/docs/chapters/engine/runtime.chapter'
import { engineContractChapter } from '@/docs/chapters/engine/contract.chapter'
import { engineLogicChapter } from '@/docs/chapters/engine/logic.chapter'
import { engineResultsChapter } from '@/docs/chapters/engine/results.chapter'
import { engineLimitsChapter } from '@/docs/chapters/engine/limits.chapter'
import { frontDocTranslationsEn } from '@/docs/translations/front.en'
import { engineDocTranslationsEn } from '@/docs/translations/engine.en'

const ICONS: Record<DocIconName, ElementType> = {
  BookOpenText,
  ClipboardCheck,
  Cpu,
  FileText,
  FlaskConical,
  FolderPlus,
  LayoutDashboard,
  Network,
  Search,
  ShieldCheck,
  TriangleAlert,
}

const GROUP_SOURCES: LocalizedDocGroupMeta[] = [
  {
    fr: {
      id: 'front',
      label: 'Interface & workflow',
      summary: "Mode d'emploi complet de l'interface, du projet initial à la publication du rapport.",
    },
    en: {
      id: 'front',
      label: 'Interface & workflow',
      summary: 'Complete guide to the interface, from the first project to report publication.',
    },
  },
  {
    fr: {
      id: 'engine',
      label: 'Moteur de calcul',
      summary: 'Fonctionnement du moteur, contrat de calcul, interprétation du modèle et limites de lecture.',
    },
    en: {
      id: 'engine',
      label: 'Calculation engine',
      summary: 'Engine behavior, calculation contract, model interpretation, and reading limits.',
    },
  },
]

const EN_CHAPTER_OVERRIDES: Record<string, DocChapterData> = {
  ...frontDocTranslationsEn,
  ...engineDocTranslationsEn,
}

const CHAPTERS: DocChapterSource[] = [
  gettingStartedChapter,
  navigationChapter,
  projectsAndSifChapter,
  contextChapter,
  architectureChapter,
  libraryChapter,
  searchChapter,
  prismAiChapter,
  verificationChapter,
  exploitationChapter,
  reportChapter,
  auditLogChapter,
  engineWorkspaceChapter,
  engineOverviewChapter,
  engineRuntimeChapter,
  engineContractChapter,
  engineLogicChapter,
  engineResultsChapter,
  engineLimitsChapter,
]

function isLocalizedChapter(source: DocChapterSource): source is Record<DocLocale, DocChapterData> {
  return typeof source === 'object' && source !== null && 'fr' in source && 'en' in source
}

function resolveChapter(source: DocChapterSource, locale: DocLocale): DocChapterData {
  if (isLocalizedChapter(source)) {
    return source[locale] ?? source.fr
  }

  if (locale === 'en') {
    return EN_CHAPTER_OVERRIDES[source.id] ?? source
  }

  return source
}

function resolveGroup(source: LocalizedDocGroupMeta, locale: DocLocale): DocGroupMeta {
  return source[locale] ?? source.fr
}

export function getDocGroups(locale: DocLocale): DocGroupMeta[] {
  return GROUP_SOURCES.map(group => resolveGroup(group, locale))
}

export function getDocChapters(locale: DocLocale): DocResolvedChapter[] {
  return CHAPTERS.map(source => {
    const chapter = resolveChapter(source, locale)
    return {
      ...chapter,
      Icon: ICONS[chapter.icon],
    }
  })
}

export const DOC_GROUPS = getDocGroups('fr')
export const DOC_CHAPTERS = getDocChapters('fr')
