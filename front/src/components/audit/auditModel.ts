import type { EngineRun, EngineRunTriggerKind, Project } from '@/core/types'
import type { SIFTab } from '@/store/types'
import type { AuditModelStrings } from '@/i18n/audit'

export type AuditLevel = 'info' | 'warning'
export type AuditKind = 'governance' | 'proof-tests' | 'operations' | 'engine'
export type AuditScope = 'all' | 'warnings' | AuditKind
export type AuditTargetView = 'sif' | 'engine'

export interface AuditEntry {
  id: string
  level: AuditLevel
  kind: AuditKind
  /** For engine entries: the trigger kind (manual | compare | batch) */
  subKind?: EngineRunTriggerKind
  timestamp: string
  action: string
  details: string
  actor: string
  projectName: string
  projectId?: string
  sifNumber?: string
  sifId?: string
  actionTab?: SIFTab
  targetView?: AuditTargetView
  linkedViewLabel?: string
}

export const AUDIT_SCOPE_ORDER: AuditScope[] = [
  'all',
  'warnings',
  'governance',
  'proof-tests',
  'operations',
  'engine',
]

export const AUDIT_SCOPE_TONES: Record<AuditScope, string> = {
  all: '#0F9CA6',
  warnings: '#D97706',
  governance: '#2563EB',
  'proof-tests': '#0E9F6E',
  operations: '#7C3AED',
  engine: '#0F766E',
}

export const AUDIT_KIND_TONES: Record<AuditKind, string> = {
  governance: '#2563EB',
  'proof-tests': '#0E9F6E',
  operations: '#7C3AED',
  engine: '#0F766E',
}

export function formatAuditWhen(ts: string, localeTag = 'fr-FR'): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return ts
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function matchesAuditScope(entry: AuditEntry, scope: AuditScope): boolean {
  if (scope === 'all') return true
  if (scope === 'warnings') return entry.level === 'warning'
  return entry.kind === scope
}

function getEngineRunTimestamp(run: EngineRun): string | null {
  return run.finishedAt ?? run.startedAt ?? run.createdAt ?? run.updatedAt ?? null
}

function formatEngineRunAction(run: EngineRun, strings: AuditModelStrings): string {
  if (run.triggerKind === 'compare') {
    if (run.status === 'error') return strings.engine.compareFailed
    if (run.status === 'done') return strings.engine.compareDone
    return strings.engine.compareLaunched
  }

  if (run.triggerKind === 'batch') {
    if (run.status === 'error') return strings.engine.batchFailed
    if (run.status === 'done') return strings.engine.batchDone
    return strings.engine.batchLaunched
  }

  if (run.status === 'error') return strings.engine.runFailed
  if (run.status === 'done') return strings.engine.runDone
  return strings.engine.runLaunched
}

function formatEngineRunDetails(run: EngineRun, strings: AuditModelStrings): string {
  if (run.status === 'error') {
    return run.errorMessage || strings.engine.defaultError
  }

  const resultSummary = run.resultSummary ?? {}
  const details: string[] = []

  if (run.requestedMode) details.push(strings.engine.mode(run.requestedMode))
  if (typeof resultSummary.silAchieved === 'number') details.push(strings.engine.sil(resultSummary.silAchieved))
  if (typeof run.warningCount === 'number' && run.warningCount > 0) details.push(strings.engine.warnings(run.warningCount))
  if (typeof run.runtimeMs === 'number' && Number.isFinite(run.runtimeMs)) details.push(strings.engine.runtime(run.runtimeMs.toFixed(1)))
  if (run.backendVersion) details.push(strings.engine.version(run.backendVersion))

  return details.join(' · ') || strings.engine.recordedRun
}

