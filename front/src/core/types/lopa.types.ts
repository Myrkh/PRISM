/**
 * core/types/lopa.types.ts — PRISM
 *
 * LOPA (Layer of Protection Analysis) data model.
 * Follows IEC 61511 / CCPS LOPA methodology.
 * No dependencies on other type files.
 */

// ─── IPL ──────────────────────────────────────────────────────────────────

export type IPLType =
  | 'bpcs'           // Basic Process Control System (separate from SIS)
  | 'alarm_hloa'     // High-level alarm + operator response
  | 'psv'            // Pressure Safety Valve
  | 'rupture_disc'   // Rupture Disc
  | 'check_valve'    // Check Valve (passive mechanical)
  | 'bund'           // Bund / dike / containment
  | 'deluge'         // Active fire suppression (deluge / firewater)
  | 'relief_valve'   // Relief Valve (thermal / blocked-outlet)
  | 'flame_detector' // Flame/gas detector + shutdown
  | 'custom'         // User-defined IPL

export type IPLCreditSource = 'library' | 'custom'

export interface IPLCredit {
  id: string
  type: IPLType
  tag: string            // Equipment tag, e.g. "PSV-001"
  description: string
  pfd: number            // Probability of Failure on Demand (0 < pfd ≤ 1)
  creditSource: IPLCreditSource
  libraryId?: string     // Link to built-in IPL library entry
  isValidated: boolean   // Independence from IE / BPCS confirmed?
  notes: string
}

export interface IPLLibraryEntry {
  id: string
  type: IPLType
  name: string
  description: string
  pfdTypical: number     // Typical credit
  pfdMin: number         // Best case (lowest PFD = most credit)
  pfdMax: number         // Worst case (least credit)
  notes: string
  standard: string       // e.g. "CCPS LOPA 2001", "IEC 61511-3"
  requiresValidation: boolean
}

// ─── Scenarios ────────────────────────────────────────────────────────────

export type ConsequenceCategory =
  | 'safety_personnel'
  | 'safety_public'
  | 'environment_local'
  | 'environment_regional'
  | 'asset'
  | 'production'

export interface LOPAScenario {
  id: string
  order: number                        // display order (1-based)
  scenarioId: string                   // user ref, e.g. "SC-003"
  hazopRef?: string                    // link to HAZOPTrace.scenarioId
  sifRef?: string                      // ID of the SIF this scenario targets

  // ── Identification ─────────────────────────────────────────────────────
  description: string
  consequenceCategory: ConsequenceCategory
  consequenceDescription: string

  // ── Initiating Event ───────────────────────────────────────────────────
  initiatingEvent: string
  ief: number                          // Initiating Event Frequency [yr⁻¹]
  iefSource: string                    // data source / reference

  // ── Conditional Modifiers ──────────────────────────────────────────────
  ignitionProbability: number | null   // 0–1, for flammable/explosive scenarios
  occupancyFactor: number | null       // fraction of time personnel present

  // ── IPL Credits ────────────────────────────────────────────────────────
  ipls: IPLCredit[]

  // ── Risk Target ────────────────────────────────────────────────────────
  tmel: number                         // Target Mitigated Event Likelihood [yr⁻¹]
  riskMatrixCell: string               // e.g. "3C" — for audit trail
}

// ─── Worksheet ────────────────────────────────────────────────────────────

export interface LOPAWorksheet {
  id: string
  projectId: string
  name: string                         // user-defined study name, e.g. "MOC-001 — Compressor upgrade"
  description?: string                 // optional context / scope notes
  scenarios: LOPAScenario[]
  frozenAt?: string | null             // null = editable
  createdAt: string
  updatedAt: string
}

// ─── Risk Tolerance Table (project-level) ────────────────────────────────

/**
 * Maps each consequence category to a TMEL (Target Mitigated Event Likelihood).
 * Defined at project level — used by LOPA to auto-populate TMEL on new scenarios.
 * Based on company risk criteria (e.g. ALARP / tolerable risk thresholds).
 */
export type RiskToleranceTable = Partial<Record<ConsequenceCategory, number>>

// ─── LOPA Project Parameters ──────────────────────────────────────────────

/**
 * One row of the severity axis (G1–G5) in the project risk matrix.
 * Customisable per project / client — defines names, TMEL thresholds, colours.
 */
export interface SeverityLevel {
  id: 'G1' | 'G2' | 'G3' | 'G4' | 'G5'
  name: string        // e.g. 'Négligeable', 'Mineur', 'Modéré', 'Grave', 'Catastrophique'
  description: string // e.g. 'Aucune blessure, dommages < 10 k€'
  tmel: number        // TMEL threshold [yr⁻¹] for this severity level
  color: string       // hex colour for the risk matrix cell
}

/**
 * One row of the frequency axis (F1–F5) in the project risk matrix.
 */
export interface FrequencyLevel {
  id: 'F1' | 'F2' | 'F3' | 'F4' | 'F5'
  name: string        // e.g. 'Extrêmement rare'
  rangeLabel: string  // e.g. '< 10⁻⁴/yr'
}

/**
 * A project-specific IPL template (pre-filled entry for the IPL library).
 * Defined at project level — reflects site standards (e.g. PSV sizing, bund specs).
 */
export interface ProjectIPLTemplate {
  id: string
  type: IPLType
  tag: string           // e.g. 'PSV-TYPE-A'
  description: string
  pfd: number
  standard: string      // e.g. 'Site standard rev. B'
  notes: string
}

/**
 * Full set of project-level LOPA parameters.
 * Stored as JSONB in prism_projects.lopa_params.
 * All fields are optional — missing → fall back to PRISM defaults (IEC 61511).
 */
export interface LOPAProjectParams {
  severityLevels?: SeverityLevel[]      // custom G1–G5 (overrides hardcoded defaults)
  frequencyLevels?: FrequencyLevel[]    // custom F1–F5 labels
  riskTolerance?: RiskToleranceTable    // consequence-category TMEL (complements severityLevels)
  iplTemplates?: ProjectIPLTemplate[]   // site-specific IPL templates
  updatedAt?: string
}

// ─── Computed Results (not stored) ────────────────────────────────────────

export interface LOPAWaterfallStep {
  label: string
  pfd: number        // the PFD factor applied at this step
  runningMef: number // MEF value after this step
  isTarget: boolean  // true for the TMEL line
}

export interface LOPAScenarioResult {
  scenarioId: string
  ief: number
  conditionalModifierProduct: number
  iplPfdProduct: number
  mef: number                          // Mitigated Event Frequency [yr⁻¹]
  tmel: number
  rrf: number                          // Required Risk Reduction Factor
  silRequired: 0 | 1 | 2 | 3 | 4      // SIL required for SIF
  isAdequate: boolean                  // true if mef <= tmel
  needsSIF: boolean                    // true if rrf > 1
  waterfall: LOPAWaterfallStep[]
}
