import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import { normalizeSIFTab, type SIFTab } from '@/store/types'
import { semantic } from '@/styles/tokens'
import type { OperationalHealth } from './overviewMetrics'

export function getOverviewActionCta(tab: SIFTab): string {
  switch (normalizeSIFTab(tab)) {
    case 'cockpit':
      return 'Review cockpit'
    case 'context':
      return 'Complete context'
    case 'history':
      return 'Review revision history'
    case 'architecture':
      return 'Open loop editor'
    case 'verification':
      return 'Open verification'
    case 'exploitation':
      return 'Open exploitation'
    case 'report':
      return 'Open report studio'
  }
}

export function getOverviewPanelCta(tab: SIFTab): string {
  switch (normalizeSIFTab(tab)) {
    case 'cockpit':
      return 'Review in cockpit'
    case 'context':
      return 'Open context'
    case 'history':
      return 'Open revision history'
    case 'architecture':
      return 'Open loop editor'
    case 'verification':
      return 'Open verification'
    case 'exploitation':
      return 'Open exploitation'
    case 'report':
      return 'Open report studio'
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
      label: 'Healthy',
      color: semantic.success,
      bg: `${semantic.success}1A`,
      border: `${semantic.success}33`,
      Icon: CheckCircle2,
    },
    watch: {
      label: 'Watch list',
      color: semantic.warning,
      bg: `${semantic.warning}1A`,
      border: `${semantic.warning}33`,
      Icon: AlertTriangle,
    },
    critical: {
      label: 'Action required',
      color: semantic.error,
      bg: `${semantic.error}1A`,
      border: `${semantic.error}33`,
      Icon: AlertTriangle,
    },
    unknown: {
      label: 'No data',
      color: textDim,
      bg: `${textDim}12`,
      border: `${textDim}22`,
      Icon: FileText,
    },
  }
}
