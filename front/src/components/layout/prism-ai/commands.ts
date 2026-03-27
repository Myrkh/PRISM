import type { Project } from '@/core/types'
import type {
  AIProposalCommand,
  ParsedProjectScopedCommand,
  ProjectResolutionResult,
} from './types'
import { parseProjectDraftProposalResponse } from './projectDraftProposal'
import { parseSifDraftProposalResponse } from './sifDraftProposal'
import { parseLibraryDraftProposalResponse } from './libraryDraftProposal'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export function parseProjectScopedCommand(query: string): ParsedProjectScopedCommand | null {
  const trimmed = query.trim()
  const match = trimmed.match(/^(create_project|create_sif|draft_sif|create_library)\b/i)
  if (!match) return null

  const kind = match[1].toLowerCase() as AIProposalCommand
  let rest = trimmed.slice(match[0].length).trim()
  let projectQuery: string | null = null

  if (kind !== 'create_project') {
    const projectMatch = /(?:^|\s)project:(?:"([^"]+)"|'([^']+)'|([^\s]+))/i.exec(rest)
    if (projectMatch) {
      projectQuery = (projectMatch[1] ?? projectMatch[2] ?? projectMatch[3] ?? '').trim() || null
      const fullMatch = projectMatch[0]
      const segmentOffset = fullMatch.startsWith(' ') ? 1 : 0
      const segmentStart = (projectMatch.index ?? 0) + segmentOffset
      const segmentLength = fullMatch.length - segmentOffset
      rest = `${rest.slice(0, segmentStart)} ${rest.slice(segmentStart + segmentLength)}`.replace(/\s+/g, ' ').trim()
    }
  }

  return {
    kind,
    projectQuery,
    prompt: rest,
  }
}

export function buildProjectCommandSeed(kind: AIProposalCommand, project?: Project | null): string {
  if (kind === 'create_project') return '>create_project '

  const preferredToken = project?.ref?.trim() || project?.name?.trim() || ''
  if (!preferredToken) return kind === 'create_library' ? '>create_library ' : `>${kind} project:`
  const projectToken = /\s/.test(preferredToken) ? `"${preferredToken}"` : preferredToken
  return kind === 'create_library'
    ? `>create_library project:${projectToken} `
    : `>${kind} project:${projectToken} `
}

export function resolveProjectCandidate(projects: Project[], projectQuery: string | null): ProjectResolutionResult {
  const query = projectQuery?.trim() ?? ''
  if (!query) return { status: 'missing' }

  const normalizedQuery = normalize(query)
  const exactRef = projects.filter(project => normalize(project.ref || '') === normalizedQuery)
  if (exactRef.length === 1) return { status: 'ok', project: exactRef[0] }
  if (exactRef.length > 1) return { status: 'ambiguous', query, matches: exactRef }

  const exactName = projects.filter(project => normalize(project.name) === normalizedQuery)
  if (exactName.length === 1) return { status: 'ok', project: exactName[0] }
  if (exactName.length > 1) return { status: 'ambiguous', query, matches: exactName }

  const fuzzy = projects.filter(project => {
    const ref = normalize(project.ref || '')
    const name = normalize(project.name)
    return ref.includes(normalizedQuery) || name.includes(normalizedQuery)
  })

  if (fuzzy.length === 1) return { status: 'ok', project: fuzzy[0] }
  if (fuzzy.length > 1) return { status: 'ambiguous', query, matches: fuzzy.slice(0, 5) }
  return { status: 'not_found', query }
}

export const parseSifDraftProposal = parseSifDraftProposalResponse
export const parseProjectDraftProposal = parseProjectDraftProposalResponse
export const parseLibraryDraftProposal = parseLibraryDraftProposalResponse
