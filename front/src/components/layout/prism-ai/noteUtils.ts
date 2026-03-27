import { detectMode } from '../command-palette/modes'
import { parseProjectScopedCommand } from './commands'
import type { ChatInputMenuItem } from './types'

const ASSISTANT_NOTE_END_MARKERS = [
  /^(?:#+\s*)?(?:🔧\s*)?fonctionnalit(?:e|é)s\s+test(?:e|é)es\b/i,
  /^(?:#+\s*)?(?:tested\s+features|testing\s+notes)\b/i,
  /^(?:#+\s*)?(?:✅\s*)?(?:note\s+g[ée]n[ée]r[ée]e?|generated\s+note)\b/i,
  /^(?:#+\s*)?(?:📎\s*)?(?:besoin\s+d['’]un\s+exemple|need\s+an\s+example)\b/i,
  /^(?:vous\s+pouvez|tu\s+peux|feel\s+free|you\s+can|copiez|copy\s+this|copy\s+the|verify\s+the\s+rendering|v(?:e|é)rifiez\s+le\s+rendu|voil(?:a|à))\b/i,
]

const ASSISTANT_NOTE_INTRO_MARKERS = [
  /^(?:voici|ci-dessous|below|here(?:'s| is))\b/i,
]

export function extractAssistantNoteMarkdown(markdown: string): string {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return ''

  const fullFencedBlockMatch = normalized.match(/^```(?:markdown|md)?\n([\s\S]*?)```$/i)
  if (fullFencedBlockMatch?.[1]?.trim()) return fullFencedBlockMatch[1].trim()

  const lines = normalized.split('\n')
  const firstContentIndex = lines.findIndex(line => line.trim().length > 0)
  let startIndex = Math.max(firstContentIndex, 0)

  if (firstContentIndex >= 0) {
    const firstContentLine = lines[firstContentIndex].trim()
    if (ASSISTANT_NOTE_INTRO_MARKERS.some(pattern => pattern.test(firstContentLine))) {
      let candidateIndex = -1
      for (let i = firstContentIndex + 1; i < lines.length; i += 1) {
        if (lines[i].trim() === '') continue
        candidateIndex = i
        break
      }
      if (candidateIndex >= 0) startIndex = candidateIndex
    }
  }

  let endIndex = lines.length
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    if (ASSISTANT_NOTE_END_MARKERS.some(pattern => pattern.test(trimmed))) {
      endIndex = i
      break
    }
  }

  const extracted = lines.slice(startIndex, endIndex).join('\n').trim()
  return extracted || normalized
}

export function deriveAssistantNoteName(markdown: string): string {
  const noteMarkdown = extractAssistantNoteMarkdown(markdown)
  const firstMeaningfulLine = noteMarkdown
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0)

  const cleaned = (firstMeaningfulLine ?? '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const base = cleaned || 'Note'
  const truncated = base.length > 56 ? `${base.slice(0, 55).trim()}...` : base
  return `PRISM AI - ${truncated}`
}

export const COMMAND_BADGE_COLOR = '#60A5FA'
export const ATTACH_BADGE_COLOR = '#4ADE80'
export const DOCUMENT_BADGE_COLOR = '#F59E0B'

export function isDraftNoteCommandQuery(query: string): boolean {
  return /^draft_note(?:\s|$)/i.test(query.trim())
}

export function extractDraftNotePrompt(query: string): string {
  return query.replace(/^draft_note\b/i, '').trim()
}

export function normalizeOutgoingUserContent(content: string): string {
  const { mode, query } = detectMode(content.trim())
  if (mode !== 'commands') return content
  if (isDraftNoteCommandQuery(query)) {
    const prompt = extractDraftNotePrompt(query)
    return prompt || content
  }
  const projectCommand = parseProjectScopedCommand(query)
  if (projectCommand) return projectCommand.prompt || content
  return content
}

export function resolveCommandTokenLabel(query: string): string | null {
  const trimmed = query.trim()
  if (!trimmed) return null
  if (/^strict\s+off(?:\s|$)/i.test(trimmed)) return 'strict off'
  if (/^strict(?:\s|$)/i.test(trimmed)) return 'strict'
  if (isDraftNoteCommandQuery(trimmed)) return 'draft_note'
  const projectCommand = parseProjectScopedCommand(trimmed)
  if (projectCommand) return projectCommand.kind
  const [token] = trimmed.split(/\s+/, 1)
  return token?.trim() || null
}

export function resolveCommandTokenBadge(query: string, items: ChatInputMenuItem[]): { label: string; color: string } | null {
  const trimmed = query.trim()
  if (!trimmed) return null
  const tokenLabel = resolveCommandTokenLabel(trimmed)
  if (tokenLabel === 'strict off' || tokenLabel === 'strict') return { label: tokenLabel, color: COMMAND_BADGE_COLOR }
  if (tokenLabel === 'draft_note') return { label: tokenLabel, color: DOCUMENT_BADGE_COLOR }
  if (tokenLabel === 'create_sif' || tokenLabel === 'draft_sif') return { label: tokenLabel, color: COMMAND_BADGE_COLOR }

  const lowered = trimmed.toLowerCase()
  const matchedItem = items.find(item => item.label.toLowerCase().startsWith(lowered)) ?? items[0]
  return matchedItem ? { label: matchedItem.label, color: matchedItem.badgeColor } : null
}

export function resolveMessageModeBadge(content: string): { badge: string; color: string; tokenLabel?: string } | null {
  const { mode, query, config } = detectMode(content.trim())
  if (!config) return null

  const tokenLabel = mode === 'commands' ? resolveCommandTokenLabel(query) : null
  return {
    badge: config.badge,
    color: config.badgeColor,
    ...(tokenLabel ? { tokenLabel } : {}),
  }
}
