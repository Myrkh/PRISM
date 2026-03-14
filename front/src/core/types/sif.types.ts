/**
 * core/types/sif.types.ts — PRISM  (replaces the old sil-only file)
 *
 * SIF and Project-level types.
 * Depends on: sil.types (SILLevel), component.types (SIFSubsystem),
 *             prooftest.types, hazop.types
 */
import type { SILLevel } from './sil.types'
import type { SIFSubsystem } from './component.types'
import type { ProofTestProcedure, TestCampaign, OperationalEvent } from './prooftest.types'
import type { HAZOPTrace } from './hazop.types'

// ─── SIF ──────────────────────────────────────────────────────────────────
export type SIFStatus = 'draft' | 'in_review' | 'verified' | 'approved' | 'archived'
export type SIFAssumptionStatus = 'draft' | 'review' | 'validated'
export type SIFAssumptionCategory = 'process' | 'proof' | 'architecture' | 'data' | 'governance' | 'other'
export type SIFReferenceTab =
  | 'cockpit'
  | 'context'
  | 'architecture'
  | 'verification'
  | 'exploitation'
  | 'report'
  | 'overview'
  | 'analysis'
  | 'compliance'
  | 'prooftest'
export type RevisionArtifactStatus = 'missing' | 'pending' | 'ready' | 'error'

export interface SIFRevisionArtifact {
  bucket: string
  path: string | null
  fileName: string | null
  status: RevisionArtifactStatus
  generatedAt: string | null
  error: string | null
}

export interface SIFAssumption {
  id: string
  title: string
  statement: string
  rationale: string
  status: SIFAssumptionStatus
  owner: string
  reviewDate: string
  category: SIFAssumptionCategory
  linkedTab: SIFReferenceTab
}

export interface SIF {
  id: string
  projectId: string
  sifNumber: string
  revision: string
  revisionLockedAt?: string | null
  lockedRevisionId?: string | null
  title: string
  description: string
  pid: string
  location: string
  processTag: string
  hazardousEvent: string
  demandRate: number
  targetSIL: SILLevel
  rrfRequired: number
  madeBy: string
  verifiedBy: string
  approvedBy: string
  date: string
  status: SIFStatus
  subsystems: SIFSubsystem[]
  assumptions: SIFAssumption[]
  // Traceability
  hazopTrace?: HAZOPTrace
  // Proof Test
  proofTestProcedure?: ProofTestProcedure
  testCampaigns: TestCampaign[]
  // SIL Live
  operationalEvents: OperationalEvent[]
}

// ─── Project ──────────────────────────────────────────────────────────────
export type ProjectStatus = 'active' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  ref: string
  client: string
  site: string
  unit: string
  standard: 'IEC61511' | 'IEC61508' | 'ISA84'
  revision: string
  description: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  sifs: SIF[]
}

// ─── SIF Revisions (history snapshots) ───────────────────────────────────
export interface SIFRevision {
  id: string
  sifId: string
  projectId: string
  revisionLabel: string
  status: SIFStatus
  changeDescription: string
  createdBy: string
  createdAt: string
  snapshot: SIF
  reportArtifact: SIFRevisionArtifact
  proofTestArtifact: SIFRevisionArtifact
  reportConfigSnapshot: Record<string, unknown> | null
}
