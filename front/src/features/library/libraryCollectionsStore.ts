import { create } from 'zustand'
import { dbFetchLibraryCollections, type LibraryCollectionRecord } from '@/lib/libraryCollections'

interface LibraryCollectionsState {
  collections: LibraryCollectionRecord[]
  loading: boolean
  error: string | null
  hydratedOwnerId: string | null
  fetchCollections: (ownerProfileId: string) => Promise<LibraryCollectionRecord[]>
  setCollections: (ownerProfileId: string, collections: LibraryCollectionRecord[]) => void
  reset: () => void
}

export const useLibraryCollectionsStore = create<LibraryCollectionsState>((set) => ({
  collections: [],
  loading: false,
  error: null,
  hydratedOwnerId: null,
  fetchCollections: async (ownerProfileId: string) => {
    set(state => ({ ...state, loading: true, error: null }))
    try {
      const collections = await dbFetchLibraryCollections(ownerProfileId)
      set({ collections, loading: false, error: null, hydratedOwnerId: ownerProfileId })
      return collections
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load library collections.'
      set({ collections: [], loading: false, error: message, hydratedOwnerId: ownerProfileId })
      return []
    }
  },
  setCollections: (ownerProfileId, collections) => {
    set({ collections, hydratedOwnerId: ownerProfileId, error: null })
  },
  reset: () => {
    set({ collections: [], loading: false, error: null, hydratedOwnerId: null })
  },
}))
