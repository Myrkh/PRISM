import { nanoid } from 'nanoid'
import type {
  SIFAssumption,
  SIFAssumptionCategory,
  SIFAssumptionStatus,
  SIFReferenceTab,
} from '@/core/types'

const STORAGE_PREFIX = 'prism-sif-assumptions:'

type AssumptionTemplate = Omit<SIFAssumption, 'id' | 'owner' | 'reviewDate'>

const ASSUMPTION_TEMPLATES: readonly AssumptionTemplate[] = [
  {
    title: 'Low demand mode applicability',
    statement: 'The documented process demand remains compatible with low demand SIL verification.',
    rationale: '',
    status: 'review',
    category: 'process',
    linkedTab: 'overview',
  },
  {
    title: 'Proof test effectiveness',
    statement: 'The proof test strategy is assumed achievable and sufficiently effective in operation.',
    rationale: '',
    status: 'review',
    category: 'proof',
    linkedTab: 'prooftest',
  },
  {
    title: 'CCF and independence treatment',
    statement: 'Redundant channels only claim independence where beta and common-cause assumptions are justified.',
    rationale: '',
    status: 'review',
    category: 'architecture',
    linkedTab: 'architecture',
  },
  {
    title: 'Failure data provenance',
    statement: 'Failure rates and diagnostic assumptions are backed by traceable sources.',
    rationale: '',
    status: 'review',
    category: 'data',
    linkedTab: 'architecture',
  },
]

function isStatus(value: unknown): value is SIFAssumptionStatus {
  return value === 'draft' || value === 'review' || value === 'validated'
}

function isCategory(value: unknown): value is SIFAssumptionCategory {
  return value === 'process'
    || value === 'proof'
    || value === 'architecture'
    || value === 'data'
    || value === 'governance'
    || value === 'other'
}

function isReferenceTab(value: unknown): value is SIFReferenceTab {
  return value === 'overview'
    || value === 'architecture'
    || value === 'analysis'
    || value === 'compliance'
    || value === 'prooftest'
    || value === 'report'
}

function normalizeAssumption(value: unknown, fallback?: Partial<SIFAssumption>): SIFAssumption {
  const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}

  return {
    id: typeof source.id === 'string' && source.id ? source.id : fallback?.id ?? nanoid(),
    title: typeof source.title === 'string' && source.title
      ? source.title
      : fallback?.title ?? 'Untitled assumption',
    statement: typeof source.statement === 'string'
      ? source.statement
      : fallback?.statement ?? '',
    rationale: typeof source.rationale === 'string'
      ? source.rationale
      : fallback?.rationale ?? '',
    status: isStatus(source.status) ? source.status : fallback?.status ?? 'review',
    owner: typeof source.owner === 'string'
      ? source.owner
      : fallback?.owner ?? '',
    reviewDate: typeof source.reviewDate === 'string'
      ? source.reviewDate
      : fallback?.reviewDate ?? '',
    category: isCategory(source.category) ? source.category : fallback?.category ?? 'other',
    linkedTab: isReferenceTab(source.linkedTab) ? source.linkedTab : fallback?.linkedTab ?? 'compliance',
  }
}

export function defaultSIFAssumptions(): SIFAssumption[] {
  return ASSUMPTION_TEMPLATES.map(template => normalizeAssumption(template))
}

export function normalizeSIFAssumptions(value: unknown): SIFAssumption[] {
  if (!Array.isArray(value)) return []
  return value.map(item => normalizeAssumption(item))
}

export function loadLocalSIFAssumptions(sifId: string): SIFAssumption[] | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${sifId}`)
    if (!raw) return null
    return normalizeSIFAssumptions(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveLocalSIFAssumptions(sifId: string, assumptions: SIFAssumption[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    `${STORAGE_PREFIX}${sifId}`,
    JSON.stringify(normalizeSIFAssumptions(assumptions)),
  )
}

export function clearLocalSIFAssumptions(sifId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(`${STORAGE_PREFIX}${sifId}`)
}

export function hydrateSIFAssumptions(sifId: string, value: unknown): SIFAssumption[] {
  if (Array.isArray(value)) return normalizeSIFAssumptions(value)

  const local = loadLocalSIFAssumptions(sifId)
  if (local) return local

  return defaultSIFAssumptions()
}

export function assumptionsToReportText(assumptions: SIFAssumption[]): string {
  if (!assumptions.length) {
    return 'No explicit SIF assumptions have been documented.'
  }

  return assumptions
    .map(assumption => {
      const suffix = assumption.rationale ? ` Rationale: ${assumption.rationale}` : ''
      return `- ${assumption.title} [${assumption.status.toUpperCase()}]: ${assumption.statement}${suffix}`
    })
    .join('\n')
}
