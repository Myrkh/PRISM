/**
 * store/selectors.ts — PRISM Store Selectors
 *
 * Centralized selectors for clean data access.
 * Prefer these over inline store queries for consistency.
 */
import type { SIF, Project } from '@/core/types'
import { calcSIF, calcSIFEngine } from '@/core/math/pfdCalc'
import type { AppState } from './types'

/** Find a project by ID */
export const selectProject = (state: AppState, id: string): Project | undefined =>
  state.projects.find(p => p.id === id)

/** Find a SIF within a project */
export const selectSIF = (state: AppState, projectId: string, sifId: string): SIF | undefined =>
  state.projects.find(p => p.id === projectId)?.sifs.find(s => s.id === sifId)

/** Compute the legacy UI calculation for a SIF using the real engine underneath */
export const selectSIFCalc = (state: AppState, projectId: string, sifId: string) => {
  const project = selectProject(state, projectId)
  const sif = selectSIF(state, projectId, sifId)
  return sif ? calcSIF(sif, { projectStandard: project?.standard }) : undefined
}

/** Raw engine result for advanced screens or debugging */
export const selectSIFEngineResult = (state: AppState, projectId: string, sifId: string) => {
  const project = selectProject(state, projectId)
  const sif = selectSIF(state, projectId, sifId)
  return sif ? calcSIFEngine(sif, { projectStandard: project?.standard }) : undefined
}

/** Get the currently viewed SIF (if on sif-dashboard) */
export const selectCurrentSIF = (state: AppState): SIF | undefined => {
  if (state.view.type !== 'sif-dashboard') return undefined
  return selectSIF(state, state.view.projectId, state.view.sifId)
}

/** Get the current SIF legacy calculation (if on sif-dashboard) */
export const selectCurrentSIFCalc = (state: AppState) => {
  if (state.view.type !== 'sif-dashboard') return undefined
  return selectSIFCalc(state, state.view.projectId, state.view.sifId)
}

/** Get the current raw engine result (if on sif-dashboard) */
export const selectCurrentSIFEngineResult = (state: AppState) => {
  if (state.view.type !== 'sif-dashboard') return undefined
  return selectSIFEngineResult(state, state.view.projectId, state.view.sifId)
}

/** Get the currently viewed project (if on sif-dashboard) */
export const selectCurrentProject = (state: AppState): Project | undefined => {
  if (state.view.type !== 'sif-dashboard') return undefined
  return selectProject(state, state.view.projectId)
}

/** Count all SIFs across all projects */
export const selectTotalSIFs = (state: AppState): number =>
  state.projects.reduce((acc, p) => acc + p.sifs.length, 0)

/** Get all active projects */
export const selectActiveProjects = (state: AppState): Project[] =>
  state.projects.filter(p => p.status === 'active')
