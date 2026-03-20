import type { ElementType } from 'react'
import {
  AlertTriangle,
  BookCopy,
  ClipboardCheck,
  FileClock,
  FileSearch,
  FileText,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  GitBranch,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type { SearchItemScope, SearchResultKind, SearchScopeId } from '@/features/search/searchIndex'

export const SEARCH_SCOPE_META: Record<SearchScopeId, {
  label: string
  hint: string
  Icon: ElementType
}> = {
  all: {
    label: 'Tout',
    hint: 'Tous les objets indexés',
    Icon: Search,
  },
  projects: {
    label: 'Projets',
    hint: 'Portefeuille et accès rapide',
    Icon: FolderOpen,
  },
  sifs: {
    label: 'SIF',
    hint: 'Fonctions et vues cockpit',
    Icon: ShieldCheck,
  },
  components: {
    label: 'Composants',
    hint: 'Parents, sous-composants et occurrences',
    Icon: Wrench,
  },
  assumptions: {
    label: 'Hypothèses',
    hint: 'Registre de contexte et de preuve',
    Icon: ClipboardCheck,
  },
  actions: {
    label: 'Actions',
    hint: 'Priorités cockpit et conformité',
    Icon: Sparkles,
  },
  proof: {
    label: 'Proof test',
    hint: 'Procédures, campagnes et événements',
    Icon: FlaskConical,
  },
  revisions: {
    label: 'Révisions',
    hint: 'Historique et publication',
    Icon: GitBranch,
  },
  reports: {
    label: 'Rapports',
    hint: 'Packages et PDFs publiés',
    Icon: FileText,
  },
}

export function getSearchScopeTone(scope: SearchItemScope) {
  switch (scope) {
    case 'projects':
      return '#6487B3'
    case 'sifs':
      return '#49B8C3'
    case 'components':
      return '#D4A55F'
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
    default:
      return '#49B8C3'
  }
}

export const SEARCH_SCOPE_ORDER: SearchItemScope[] = [
  'projects',
  'sifs',
  'components',
  'assumptions',
  'actions',
  'proof',
  'revisions',
  'reports',
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
    default:
      return Search
  }
}
