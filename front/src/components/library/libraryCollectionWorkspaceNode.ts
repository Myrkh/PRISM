import type { ComponentTemplate } from '@/core/types'
import type { LibraryCollectionRecord } from '@/lib/libraryCollections'
import { useWorkspaceStore } from '@/store/workspaceStore'
import {
  deriveLibraryCollectionWorkspaceFilename,
  readLibraryCollectionWorkspaceMeta,
  serializeLibraryCollectionWorkspaceDocument,
} from './libraryCollectionWorkspaceJson'

export function findLibraryCollectionWorkspaceNodeId(collectionId: string): string | null {
  const nodes = useWorkspaceStore.getState().nodes
  const match = Object.values(nodes).find(node => {
    if (node.type !== 'json') return false
    if (node.binding?.kind === 'library_collection' && node.binding.collectionId === collectionId) return true
    if (node.schema !== 'prism_library_collection') return false
    return readLibraryCollectionWorkspaceMeta(node.content)?.collectionId === collectionId
  })
  return match?.id ?? null
}

export function ensureLibraryCollectionWorkspaceNode(
  collection: LibraryCollectionRecord,
  templates: ComponentTemplate[],
  ownerProfileId: string | null,
  projectName: string | null,
): string {
  const existingNodeId = findLibraryCollectionWorkspaceNodeId(collection.id)
  if (existingNodeId) return existingNodeId

  return useWorkspaceStore.getState().createJsonNode(
    null,
    deriveLibraryCollectionWorkspaceFilename(collection.name),
    serializeLibraryCollectionWorkspaceDocument(collection, templates, ownerProfileId, projectName),
    {
      schema: 'prism_library_collection',
      binding: { kind: 'library_collection', collectionId: collection.id },
    },
  )
}
