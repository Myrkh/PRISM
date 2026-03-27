/**
 * lib/workspaceDownload.ts
 *
 * Download helpers for workspace nodes.
 *   - Note        → .md file (plain text)
 *   - PDF / Image → blob from Supabase Storage → browser download
 *   - Folder      → JSZip with all descendants, recursively → .zip
 */
import JSZip from 'jszip'
import { supabase } from '@/lib/supabase'
import { triggerDownload } from '@/lib/prismFormat'
import type { WorkspaceNode, WorkspaceNote, WorkspacePDF, WorkspaceImage, WorkspaceJSON } from '@/store/workspaceStore'

const BUCKET = 'workspace-files'

async function fetchBlob(storageKey: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storageKey)
  if (error || !data) return null
  return data
}

/** Download a note as a .md file (synchronous). */
export function downloadNote(note: WorkspaceNote) {
  const name = note.name.endsWith('.md') ? note.name : `${note.name}.md`
  triggerDownload(note.content, name, 'text/markdown; charset=utf-8')
}

/** Download a PDF or image by fetching it from Supabase Storage. */
export async function downloadFile(node: WorkspacePDF | WorkspaceImage | WorkspaceJSON): Promise<void> {
  if (node.type === 'json') {
    const name = node.name.endsWith('.json') ? node.name : `${node.name}.json`
    triggerDownload(node.content, name, 'application/json; charset=utf-8')
    return
  }
  const blob = await fetchBlob(node.storageKey)
  if (!blob) throw new Error('Impossible de récupérer le fichier depuis le serveur.')
  triggerDownload(blob, node.name)
}

/** Zip an entire folder (recursively) and trigger a browser download. */
export async function downloadFolderAsZip(
  folderId: string,
  folderName: string,
  nodes: Record<string, WorkspaceNode>,
  childOrder: Record<string, string[]>,
  onProgress?: (label: string) => void,
): Promise<void> {
  const zip = new JSZip()
  await buildZip(zip, folderId, nodes, childOrder, onProgress)
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  const safe = folderName.replace(/[^a-zA-Z0-9\-_]/g, '_') || 'dossier'
  triggerDownload(blob, `${safe}.zip`)
}

async function buildZip(
  zip: JSZip,
  nodeId: string,
  nodes: Record<string, WorkspaceNode>,
  childOrder: Record<string, string[]>,
  onProgress?: (label: string) => void,
) {
  for (const cid of childOrder[nodeId] ?? []) {
    const child = nodes[cid]
    if (!child) continue
    if (child.type === 'note') {
      onProgress?.(child.name)
      const name = child.name.endsWith('.md') ? child.name : `${child.name}.md`
      zip.file(name, child.content)
    } else if (child.type === 'json') {
      onProgress?.(child.name)
      const name = child.name.endsWith('.json') ? child.name : `${child.name}.json`
      zip.file(name, child.content)
    } else if (child.type === 'pdf' || child.type === 'image') {
      onProgress?.(child.name)
      const blob = await fetchBlob(child.storageKey)
      if (blob) zip.file(child.name, blob)
    } else if (child.type === 'folder') {
      const sub = zip.folder(child.name)!
      await buildZip(sub, child.id, nodes, childOrder, onProgress)
    }
  }
}
