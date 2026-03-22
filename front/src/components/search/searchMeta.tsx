import type { ElementType } from 'react'
import {
  AlertTriangle,
  BookCopy,
  BookOpen,
  ClipboardCheck,
  FileClock,
  FileSearch,
  FileText,
  Files,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  GitBranch,
  NotebookText,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type { SearchItemScope, SearchResultKind, SearchScopeId } from '@/features/search/searchIndex'
import { getSearchStrings } from '@/i18n/search'
import type { AppLocale } from '@/i18n/types'

export function getSearchScopeMeta(locale: AppLocale): Record<SearchScopeId, {
  label: string
  hint: string
  Icon: ElementType
}> {
  const strings = getSearchStrings(locale)

  return {
    all: {
      label: strings.scopeMeta.all.label,
      hint: strings.scopeMeta.all.hint,
      Icon: Search,
    },
    projects: {
      label: strings.scopeMeta.projects.label,
      hint: strings.scopeMeta.projects.hint,
      Icon: FolderOpen,
    },
    sifs: {
      label: strings.scopeMeta.sifs.label,
      hint: strings.scopeMeta.sifs.hint,
      Icon: ShieldCheck,
    },
    components: {
      label: strings.scopeMeta.components.label,
      hint: strings.scopeMeta.components.hint,
      Icon: Wrench,
    },
    library: {
      label: strings.scopeMeta.library.label,
      hint: strings.scopeMeta.library.hint,
      Icon: BookOpen,
    },
    assumptions: {
      label: strings.scopeMeta.assumptions.label,
      hint: strings.scopeMeta.assumptions.hint,
      Icon: ClipboardCheck,
    },
    actions: {
      label: strings.scopeMeta.actions.label,
      hint: strings.scopeMeta.actions.hint,
      Icon: Sparkles,
    },
    proof: {
      label: strings.scopeMeta.proof.label,
      hint: strings.scopeMeta.proof.hint,
      Icon: FlaskConical,
    },
    revisions: {
      label: strings.scopeMeta.revisions.label,
      hint: strings.scopeMeta.revisions.hint,
      Icon: GitBranch,
    },
    reports: {
      label: strings.scopeMeta.reports.label,
      hint: strings.scopeMeta.reports.hint,
      Icon: FileText,
    },
    workspace: {
      label: strings.scopeMeta.workspace.label,
      hint: strings.scopeMeta.workspace.hint,
      Icon: Files,
    },
  }
}

export function getSearchResultKindLabel(locale: AppLocale, kind: SearchResultKind): string {
  return getSearchStrings(locale).resultKindLabels[kind]
}

export function getSearchScopeTone(scope: SearchItemScope) {
  switch (scope) {
    case 'projects':
      return '#6487B3'
    case 'sifs':
      return '#49B8C3'
    case 'components':
      return '#D4A55F'
    case 'library':
      return '#5B8DEF'
    case 'assumptions':
      return '#5FA3F3'
    case 'actions':
      return '#60C097'
    case 'proof':
      return '#4FB79F'
    case 'revisions':
      return '#8D9CB8'
    case 'reports':
      return '#D07C43'
    case 'workspace':
      return '#9E7FD4'
    default:
      return '#49B8C3'
  }
}

export const SEARCH_SCOPE_ORDER: SearchItemScope[] = [
  'projects',
  'sifs',
  'components',
  'library',
  'assumptions',
  'actions',
  'proof',
  'revisions',
  'reports',
  'workspace',
]

export function getSearchResultIcon(kind: SearchResultKind): ElementType {
  switch (kind) {
    case 'project':
      return FolderKanban
    case 'sif':
      return ShieldCheck
    case 'component':
      return Wrench
    case 'subcomponent':
      return BookCopy
    case 'template':
      return BookOpen
    case 'assumption':
      return ClipboardCheck
    case 'action':
      return Sparkles
    case 'procedure':
      return FlaskConical
    case 'campaign':
      return FileSearch
    case 'event':
      return AlertTriangle
    case 'revision':
      return FileClock
    case 'report':
      return FileText
    case 'note':
      return NotebookText
    case 'workspace-file':
      return Files
    default:
      return Search
  }
}
