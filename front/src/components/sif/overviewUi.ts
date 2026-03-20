import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import { getSifOverviewStrings, type SifOverviewStrings } from '@/i18n/sifOverview'
import { normalizeSIFTab, type SIFTab } from '@/store/types'
import { semantic } from '@/styles/tokens'
import type { OperationalHealth } from './overviewMetrics'

function resolveStrings(strings?: SifOverviewStrings): SifOverviewStrings {
  return strings ?? getSifOverviewStrings('fr')
}

export function getOverviewActionCta(tab: SIFTab, strings?: SifOverviewStrings): string {
  const copy = resolveStrings(strings)
  return copy.actionCtas.primary[normalizeSIFTab(tab)]
}

export function getOverviewPanelCta(tab: SIFTab, strings?: SifOverviewStrings): string {
  const copy = resolveStrings(strings)
  return copy.actionCtas.panel[normalizeSIFTab(tab)]
}

export function getOverviewOperationalHealthMeta(
  textDim: string,
  strings?: SifOverviewStrings,
): Record<OperationalHealth, {
  label: string
  color: string
  bg: string
  border: string
  Icon: LucideIcon
}> {
  const copy = resolveStrings(strings)

  return {
    healthy: {
      label: copy.operationalHealth.healthy,
      color: semantic.success,
      bg: `${semantic.success}1A`,
      border: `${semantic.success}33`,
      Icon: CheckCircle2,
    },
    watch: {
      label: copy.operationalHealth.watch,
      color: semantic.warning,
      bg: `${semantic.warning}1A`,
      border: `${semantic.warning}33`,
      Icon: AlertTriangle,
    },
    critical: {
      label: copy.operationalHealth.critical,
      color: semantic.error,
      bg: `${semantic.error}1A`,
      border: `${semantic.error}33`,
      Icon: AlertTriangle,
    },
    unknown: {
      label: copy.operationalHealth.unknown,
      color: textDim,
      bg: `${textDim}12`,
      border: `${textDim}22`,
      Icon: FileText,
    },
  }
}
