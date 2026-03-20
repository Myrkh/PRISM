import type { EngineRun, Project } from '@/core/types'
import type { SIFTab } from '@/store/types'

export type AuditLevel = 'info' | 'warning'
export type AuditKind = 'governance' | 'proof-tests' | 'operations' | 'engine'
export type AuditScope = 'all' | 'warnings' | AuditKind
export type AuditTargetView = 'sif' | 'engine'

export interface AuditEntry {
  id: string
  level: AuditLevel
  kind: AuditKind
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

export const AUDIT_SCOPE_META: Record<AuditScope, { label: string; hint: string; tone: string }> = {
  all: {
    label: 'Tous les événements',
    hint: 'Vue complète du journal de traçabilité',
    tone: '#0F9CA6',
  },
  warnings: {
    label: 'Warnings',
    hint: 'Evénements qui demandent une lecture prioritaire',
    tone: '#D97706',
  },
  governance: {
    label: 'Gouvernance',
    hint: 'Création, mise à jour et statut des dossiers',
    tone: '#2563EB',
  },
  'proof-tests': {
    label: 'Proof tests',
    hint: 'Campagnes et verdicts d’exploitation',
    tone: '#0E9F6E',
  },
  operations: {
    label: 'Opérations',
    hint: 'Incidents et événements observés sur le terrain',
    tone: '#7C3AED',
  },
  engine: {
    label: 'Engine runs',
    hint: 'Runs backend et compare TS / Python',
    tone: '#0F766E',
  },
}

export const AUDIT_KIND_LABELS: Record<AuditKind, string> = {
  governance: 'Gouvernance',
  'proof-tests': 'Proof test',
  operations: 'Opérations',
  engine: 'Engine',
}

export function formatAuditWhen(ts: string): string {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return ts
  return date.toLocaleString()
}

export function matchesAuditScope(entry: AuditEntry, scope: AuditScope): boolean {
  if (scope === 'all') return true
  if (scope === 'warnings') return entry.level === 'warning'
  return entry.kind === scope
}

function getEngineRunTimestamp(run: EngineRun): string | null {
  return run.finishedAt ?? run.startedAt ?? run.createdAt ?? run.updatedAt ?? null
}

function formatEngineRunAction(run: EngineRun): string {
  if (run.triggerKind === 'compare') {
    if (run.status === 'error') return 'Compare TS / Python échoué'
    if (run.status === 'done') return 'Compare TS / Python terminé'
    return 'Compare TS / Python lancé'
  }

  if (run.triggerKind === 'batch') {
    if (run.status === 'error') return 'Batch run backend échoué'
    if (run.status === 'done') return 'Batch run backend terminé'
    return 'Batch run backend lancé'
  }

  if (run.status === 'error') return 'Run backend échoué'
  if (run.status === 'done') return 'Run backend terminé'
  return 'Run backend lancé'
}

function formatEngineRunDetails(run: EngineRun): string {
  if (run.status === 'error') {
    return run.errorMessage || 'Le backend a renvoyé une erreur pendant le calcul.'
  }

  const resultSummary = run.resultSummary ?? {}
  const details: string[] = []

  if (run.requestedMode) details.push(`Mode ${run.requestedMode}`)
  if (typeof resultSummary.silAchieved === 'number') details.push(`SIL ${resultSummary.silAchieved}`)
  if (typeof run.warningCount === 'number' && run.warningCount > 0) details.push(`${run.warningCount} warning${run.warningCount > 1 ? 's' : ''}`)
  if (typeof run.runtimeMs === 'number' && Number.isFinite(run.runtimeMs)) details.push(`${run.runtimeMs.toFixed(1)} ms`)
  if (run.backendVersion) details.push(`v${run.backendVersion}`)

  return details.join(' · ') || 'Run backend enregistré.'
}

function buildEngineRunAuditEntries(projects: Project[], engineRuns: EngineRun[]): AuditEntry[] {
  return engineRuns.flatMap(run => {
    const timestamp = getEngineRunTimestamp(run)
    if (!timestamp) return []

    const project = projects.find(entry => entry.id === run.projectId)
    const sif = project?.sifs.find(entry => entry.id === run.sifId)
    const resultSummary = run.resultSummary ?? {}
    const projectName = project?.name
      ?? (typeof resultSummary.projectName === 'string' && resultSummary.projectName.trim().length > 0 ? resultSummary.projectName : 'Projet inconnu')
    const sifNumber = sif?.sifNumber
      ?? (typeof resultSummary.sifNumber === 'string' && resultSummary.sifNumber.trim().length > 0 ? resultSummary.sifNumber : undefined)

    const level: AuditLevel = run.status === 'error' || run.warningCount > 0 ? 'warning' : 'info'

    return [{
      id: `engine-run-${run.id}`,
      level,
      kind: 'engine',
      timestamp,
      action: formatEngineRunAction(run),
      details: formatEngineRunDetails(run),
      actor: 'System',
      projectName,
      projectId: run.projectId,
      sifNumber,
      sifId: run.sifId,
      targetView: 'engine',
      linkedViewLabel: 'Engine · Historique',
    }]
  })
}

export function buildAuditEntries(projects: Project[], engineRuns: EngineRun[] = []): AuditEntry[] {
  const entries: AuditEntry[] = []

  projects.forEach(project => {
    entries.push({
      id: `project-created-${project.id}`,
      level: 'info',
      kind: 'governance',
      timestamp: project.createdAt,
      action: 'Projet créé',
      details: `Le projet "${project.name}" a été initialisé.`,
      actor: 'System',
      projectName: project.name,
      projectId: project.id,
      targetView: 'sif',
      linkedViewLabel: 'Projet / dossier',
    })

    if (project.updatedAt && project.updatedAt !== project.createdAt) {
      entries.push({
        id: `project-updated-${project.id}-${project.updatedAt}`,
        level: 'info',
        kind: 'governance',
        timestamp: project.updatedAt,
        action: 'Projet mis à jour',
        details: `Les métadonnées du projet "${project.name}" ont été modifiées.`,
        actor: 'System',
        projectName: project.name,
        projectId: project.id,
        targetView: 'sif',
        linkedViewLabel: 'Projet / dossier',
      })
    }

    project.sifs.forEach(sif => {
      if (sif.date) {
        entries.push({
          id: `sif-date-${project.id}-${sif.id}-${sif.date}`,
          level: 'info',
          kind: 'governance',
          timestamp: sif.date,
          action: 'Enregistrement SIF mis à jour',
          details: 'La date du dossier SIF a été confirmée ou ajustée.',
          actor: sif.madeBy || 'System',
          projectName: project.name,
          projectId: project.id,
          sifNumber: sif.sifNumber,
          sifId: sif.id,
          actionTab: 'cockpit',
          targetView: 'sif',
          linkedViewLabel: 'Cockpit',
        })
      }

      if (sif.status !== 'draft') {
        entries.push({
          id: `sif-status-${project.id}-${sif.id}-${sif.status}`,
          level: 'info',
          kind: 'governance',
          timestamp: project.updatedAt,
          action: `Statut SIF: ${sif.status}`,
          details: `Transition du dossier vers ${sif.status}.`,
          actor: sif.verifiedBy || sif.approvedBy || 'System',
          projectName: project.name,
          projectId: project.id,
          sifNumber: sif.sifNumber,
          sifId: sif.id,
          actionTab: 'cockpit',
          targetView: 'sif',
          linkedViewLabel: 'Cockpit',
        })
      }

      ;(sif.testCampaigns ?? []).forEach(campaign => {
        entries.push({
          id: `campaign-${project.id}-${sif.id}-${campaign.id}`,
          level: campaign.verdict === 'fail' || campaign.verdict === 'conditional' ? 'warning' : 'info',
          kind: 'proof-tests',
          timestamp: campaign.date,
          action: `Campagne de proof test (${campaign.verdict})`,
          details: campaign.notes || 'Campagne enregistrée.',
          actor: campaign.conductedBy || campaign.reviewedBy || 'System',
          projectName: project.name,
          projectId: project.id,
          sifNumber: sif.sifNumber,
          sifId: sif.id,
          actionTab: 'exploitation',
          targetView: 'sif',
          linkedViewLabel: 'Exploitation',
        })
      })

      ;(sif.operationalEvents ?? []).forEach(event => {
        const warning = event.impact === 'negative' || event.type === 'fault_detected'
        entries.push({
          id: `event-${project.id}-${sif.id}-${event.id}`,
          level: warning ? 'warning' : 'info',
          kind: 'operations',
          timestamp: event.date,
          action: `Evénement terrain: ${event.type}`,
          details: event.description || 'Evénement opérationnel enregistré.',
          actor: 'System',
          projectName: project.name,
          projectId: project.id,
          sifNumber: sif.sifNumber,
          sifId: sif.id,
          actionTab: 'exploitation',
          targetView: 'sif',
          linkedViewLabel: 'Exploitation',
        })
      })
    })
  })

  entries.push(...buildEngineRunAuditEntries(projects, engineRuns))

  return entries.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
}
