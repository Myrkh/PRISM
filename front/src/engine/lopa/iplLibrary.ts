/**
 * engine/lopa/iplLibrary.ts — PRISM
 *
 * Built-in IPL credit library based on:
 *   - CCPS "Layer of Protection Analysis" (2001)
 *   - IEC 61511-3:2016 Annex F
 *   - AIChE / DIERS guidelines
 *
 * PFD values represent typical credit — users may adjust
 * within pfdMin/pfdMax range with documented justification.
 */

import type { IPLLibraryEntry, IPLType } from '@/core/types/lopa.types'

export const IPL_LIBRARY: IPLLibraryEntry[] = [
  // ── Basic Process Control System ──────────────────────────────────────
  {
    id: 'bpcs-standard',
    type: 'bpcs',
    name: 'BPCS — Standard',
    description: 'Basic Process Control System (separate from SIS). Single loop responding to deviation.',
    pfdTypical: 0.1,
    pfdMin: 0.1,
    pfdMax: 0.1,
    notes: 'PFD = 0.1 (IEC 61511-3, CCPS). Only ONE credit allowed per scenario. Must be independent of SIS.',
    standard: 'IEC 61511-3:2016, CCPS LOPA 2001',
    requiresValidation: true,
  },

  // ── Alarm + Operator Response ─────────────────────────────────────────
  {
    id: 'alarm-hloa-standard',
    type: 'alarm_hloa',
    name: 'HLOA — High alarm + operator response (≥10 min)',
    description: 'High-level or high-pressure alarm requiring operator action within available response time.',
    pfdTypical: 0.1,
    pfdMin: 0.1,
    pfdMax: 0.1,
    notes: 'PFD = 0.1 only if: (1) response time ≥ 10 min, (2) non-nuisance alarm, (3) independent from IE. Only one alarm credit per scenario.',
    standard: 'CCPS LOPA 2001, IEC 61511-3',
    requiresValidation: true,
  },
  {
    id: 'alarm-hloa-emergency',
    type: 'alarm_hloa',
    name: 'HLOA — Emergency shutdown alarm (<10 min, trained)',
    description: 'Critical alarm with trained operator response in 5–10 minute window.',
    pfdTypical: 0.1,
    pfdMin: 0.1,
    pfdMax: 0.1,
    notes: 'Response time < 10 min requires additional justification. SOP must be available and practiced.',
    standard: 'CCPS LOPA 2001',
    requiresValidation: true,
  },

  // ── Pressure Safety Valve ─────────────────────────────────────────────
  {
    id: 'psv-spring-loaded',
    type: 'psv',
    name: 'PSV — Spring-loaded pressure relief valve',
    description: 'Conventional spring-loaded pressure safety valve per API 520/521.',
    pfdTypical: 0.01,
    pfdMin: 0.001,
    pfdMax: 0.01,
    notes: 'Typical PFD = 0.01. Annual inspection and testing required to maintain credit. Assumes clean service.',
    standard: 'API 520, API 521, CCPS LOPA 2001',
    requiresValidation: false,
  },
  {
    id: 'psv-pilot-operated',
    type: 'psv',
    name: 'PSV — Pilot-operated relief valve',
    description: 'Pilot-operated PSV with better performance in dirty/viscous service.',
    pfdTypical: 0.01,
    pfdMin: 0.001,
    pfdMax: 0.01,
    notes: 'Similar credit to spring-loaded. Better suited for back-pressure service.',
    standard: 'API 520, CCPS LOPA 2001',
    requiresValidation: false,
  },

  // ── Rupture Disc ──────────────────────────────────────────────────────
  {
    id: 'rupture-disc',
    type: 'rupture_disc',
    name: 'Rupture Disc (standalone)',
    description: 'Passive rupture disc providing overpressure relief. Single-use device.',
    pfdTypical: 0.01,
    pfdMin: 0.001,
    pfdMax: 0.01,
    notes: 'PFD = 0.01 for standalone use. If installed upstream of PSV, combined credit applies. Must be replaced after each rupture.',
    standard: 'CCPS LOPA 2001, ASME BPVC Sec VIII',
    requiresValidation: false,
  },

  // ── Check Valve ───────────────────────────────────────────────────────
  {
    id: 'check-valve-passive',
    type: 'check_valve',
    name: 'Check Valve — Passive backflow prevention',
    description: 'Passive mechanical check valve preventing reverse flow.',
    pfdTypical: 0.01,
    pfdMin: 0.01,
    pfdMax: 0.1,
    notes: 'Credit depends on valve type, fluid, and maintenance regime. Swing check valves may have higher PFD.',
    standard: 'CCPS LOPA 2001',
    requiresValidation: false,
  },

  // ── Bund / Dike ───────────────────────────────────────────────────────
  {
    id: 'bund-concrete',
    type: 'bund',
    name: 'Bund / Dike — Concrete impoundment',
    description: 'Secondary containment bund or dike preventing liquid spread.',
    pfdTypical: 0.01,
    pfdMin: 0.001,
    pfdMax: 0.01,
    notes: 'PFD = 0.01 if properly designed, inspected and maintained. Drainage system must be kept clear.',
    standard: 'CCPS LOPA 2001, EN 1825',
    requiresValidation: false,
  },

  // ── Deluge / Fire Suppression ─────────────────────────────────────────
  {
    id: 'deluge-system',
    type: 'deluge',
    name: 'Deluge — Automatic fire suppression system',
    description: 'Fixed deluge or water spray system activated automatically by fire/gas detection.',
    pfdTypical: 0.01,
    pfdMin: 0.01,
    pfdMax: 0.1,
    notes: 'Credit applies to limiting consequence severity (escalation prevention), not initiating event prevention.',
    standard: 'NFPA 15, CCPS LOPA 2001',
    requiresValidation: true,
  },

  // ── Relief Valve ──────────────────────────────────────────────────────
  {
    id: 'relief-valve-thermal',
    type: 'relief_valve',
    name: 'Relief Valve — Thermal relief (blocked-outlet)',
    description: 'Small-bore thermal relief valve for blocked-in heat expansion.',
    pfdTypical: 0.01,
    pfdMin: 0.001,
    pfdMax: 0.01,
    notes: 'Sized for thermal expansion only. Annual inspection required.',
    standard: 'API 520, CCPS LOPA 2001',
    requiresValidation: false,
  },

  // ── Flame / Gas Detector ──────────────────────────────────────────────
  {
    id: 'flame-gas-detector',
    type: 'flame_detector',
    name: 'Flame/Gas detector + ESD',
    description: 'Voting gas or flame detectors triggering emergency shutdown.',
    pfdTypical: 0.01,
    pfdMin: 0.001,
    pfdMax: 0.1,
    notes: 'Must be independent of BPCS. PFD depends on voting architecture (2oo3 preferred for best credit).',
    standard: 'IEC 60079-29, IEC 61511',
    requiresValidation: true,
  },
]

export const IPL_LIBRARY_BY_ID: Map<string, IPLLibraryEntry> = new Map(
  IPL_LIBRARY.map(entry => [entry.id, entry]),
)

export const IPL_TYPE_LABELS: Record<IPLType, string> = {
  bpcs:           'BPCS',
  alarm_hloa:     'Alarm + Operator',
  psv:            'PSV',
  rupture_disc:   'Rupture Disc',
  check_valve:    'Check Valve',
  bund:           'Bund / Dike',
  deluge:         'Deluge',
  relief_valve:   'Relief Valve',
  flame_detector: 'Flame/Gas Detector',
  custom:         'Custom IPL',
}

export const IPL_TYPE_COLORS: Record<IPLType, string> = {
  bpcs:           '#3B82F6',
  alarm_hloa:     '#8B5CF6',
  psv:            '#F59E0B',
  rupture_disc:   '#EF4444',
  check_valve:    '#10B981',
  bund:           '#6B7280',
  deluge:         '#06B6D4',
  relief_valve:   '#F97316',
  flame_detector: '#DC2626',
  custom:         '#6B7280',
}
