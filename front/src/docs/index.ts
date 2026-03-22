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
import type { DocGroupMeta, DocIconName, DocResolvedChapter } from '@/docs/types'
import { gettingStartedChapter } from '@/docs/chapters/front/gettingStarted.chapter'
import { navigationChapter } from '@/docs/chapters/front/navigation.chapter'
import { projectsAndSifChapter } from '@/docs/chapters/front/projectsAndSif.chapter'
import { contextChapter } from '@/docs/chapters/front/context.chapter'
import { architectureChapter } from '@/docs/chapters/front/architecture.chapter'
import { libraryChapter } from '@/docs/chapters/front/library.chapter'
import { searchChapter } from '@/docs/chapters/front/search.chapter'
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

export const DOC_GROUPS: DocGroupMeta[] = [
  {
    id: 'front',
    label: 'Interface & workflow',
    summary: "Mode d'emploi complet de l'interface, du projet initial \u00e0 la publication du rapport.",
  },
  {
    id: 'engine',
    label: 'Moteur de calcul',
    summary: "Fonctionnement du moteur, contrat de calcul, interpr\u00e9tation du mod\u00e8le et limites de lecture.",
  },
]

const CHAPTERS = [
  gettingStartedChapter,
  navigationChapter,
  projectsAndSifChapter,
  contextChapter,
  architectureChapter,
  libraryChapter,
  searchChapter,
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

export const DOC_CHAPTERS: DocResolvedChapter[] = CHAPTERS.map(chapter => ({
  ...chapter,
  Icon: ICONS[chapter.icon],
}))
