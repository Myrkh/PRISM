import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import type { SIFTab } from '@/store/types'
import { semantic, TEXT_DIM } from '@/styles/tokens'
import type { OperationalHealth } from './overviewMetrics'

export const OVERVIEW_ACTION_CTA: Record<SIFTab, string> = {
  overview: 'Review below',
  architecture: 'Open Loop Editor',
  analysis: 'Open Calculations',
  compliance: 'Open Compliance',
  prooftest: 'Open Proof Test',
  report: 'Open Reports',
}

export const OVERVIEW_PANEL_CTA: Record<SIFTab, string> = {
  overview: 'Review on dashboard',
  architecture: 'Open Loop Editor',
  analysis: 'Open Calculations',
  compliance: 'Open Compliance',
  prooftest: 'Open Proof Test',
  report: 'Open Reports',
}

export const OVERVIEW_OPERATIONAL_HEALTH_META: Record<OperationalHealth, {
  label: string
  color: string
  bg: string
  border: string
  Icon: LucideIcon
}> = {
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
    color: TEXT_DIM,
    bg: `${TEXT_DIM}12`,
    border: `${TEXT_DIM}22`,
    Icon: FileText,
  },
}
