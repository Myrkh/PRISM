import { useCallback, useState } from 'react'

export interface LibraryCollection {
  name: string
  color: string
}

export const COLLECTION_PRESET_COLORS = [
  '#0284C7', // sky
  '#0F766E', // teal
  '#7C3AED', // violet
  '#EA580C', // orange
  '#16A34A', // green
  '#DC2626', // red
  '#CA8A04', // amber
  '#DB2777', // pink
  '#64748B', // slate
]

const STORAGE_KEY = 'prism_library_collections'

function loadFromStorage(): LibraryCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is LibraryCollection =>
      typeof item?.name === 'string' && typeof item?.color === 'string'
    )
  } catch {
    return []
  }
}

function persist(collections: LibraryCollection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
}

export function useLibraryCollections() {
  const [collections, setCollections] = useState<LibraryCollection[]>(loadFromStorage)

  const createCollection = useCallback((name: string): boolean => {
    const trimmed = name.trim()
    if (!trimmed) return false
    let created = false
    setCollections(prev => {
      if (prev.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return prev
      const color = COLLECTION_PRESET_COLORS[prev.length % COLLECTION_PRESET_COLORS.length]
      const next = [...prev, { name: trimmed, color }]
      persist(next)
      created = true
      return next
    })
    return created
  }, [])

  const renameCollection = useCallback((oldName: string, newName: string): void => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return
    setCollections(prev => {
      if (prev.some(c => c.name.toLowerCase() === trimmed.toLowerCase() && c.name !== oldName)) return prev
      const next = prev.map(c => c.name === oldName ? { ...c, name: trimmed } : c)
      persist(next)
      return next
    })
  }, [])

  const deleteCollection = useCallback((name: string): void => {
    setCollections(prev => {
      const next = prev.filter(c => c.name !== name)
      persist(next)
      return next
    })
  }, [])

  const setCollectionColor = useCallback((name: string, color: string): void => {
    setCollections(prev => {
      const next = prev.map(c => c.name === name ? { ...c, color } : c)
      persist(next)
      return next
    })
  }, [])

  return { collections, createCollection, renameCollection, deleteCollection, setCollectionColor }
}
