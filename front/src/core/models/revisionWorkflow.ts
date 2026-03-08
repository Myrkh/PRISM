import type { Project, SIF, SIFRevisionArtifact } from '@/core/types'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function incrementLetterSequence(value: string): string {
  const chars = value.toUpperCase().split('')
  let carry = true

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    if (!carry) break
    const currentIndex = LETTERS.indexOf(chars[index])
    if (currentIndex === -1) return `${value}-1`
    if (currentIndex === LETTERS.length - 1) {
      chars[index] = 'A'
    } else {
      chars[index] = LETTERS[currentIndex + 1]
      carry = false
    }
  }

  if (carry) chars.unshift('A')
  return chars.join('')
}

export function incrementRevisionLabel(value: string | null | undefined): string {
  const current = value?.trim()
  if (!current) return 'A'

  const numericMatch = current.match(/^(.*?)(\d+)$/)
  if (numericMatch) {
    const [, prefix, suffix] = numericMatch
    const nextNumber = String(Number.parseInt(suffix, 10) + 1).padStart(suffix.length, '0')
    return `${prefix}${nextNumber}`
  }

  const alphaMatch = current.match(/^(.*?)([A-Za-z]+)$/)
  if (alphaMatch) {
    const [, prefix, suffix] = alphaMatch
    return `${prefix}${incrementLetterSequence(suffix)}`
  }

  return `${current}-1`
}

function sanitizeSegment(value: string, fallback: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return sanitized || fallback
}

export function createDefaultRevisionArtifact(bucket: string): SIFRevisionArtifact {
  return {
    bucket,
    path: null,
    fileName: null,
    status: 'missing',
    generatedAt: null,
    error: null,
  }
}

export function buildRevisionArtifactPath(params: {
  bucket: string
  project: Project
  sif: SIF
  revisionId: string
  revisionLabel: string
  kind: 'report' | 'prooftest'
}): { fileName: string; path: string } {
  const projectRef = sanitizeSegment(params.project.ref || params.project.name || params.project.id, params.project.id)
  const sifNumber = sanitizeSegment(params.sif.sifNumber, params.sif.id)
  const revisionLabel = sanitizeSegment(params.revisionLabel, 'A')
  const fileStem = params.kind === 'report'
    ? `SIF_${sifNumber}_Rev_${revisionLabel}`
    : `ProofTest_${sifNumber}_Rev_${revisionLabel}`

  return {
    fileName: `${fileStem}.pdf`,
    path: `${projectRef}/${params.sif.id}/${params.revisionId}/${fileStem}.pdf`,
  }
}
