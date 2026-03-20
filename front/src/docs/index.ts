
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
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import type { DocGroupMeta, DocIconName, DocResolvedChapter } from '@/docs/types'
import { gettingStartedChapter } from '@/docs/chapters/front/gettingStarted.chapter'
import { navigationChapter } from '@/docs/chapters/front/navigation.chapter'
import { projectsAndSifChapter } from '@/docs/chapters/front/projectsAndSif.chapter'
import { contextChapter } from '@/docs/chapters/front/context.chapter'
import { architectureChapter } from '@/docs/chapters/front/architecture.chapter'
import { libraryChapter } from '@/docs/chapters/front/library.chapter'
import { verificationChapter } from '@/docs/chapters/front/verification.chapter'
import { exploitationChapter } from '@/docs/chapters/front/exploitation.chapter'
import { reportChapter } from '@/docs/chapters/front/report.chapter'
import { engineOverviewChapter } from '@/docs/chapters/engine/overview.chapter'
import { engineRuntimeChapter } from '@/docs/chapters/engine/runtime.chapter'
import { engineContractChapter } from '@/docs/chapters/engine/contract.chapter'
import { engineLogicChapter } from '@/docs/chapters/engine/logic.chapter'
import { engineResultsChapter } from '@/docs/chapters/engine/results.chapter'
import { engineLimitsChapter } from '@/docs/chapters/engine/limits.chapter'

const ICONS: Record<DocIconName, ElementType> = {
  BookOpenText,
  ClipboardCheck,
  Cpu,
  FileText,
  FlaskConical,
  FolderPlus,
  LayoutDashboard,
  Network,
  ShieldCheck,
  TriangleAlert,
}

export const DOC_GROUPS: DocGroupMeta[] = [
  {
    id: 'front',
    label: 'Documentation front',
    summary: 'Mode d’emploi complet de l’interface, du projet initial à la publication du rapport.',
  },
  {
    id: 'engine',
    label: 'Documentation moteur',
    summary: 'Fonctionnement du moteur, contrat de calcul, interprétation du modèle et limites de lecture.',
  },
]

const CHAPTERS = [
  gettingStartedChapter,
  navigationChapter,
  projectsAndSifChapter,
  contextChapter,
  architectureChapter,
  libraryChapter,
  verificationChapter,
  exploitationChapter,
  reportChapter,
  engineOverviewChapter,
  engineRuntimeChapter,
  engineContractChapter,
  engineLogicChapter,
  engineResultsChapter,
  engineLimitsChapter,
]

export const DOC_CHAPTERS: DocResolvedChapter[] = CHAPTERS.map(chapter => ({
  ...chapter,
  Icon: ICONS[chapter.icon],
}))
