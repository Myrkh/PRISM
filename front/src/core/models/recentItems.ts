import type { AppView } from '@/store/types'

export type RecentItemKind = 'sif' | 'project' | 'note' | 'workspace-file' | 'view'

export interface RecentItem {
  /** Unique stable key: sifId, projectId, nodeId, or view type string */
  id: string
  kind: RecentItemKind
  label: string
  subtitle?: string
  /** ISO timestamp */
  timestamp: number
  /** Navigation target */
  view: AppView
}

export const MAX_RECENT_ITEMS = 12

/**
 * Prepend a new item, deduplicating by (id + kind), capped at MAX_RECENT_ITEMS.
 * Pure function — returns new array.
 */
export function pushRecentItem(
  items: RecentItem[],
  next: Omit<RecentItem, 'timestamp'>,
): RecentItem[] {
  const withTs: RecentItem = { ...next, timestamp: Date.now() }
  const deduped = items.filter(i => !(i.id === next.id && i.kind === next.kind))
  return [withTs, ...deduped].slice(0, MAX_RECENT_ITEMS)
}