function buildEngineRunAuditEntries(projects: Project[], engineRuns: EngineRun[], strings: AuditModelStrings): AuditEntry[] {
  return engineRuns.flatMap(run => {
    const timestamp = getEngineRunTimestamp(run)
    if (!timestamp) return []

    const project = projects.find(entry => entry.id === run.projectId)
    const sif = project?.sifs.find(entry => entry.id === run.sifId)
    const resultSummary = run.resultSummary ?? {}
    const projectName = project?.name
      ?? (typeof resultSummary.projectName === 'string' && resultSummary.projectName.trim().length > 0 ? resultSummary.projectName : strings.actors.unknownProject)
    const sifNumber = sif?.sifNumber
      ?? (typeof resultSummary.sifNumber === 'string' && resultSummary.sifNumber.trim().length > 0 ? resultSummary.sifNumber : undefined)

    const level: AuditLevel = run.status === 'error' || run.warningCount > 0 ? 'warning' : 'info'

    return [{
      id: `engine-run-${run.id}`,
      level,
      kind: 'engine',
      subKind: run.triggerKind,
      timestamp,
      action: formatEngineRunAction(run, strings),
      details: formatEngineRunDetails(run, strings),
      actor: strings.actors.system,
      projectName,
      projectId: run.projectId,
      sifNumber,
      sifId: run.sifId,
      targetView: 'engine',
      linkedViewLabel: strings.linkedViews.engineHistory,
    }]
  })
}

export function buildAuditEntries(projects: Project[], engineRuns: EngineRun[] = [], strings: AuditModelStrings): AuditEntry[] {
  const entries: AuditEntry[] = []

  projects.forEach(project => {
    entries.push({
      id: `project-created-${project.id}`,
      level: 'info',
      kind: 'governance',
      timestamp: project.createdAt,
      action: strings.projectCreated.action,
      details: strings.projectCreated.details(project.name),
      actor: strings.actors.system,
      projectName: project.name,
      projectId: project.id,
      targetView: 'sif',
      linkedViewLabel: strings.linkedViews.project,
    })

    project.sifs.forEach(sif => {
      if (sif.date) {
        entries.push({
          id: `sif-date-${project.id}-${sif.id}-${sif.date}`,
          level: 'info',
          kind: 'governance',
          timestamp: sif.date,
          action: strings.sifDate.action,
          details: strings.sifDate.details,
          actor: sif.madeBy || strings.actors.system,
          projectName: project.name,
          projectId: project.id,
          sifNumber: sif.sifNumber,
          sifId: sif.id,
          actionTab: 'cockpit',
          targetView: 'sif',
          linkedViewLabel: strings.linkedViews.cockpit,
        })
      }

      if (sif.status !== 'draft') {
        entries.push({
          id: `sif-status-${project.id}-${sif.id}-${sif.status}`,
          level: 'info',
          kind: 'governance',
          timestamp: project.updatedAt,
          action: strings.sifStatus.action(sif.status),
          details: strings.sifStatus.details(sif.status),
          actor: sif.verifiedBy || sif.approvedBy || strings.actors.system,
          projectName: project.name,
          projectId: project.id,
          sifNumber: sif.sifNumber,
          sifId: sif.id,
          actionTab: 'cockpit',
          targetView: 'sif',
          linkedViewLabel: strings.linkedViews.cockpit,
        })
      }

      ;(sif.testCampaigns ?? []).forEach(campaign => {
        entries.push({
          id: `campaign-${project.id}-${sif.id}-${campaign.id}`,
          level: campaign.verdict === 'fail' || campaign.verdict === 'conditional' ? 'warning' : 'info',
          kind: 'proof-tests',
          timestamp: campaign.date,
          action: strings.campaign.action(campaign.verdict),
          details: campaign.notes || strings.campaign.defaultDetails,
          actor: campaign.conductedBy || campaign.reviewedBy || strings.actors.system,
          projectName: project.name,
          projectId: project.id,
          sifNumber: sif.sifNumber,
          sifId: sif.id,
          actionTab: 'exploitation',
          targetView: 'sif',
          linkedViewLabel: strings.linkedViews.exploitation,
        })
      })

      ;(sif.operationalEvents ?? []).forEach(event => {
        const warning = event.impact === 'negative' || event.type === 'fault_detected'
        entries.push({
          id: `event-${project.id}-${sif.id}-${event.id}`,
          level: warning ? 'warning' : 'info',
          kind: 'operations',
          timestamp: event.date,
          action: strings.event.action(event.type),
          details: event.description || strings.event.defaultDetails,
          actor: strings.actors.system,
          projectName: project.name,
          projectId: project.id,
          sifNumber: sif.sifNumber,
          sifId: sif.id,
          actionTab: 'exploitation',
          targetView: 'sif',
          linkedViewLabel: strings.linkedViews.exploitation,
        })
      })
    })
  })

  entries.push(...buildEngineRunAuditEntries(projects, engineRuns, strings))

  return entries.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
}
