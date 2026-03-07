/**
 * features/library/catalogTypes.ts — PRISM
 *
 * Types pour la bibliothèque de composants SIS.
 * Réunit les types de l'ancien ArchitectureBuilder et du LoopEditorRightPanel.
 */
import type { SubsystemType, InstrumentCategory, FactorizedParams, TestParams } from '@/core/types'

// ─── Library component (enriched catalog entry) ──────────────────────────
export interface LibraryComponentEntry {
  libraryId: string
  name: string
  subsystemType: SubsystemType
  instrumentCategory: InstrumentCategory
  instrumentType: string
  manufacturer: string
  dataSource: string
  factorized: Pick<FactorizedParams, 'lambda' | 'lambdaDRatio' | 'DCd' | 'DCs'>
  test: Pick<TestParams, 'T1' | 'T1Unit'>
  isCustom: boolean
  groupId?: string
}

// ─── Library group (user-created category) ───────────────────────────────
export interface LibraryGroup {
  id: string
  name: string
  subsystemType: SubsystemType
  color: string
}

// ─── Simplified catalog entry (for drag preview) ─────────────────────────
export interface LibraryCatalogItem {
  type: SubsystemType
  category: string
  name: string
  lambda: number
  dc: number
}
