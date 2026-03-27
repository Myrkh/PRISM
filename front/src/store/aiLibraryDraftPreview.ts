import type {
  AILibraryDraftPreview,
  AILibraryDraftPreviewInput,
  AILibraryDraftResult,
} from './types'

const AI_LIBRARY_DRAFT_RESULTS_STORAGE_KEY = 'prism_ai_library_draft_results'

export function loadAILibraryDraftResults(): Record<string, AILibraryDraftResult> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(AI_LIBRARY_DRAFT_RESULTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, Partial<AILibraryDraftResult>>
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => (
        typeof value?.messageId === 'string'
        && typeof value?.templateId === 'string'
        && (value?.origin === 'project' || value?.origin === 'user')
      )),
    ) as Record<string, AILibraryDraftResult>
  } catch {
    return {}
  }
}

export function saveAILibraryDraftResults(results: Record<string, AILibraryDraftResult>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AI_LIBRARY_DRAFT_RESULTS_STORAGE_KEY, JSON.stringify(results))
}

export function buildAILibraryDraftPreview(input: AILibraryDraftPreviewInput): AILibraryDraftPreview {
  return {
    messageId: input.messageId,
    command: input.command,
    targetScope: input.targetScope,
    targetProjectId: input.targetProjectId,
    targetProjectName: input.targetProjectName,
    summary: input.summary,
    assumptions: [...input.assumptions],
    missingData: [...input.missingData],
    uncertainData: [...input.uncertainData],
    conflicts: [...input.conflicts],
    fieldStatus: { ...input.fieldStatus },
    libraryFile: JSON.parse(JSON.stringify(input.libraryFile)) as AILibraryDraftPreview['libraryFile'],
    templateInput: JSON.parse(JSON.stringify(input.templateInput)) as AILibraryDraftPreview['templateInput'],
  }
}
