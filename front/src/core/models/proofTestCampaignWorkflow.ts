import type { Project, SIF, ProofTestCampaignArtifact } from '@/core/types'

function sanitizeSegment(value: string, fallback: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return sanitized || fallback
}

export function createDefaultProofTestCampaignArtifact(bucket = 'prism_prooftest'): ProofTestCampaignArtifact {
  return {
    bucket,
    path: null,
    fileName: null,
    status: 'missing',
    generatedAt: null,
    error: null,
  }
}

export function buildProofTestCampaignArtifactPath(params: {
  project: Project
  sif: SIF
  campaignId: string
  campaignDate: string
}): { fileName: string; path: string } {
  const projectRef = sanitizeSegment(params.project.ref || params.project.name || params.project.id, params.project.id)
  const sifNumber = sanitizeSegment(params.sif.sifNumber, params.sif.id)
  const campaignDate = sanitizeSegment(params.campaignDate || 'undated', 'undated')
  const campaignSlug = sanitizeSegment(params.campaignId.slice(0, 8), params.campaignId)
  const fileStem = `ProofTest_${sifNumber}_Campaign_${campaignDate}_${campaignSlug}`

  return {
    fileName: `${fileStem}.pdf`,
    path: `${projectRef}/${params.sif.id}/campaigns/${params.campaignId}/${fileStem}.pdf`,
  }
}
