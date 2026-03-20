import type { InstrumentCategory, SIFComponent, SubsystemType } from './component.types'

export type ComponentTemplateScope = 'project' | 'user' | 'shared' | 'public'
export type ComponentTemplateReviewStatus = 'draft' | 'review' | 'approved' | 'archived'
export type ComponentTemplateOrigin = 'builtin' | 'database'

export interface ComponentTemplate {
  id: string
  ownerProfileId: string | null
  projectId: string | null
  scope: ComponentTemplateScope
  origin: ComponentTemplateOrigin
  libraryName?: string | null
  name: string
  description: string
  subsystemType: SubsystemType
  instrumentCategory: InstrumentCategory
  instrumentType: string
  manufacturer: string
  dataSource: string
  sourceReference: string | null
  tags: string[]
  reviewStatus: ComponentTemplateReviewStatus
  importBatchId: string | null
  templateSchemaVersion: number
  templateVersion: number
  isArchived: boolean
  archivedAt: string | null
  createdAt: string | null
  updatedAt: string | null
  componentSnapshot: SIFComponent
}

export interface ComponentTemplateUpsertInput {
  id?: string
  projectId?: string | null
  scope: Extract<ComponentTemplateScope, 'project' | 'user'>
  libraryName?: string | null
  name: string
  description?: string
  sourceReference?: string | null
  tags?: string[]
  reviewStatus?: Extract<ComponentTemplateReviewStatus, 'draft' | 'review' | 'approved'>
  importBatchId?: string | null
  templateSchemaVersion?: number
  templateVersion?: number
  componentSnapshot: SIFComponent
}

export interface ComponentTemplateExportEnvelope {
  format: 'prism.component-templates'
  version: number
  exportedAt: string
  exportedByProfileId: string | null
  projectId: string | null
  templates: ComponentTemplate[]
}
