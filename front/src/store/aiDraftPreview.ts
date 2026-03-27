import { DEFAULT_SIF, DEFAULT_SUBSYSTEM } from '@/core/models/defaults'
import type { Project, SIF } from '@/core/types'
import type { AISIFDraftPreview, AISIFDraftPreviewInput, AISIFDraftResult, AISIFDraftSeed } from './types'

const AI_DRAFT_RESULTS_STORAGE_KEY = 'prism_ai_sif_draft_results'
export const AI_DRAFT_SIF_ID_PREFIX = 'ai-draft-sif:'

export function isAISIFDraftSIFId(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith(AI_DRAFT_SIF_ID_PREFIX)
}

export function loadAISIFDraftResults(): Record<string, AISIFDraftResult> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(AI_DRAFT_RESULTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<AISIFDraftResult>>
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => (
        typeof value?.messageId === 'string'
        && typeof value?.projectId === 'string'
        && typeof value?.sifId === 'string'
      )),
    ) as Record<string, AISIFDraftResult>
  } catch {
    return {}
  }
}

export function saveAISIFDraftResults(results: Record<string, AISIFDraftResult>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AI_DRAFT_RESULTS_STORAGE_KEY, JSON.stringify(results))
}

export function cloneAISIFDraftSeed(seed: AISIFDraftSeed): AISIFDraftSeed {
  return {
    ...seed,
    subsystemArchitecture: seed.subsystemArchitecture
      ? { ...seed.subsystemArchitecture }
      : undefined,
  }
}

export function buildAISIFDraftPreview(input: AISIFDraftPreviewInput, sifId: string, projectName: string): AISIFDraftPreview {
  return {
    messageId: input.messageId,
    command: input.command,
    projectId: input.projectId,
    projectName,
    sifId,
    summary: input.summary,
    assumptions: [...input.assumptions],
    missingData: [...input.missingData],
    uncertainData: [...input.uncertainData],
    conflicts: [...input.conflicts],
    fieldStatus: { ...input.fieldStatus },
    draft: cloneAISIFDraftSeed(input.draft),
  }
}

function resolveFallbackSIFNumber(project: Project): string {
  const used = new Set(project.sifs.map(sif => sif.sifNumber.trim().toLowerCase()).filter(Boolean))
  let index = project.sifs.filter(sif => !isAISIFDraftSIFId(sif.id)).length + 1
  let candidate = `SIF-${String(index).padStart(3, '0')}`
  while (used.has(candidate.toLowerCase())) {
    index += 1
    candidate = `SIF-${String(index).padStart(3, '0')}`
  }
  return candidate
}

export function buildAISIFDraftSIF(project: Project, input: AISIFDraftPreviewInput, existingSifId?: string): SIF {
  const preferredSIFNumber = input.draft.sifNumber?.trim()
  const sifNumber = preferredSIFNumber || resolveFallbackSIFNumber(project)
  const next = DEFAULT_SIF(project.id, sifNumber)
  const globalArchitecture = input.draft.initArchitecture
  const subsystemArchitecture = input.draft.subsystemArchitecture

  next.id = existingSifId ?? `${AI_DRAFT_SIF_ID_PREFIX}${crypto.randomUUID()}`
  next.demandRate = 0
  next.targetSIL = 0
  next.rrfRequired = 0
  next.date = ''

  if (subsystemArchitecture || globalArchitecture) {
    next.subsystems = [
      DEFAULT_SUBSYSTEM('sensor', sifNumber, subsystemArchitecture?.sensor ?? globalArchitecture ?? '1oo1'),
      DEFAULT_SUBSYSTEM('logic', sifNumber, subsystemArchitecture?.logic ?? globalArchitecture ?? '1oo1'),
      DEFAULT_SUBSYSTEM('actuator', sifNumber, subsystemArchitecture?.actuator ?? globalArchitecture ?? '1oo1'),
    ]
  }

  next.sifNumber = sifNumber
  next.title = input.draft.title?.trim() || next.title
  next.description = input.draft.description?.trim() || ''
  next.pid = input.draft.pid?.trim() || ''
  next.location = input.draft.location?.trim() || ''
  next.processTag = input.draft.processTag?.trim() || ''
  next.hazardousEvent = input.draft.hazardousEvent?.trim() || ''
  if (typeof input.draft.demandRate === 'number') next.demandRate = input.draft.demandRate
  if (typeof input.draft.targetSIL === 'number') next.targetSIL = input.draft.targetSIL
  if (typeof input.draft.rrfRequired === 'number') next.rrfRequired = input.draft.rrfRequired
  next.madeBy = input.draft.madeBy?.trim() || ''
  next.verifiedBy = input.draft.verifiedBy?.trim() || ''
  next.approvedBy = input.draft.approvedBy?.trim() || ''
  if (input.draft.date?.trim()) next.date = input.draft.date.trim()
  if (input.draft.status) next.status = input.draft.status
  if (typeof input.draft.processSafetyTime === 'number') next.processSafetyTime = input.draft.processSafetyTime
  else delete next.processSafetyTime
  if (typeof input.draft.sifResponseTime === 'number') next.sifResponseTime = input.draft.sifResponseTime
  else delete next.sifResponseTime
  if (input.draft.safeState?.trim()) next.safeState = input.draft.safeState.trim()
  else delete next.safeState

  return next
}

export function removeAISIFDraftPreviewFromProjects(
  projects: Project[],
  preview: Pick<AISIFDraftPreview, 'projectId' | 'sifId'> | null,
): void {
  if (!preview) return

  const project = projects.find(entry => entry.id === preview.projectId)
  if (!project) return

  const nextSIFs = project.sifs.filter(sif => sif.id !== preview.sifId)
  if (nextSIFs.length === project.sifs.length) return

  project.sifs = nextSIFs
  project.updatedAt = new Date().toISOString()
}
