import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import { normalizeSIFTab, type SIFTab } from '@/store/types'
import { semantic } from '@/styles/tokens'
import type { OperationalHealth } from './overviewMetrics'

export function getOverviewActionCta(tab: SIFTab): string {
  switch (normalizeSIFTab(tab)) {
    case 'cockpit':
      return 'Revenir au cockpit'
    case 'context':
      return 'Compléter le contexte'
    case 'history':
      return 'Voir l’historique'
    case 'architecture':
      return 'Ouvrir l’architecture'
    case 'verification':
      return 'Ouvrir la vérification'
    case 'exploitation':
      return 'Ouvrir l’exploitation'
    case 'report':
      return 'Ouvrir le rapport'
  }
}

export function getOverviewPanelCta(tab: SIFTab): string {
  switch (normalizeSIFTab(tab)) {
    case 'cockpit':
      return 'Voir dans le cockpit'
    case 'context':
      return 'Ouvrir le contexte'
    case 'history':
      return 'Voir l’historique'
    case 'architecture':
      return 'Ouvrir l’architecture'
    case 'verification':
      return 'Ouvrir la vérification'
    case 'exploitation':
      return 'Ouvrir l’exploitation'
    case 'report':
      return 'Ouvrir le rapport'
  }
}

export function getOverviewOperationalHealthMeta(textDim: string): Record<OperationalHealth, {
  label: string
  color: string
  bg: string
  border: string
  Icon: LucideIcon
}> {
  return {
    healthy: {
      label: 'Sous contrôle',
      color: semantic.success,
      bg: `${semantic.success}1A`,
      border: `${semantic.success}33`,
      Icon: CheckCircle2,
    },
    watch: {
      label: 'Sous surveillance',
      color: semantic.warning,
      bg: `${semantic.warning}1A`,
      border: `${semantic.warning}33`,
      Icon: AlertTriangle,
    },
    critical: {
      label: 'Action requise',
      color: semantic.error,
      bg: `${semantic.error}1A`,
      border: `${semantic.error}33`,
      Icon: AlertTriangle,
    },
    unknown: {
      label: 'Sans données',
      color: textDim,
      bg: `${textDim}12`,
      border: `${textDim}22`,
      Icon: FileText,
    },
  }
}
