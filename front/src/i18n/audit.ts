import type { AuditKind, AuditScope } from '@/components/audit/auditModel'
import type { AppLocale } from './types'
import { auditStringsEn } from './locales/en/audit'
import { auditStringsFr } from './locales/fr/audit'

export interface AuditModelStrings {
  actors: {
    system: string
    unknownProject: string
  }
  linkedViews: {
    project: string
    cockpit: string
    exploitation: string
    engineHistory: string
  }
  projectCreated: {
    action: string
    details: (projectName: string) => string
  }
  projectUpdated: {
    action: string
    details: (projectName: string) => string
  }
  sifDate: {
    action: string
    details: string
  }
  sifStatus: {
    action: (status: string) => string
    details: (status: string) => string
  }
  campaign: {
    action: (verdict: string) => string
    defaultDetails: string
  }
  event: {
    action: (type: string) => string
    defaultDetails: string
  }
  engine: {
    runLaunched: string
    runDone: string
    runFailed: string
    compareLaunched: string
    compareDone: string
    compareFailed: string
    batchLaunched: string
    batchDone: string
    batchFailed: string
    defaultError: string
    recordedRun: string
    mode: (mode: string) => string
    sil: (value: number) => string
    warnings: (count: number) => string
    runtime: (ms: string) => string
    version: (version: string) => string
  }
}

export interface AuditStrings {
  localeTag: string
  kinds: Record<AuditKind, string>
  scopes: Record<AuditScope, { label: string; hint: string }>
  header: {
    eyebrow: string
    title: string
    description: string
    visible: (count: number) => string
    warnings: (count: number) => string
  }
  search: {
    placeholder: string
    filtered: (count: number, total: number) => string
    visibleTotal: (count: number) => string
  }
  sidebar: {
    title: string
    summaryLoading: string
    summaryProjectFiltered: (count: number) => string
    summaryDefault: (count: number) => string
    reset: string
    scopeTitle: string
    projectsTitle: string
    allProjectsLabel: string
    allProjectsHint: string
    quickReadTitle: string
    warningsSummary: (count: number) => string
    usage: string
  }
  rightPanel: {
    eventTab: string
    selectionTitle: string
    selectionEmpty: string
    contextTitle: string
    contextDate: string
    contextProject: string
    contextSif: string
    contextActor: string
    contextLinkedView: string
    contextEmpty: string
    actionTitle: string
    openEngine: string
    openSif: string
    actionEmpty: string
  }
  row: {
    actorFallback: string
    linkedViewFallback: string
  }
  table: {
    level: string
    date: string
    event: string
    context: string
  }
  badges: {
    warning: string
    info: string
  }
  empty: {
    title: string
    loadingDescription: string
    resetDescription: string
  }
  model: AuditModelStrings
}

const AUDIT_STRINGS: Record<AppLocale, AuditStrings> = {
  fr: auditStringsFr,
  en: auditStringsEn,
}

export function getAuditStrings(locale: AppLocale): AuditStrings {
  return AUDIT_STRINGS[locale]
}
