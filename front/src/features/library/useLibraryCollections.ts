import { useCallback, useEffect, useMemo } from 'react'
import type { ComponentTemplate, ComponentTemplateUpsertInput } from '@/core/types'
import { useAppStore } from '@/store/appStore'
import {
  dbCreateLibraryCollection,
  dbDeleteLibraryCollection,
  dbUpdateLibraryCollection,
  type LibraryCollectionRecord,
} from '@/lib/libraryCollections'
import {
  buildRetargetInputsForLibraryCollection,
  getTemplatesForLibraryCollection,
} from './libraryCollectionSync'
import { useLibraryCollectionsStore } from './libraryCollectionsStore'

export type LibraryCollection = LibraryCollectionRecord

export const COLLECTION_PRESET_COLORS = [
  '#0284C7',
  '#0F766E',
  '#7C3AED',
  '#EA580C',
  '#16A34A',
  '#DC2626',
  '#CA8A04',
  '#DB2777',
  '#64748B',
] as const

interface UseLibraryCollectionsOptions {
  templates: ComponentTemplate[]
  importTemplates: (inputs: ComponentTemplateUpsertInput[]) => Promise<ComponentTemplate[]>
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function sortCollections(collections: LibraryCollection[]): LibraryCollection[] {
  return [...collections].sort((left, right) => {
    if (left.position !== right.position) return left.position - right.position
    return left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })
  })
}

export function useLibraryCollections({ templates, importTemplates }: UseLibraryCollectionsOptions) {
  const profileId = useAppStore(state => state.profile?.id ?? state.authUser?.id ?? null)
  const collections = useLibraryCollectionsStore(state => state.collections)
  const loading = useLibraryCollectionsStore(state => state.loading)
  const error = useLibraryCollectionsStore(state => state.error)
  const hydratedOwnerId = useLibraryCollectionsStore(state => state.hydratedOwnerId)
  const fetchCollections = useLibraryCollectionsStore(state => state.fetchCollections)
  const setCollections = useLibraryCollectionsStore(state => state.setCollections)
  const resetCollections = useLibraryCollectionsStore(state => state.reset)

  useEffect(() => {
    if (!profileId) {
      resetCollections()
      return
    }
    if (hydratedOwnerId === profileId && collections.length >= 0) return
    void fetchCollections(profileId)
  }, [collections.length, fetchCollections, hydratedOwnerId, profileId, resetCollections])

  const scopedCollections = useMemo(() => sortCollections(collections), [collections])

  const createCollection = useCallback(async (
    name: string,
    options?: { scope?: 'user' | 'project'; projectId?: string | null; color?: string },
  ): Promise<LibraryCollection | null> => {
    const trimmed = name.trim()
    if (!trimmed || !profileId) return null

    if (collections.some(collection => normalizeName(collection.name) == normalizeName(trimmed))) {
      return collections.find(collection => normalizeName(collection.name) == normalizeName(trimmed)) ?? null
    }

    const next = await dbCreateLibraryCollection({
      ownerProfileId: profileId,
      scope: options?.scope === 'project' ? 'project' : 'user',
      projectId: options?.scope === 'project' ? options?.projectId ?? null : null,
      name: trimmed,
      color: options?.color ?? COLLECTION_PRESET_COLORS[collections.length % COLLECTION_PRESET_COLORS.length],
      position: collections.length,
    })

    const nextCollections = sortCollections([...collections, next])
    setCollections(profileId, nextCollections)
    return next
  }, [collections, profileId, setCollections])

  const renameCollection = useCallback(async (collectionId: string, newName: string): Promise<LibraryCollection | null> => {
    const trimmed = newName.trim()
    const current = collections.find(collection => collection.id === collectionId)
    if (!current || !profileId || !trimmed || trimmed === current.name) return current ?? null

    const duplicate = collections.find(collection => collection.id !== collectionId && normalizeName(collection.name) == normalizeName(trimmed))
    if (duplicate) throw new Error('Une collection portant ce nom existe déjà.')

    const templateUpdates = buildRetargetInputsForLibraryCollection(templates, current, trimmed)
    if (templateUpdates.length > 0) {
      await importTemplates(templateUpdates)
    }

    const updated = await dbUpdateLibraryCollection(collectionId, { name: trimmed })
    const nextCollections = sortCollections(collections.map(collection => collection.id === collectionId ? updated : collection))
    setCollections(profileId, nextCollections)
    return updated
  }, [collections, importTemplates, profileId, setCollections, templates])

  const deleteCollection = useCallback(async (collectionId: string): Promise<void> => {
    const current = collections.find(collection => collection.id === collectionId)
    if (!current || !profileId) return

    const templateUpdates = buildRetargetInputsForLibraryCollection(templates, current, null)
    if (templateUpdates.length > 0) {
      await importTemplates(templateUpdates)
    }

    await dbDeleteLibraryCollection(collectionId)
    const nextCollections = collections.filter(collection => collection.id !== collectionId)
    setCollections(profileId, sortCollections(nextCollections))
  }, [collections, importTemplates, profileId, setCollections, templates])

  const setCollectionColor = useCallback(async (collectionId: string, color: string): Promise<LibraryCollection | null> => {
    const current = collections.find(collection => collection.id === collectionId)
    if (!current || !profileId || current.color === color) return current ?? null

    const updated = await dbUpdateLibraryCollection(collectionId, { color })
    const nextCollections = sortCollections(collections.map(collection => collection.id === collectionId ? updated : collection))
    setCollections(profileId, nextCollections)
    return updated
  }, [collections, profileId, setCollections])

  const getCollectionTemplates = useCallback((collectionId: string): ComponentTemplate[] => {
    const current = collections.find(collection => collection.id === collectionId)
    if (!current) return []
    return getTemplatesForLibraryCollection(templates, current)
  }, [collections, templates])

  return {
    collections: scopedCollections,
    loading,
    error,
    createCollection,
    renameCollection,
    deleteCollection,
    setCollectionColor,
    getCollectionTemplates,
    refreshCollections: () => (profileId ? fetchCollections(profileId) : Promise.resolve([])),
  }
}
