/**
 * lib/prismFormat.ts
 *
 * Portable PRISM file format (.prism) for SIF and project export/import.
 *
 * Schema v1.0  (JSON, UTF-8):
 *   { prismVersion, type: 'sif' | 'project', exportedAt, payload }
 */
import type { SIF, Project } from '@/core/types/sif.types'

export const PRISM_FORMAT_VERSION = '1.0'
export const PRISM_EXT = '.prism'
export const PRISM_MIME = 'application/x-prism+json'

// ── Payload types ──────────────────────────────────────────────────────────

export interface PrismSIFPayload {
  sif: SIF
  sourceProjectName: string
  sourceProjectRef: string
}

export interface PrismProjectPayload {
  projectMeta: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sifs'>
  sifs: SIF[]
}

export interface PrismFile {
  prismVersion: string
  type: 'sif' | 'project'
  exportedAt: string
  payload: PrismSIFPayload | PrismProjectPayload
}

// ── Serialize ──────────────────────────────────────────────────────────────

export function serializeSIF(sif: SIF, project: Project): string {
  const file: PrismFile = {
    prismVersion: PRISM_FORMAT_VERSION,
    type: 'sif',
    exportedAt: new Date().toISOString(),
    payload: {
      sif,
      sourceProjectName: project.name,
      sourceProjectRef: project.ref,
    },
  }
  return JSON.stringify(file, null, 2)
}

export function serializeProject(project: Project): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, createdAt: _c, updatedAt: _u, sifs, ...projectMeta } = project
  const file: PrismFile = {
    prismVersion: PRISM_FORMAT_VERSION,
    type: 'project',
    exportedAt: new Date().toISOString(),
    payload: { projectMeta, sifs },
  }
  return JSON.stringify(file, null, 2)
}

// ── Deserialize ────────────────────────────────────────────────────────────

export class PrismFormatError extends Error {
  constructor(msg: string) { super(msg); this.name = 'PrismFormatError' }
}

export function parsePrismFile(json: string): PrismFile {
  let parsed: unknown
  try { parsed = JSON.parse(json) } catch { throw new PrismFormatError('Fichier invalide (JSON malformé).') }
  if (typeof parsed !== 'object' || parsed === null) throw new PrismFormatError('Fichier invalide.')
  const f = parsed as Record<string, unknown>
  if (f.prismVersion !== PRISM_FORMAT_VERSION) {
    throw new PrismFormatError(`Version non supportée : ${String(f.prismVersion ?? 'inconnue')}.`)
  }
  if (f.type !== 'sif' && f.type !== 'project') {
    throw new PrismFormatError(`Type de fichier inconnu : ${String(f.type)}.`)
  }
  if (!f.payload || typeof f.payload !== 'object') throw new PrismFormatError('Contenu manquant.')
  return parsed as PrismFile
}

// ── Browser download helper ────────────────────────────────────────────────

export function triggerDownload(content: string | Blob, filename: string, mime = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function safeName(s: string, maxLen = 40) {
  return s.replace(/[^a-zA-Z0-9\-_]/g, '_').replace(/_+/g, '_').slice(0, maxLen) || 'export'
}

export function downloadSIF(sif: SIF, project: Project) {
  const name = `${safeName(sif.sifNumber)}_${safeName(sif.title, 30)}${PRISM_EXT}`
  triggerDownload(serializeSIF(sif, project), name, PRISM_MIME)
}

export function downloadProject(project: Project) {
  triggerDownload(serializeProject(project), `${safeName(project.name)}${PRISM_EXT}`, PRISM_MIME)
}
