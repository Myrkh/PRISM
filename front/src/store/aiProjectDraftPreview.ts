import type {
  AIProjectDraftPreview,
  AIProjectDraftPreviewInput,
  AIProjectDraftResult,
} from './types'

const AI_PROJECT_DRAFT_RESULTS_STORAGE_KEY = 'prism_ai_project_draft_results'

export function loadAIProjectDraftResults(): Record<string, AIProjectDraftResult> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(AI_PROJECT_DRAFT_RESULTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<AIProjectDraftResult>>
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => (
        typeof value?.messageId === 'string'
        && typeof value?.projectId === 'string'
        && (typeof value?.firstSifId === 'string' || value?.firstSifId === null)
      )),
    ) as Record<string, AIProjectDraftResult>
  } catch {
    return {}
  }
}

export function saveAIProjectDraftResults(results: Record<string, AIProjectDraftResult>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AI_PROJECT_DRAFT_RESULTS_STORAGE_KEY, JSON.stringify(results))
}

export function buildAIProjectDraftPreview(input: AIProjectDraftPreviewInput): AIProjectDraftPreview {
  return {
    messageId: input.messageId,
    command: input.command,
    summary: input.summary,
    assumptions: [...input.assumptions],
    missingData: [...input.missingData],
    uncertainData: [...input.uncertainData],
    conflicts: [...input.conflicts],
    prismFile: JSON.parse(JSON.stringify(input.prismFile)) as AIProjectDraftPreview['prismFile'],
  }
}
