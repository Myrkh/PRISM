/**
 * core/types/hazop.types.ts — PRISM
 *
 * HAZOP / LOPA traceability types.
 * No dependencies on other type files.
 */
export interface HAZOPTrace {
  hazopNode: string         // e.g. "Node 3 — HP Separator"
  scenarioId: string        // e.g. "SC-003"
  deviationCause: string    // e.g. "High pressure — loss of outflow"
  initiatingEvent: string   // e.g. "Control valve CV-001 fails open"
  lopaRef: string           // e.g. "LOPA-HTL-003"
  tmel: number              // Target Mitigated Event Likelihood [yr⁻¹]
  iplList: string           // e.g. "BPCS, PSV-101"
  riskMatrix: string        // e.g. "4C"
  hazopDate: string
  lopaDate: string
  hazopFacilitator: string
}
