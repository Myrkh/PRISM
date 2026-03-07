/**
 * features/library/builtinCatalog.ts — PRISM
 *
 * Single source of truth pour le catalogue de composants SIS.
 * Données issues de : exida SERH 2023, OREDA 2015, IEC 61508-6 Table D.
 *
 * ⚠ Ces données sont indicatives. Les calculs certifiés utilisent les
 *   fiches constructeur (FMEDA / SERH / certified λ).
 */
import type { SubsystemType } from '@/core/types'
import type { LibraryComponentEntry, LibraryCatalogItem } from './catalogTypes'

// ─── Full catalog (for ArchitectureBuilder / new LibraryPanel) ──────────
export const BUILTIN_COMPONENTS: LibraryComponentEntry[] = [
  // ── Sensors ─────────────────────────────────────────────────────────────
  { libraryId: 'lib-pt',    name: 'Pressure transmitter',    subsystemType: 'sensor',   instrumentCategory: 'transmitter', instrumentType: 'Pressure transmitter',    manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 6.5,  lambdaDRatio: 0.25, DCd: 0.70, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-tt',    name: 'Temperature transmitter',  subsystemType: 'sensor',   instrumentCategory: 'transmitter', instrumentType: 'Temperature transmitter',  manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 5.0,  lambdaDRatio: 0.25, DCd: 0.65, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-ft',    name: 'Flow transmitter',         subsystemType: 'sensor',   instrumentCategory: 'transmitter', instrumentType: 'Flow transmitter',         manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 8.0,  lambdaDRatio: 0.25, DCd: 0.60, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-lt',    name: 'Level transmitter',        subsystemType: 'sensor',   instrumentCategory: 'transmitter', instrumentType: 'Level transmitter',        manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 7.2,  lambdaDRatio: 0.25, DCd: 0.65, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-ps',    name: 'Pressure switch',          subsystemType: 'sensor',   instrumentCategory: 'switch',      instrumentType: 'Pressure switch',          manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 10.0, lambdaDRatio: 0.30, DCd: 0.50, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-ls',    name: 'Level switch',             subsystemType: 'sensor',   instrumentCategory: 'switch',      instrumentType: 'Level switch',             manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 12.0, lambdaDRatio: 0.30, DCd: 0.50, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-ts',    name: 'Temperature switch',       subsystemType: 'sensor',   instrumentCategory: 'switch',      instrumentType: 'Temperature switch',       manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 9.0,  lambdaDRatio: 0.28, DCd: 0.45, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },

  // ── Logic Solvers ───────────────────────────────────────────────────────
  { libraryId: 'lib-plc',   name: 'Safety PLC',               subsystemType: 'logic',    instrumentCategory: 'controller',  instrumentType: 'Safety PLC',               manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 1.5,  lambdaDRatio: 0.25, DCd: 0.90, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-sc',    name: 'Safety controller',        subsystemType: 'logic',    instrumentCategory: 'controller',  instrumentType: 'Safety controller',        manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 1.8,  lambdaDRatio: 0.25, DCd: 0.92, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-relay', name: 'Safety relay module',      subsystemType: 'logic',    instrumentCategory: 'relay',       instrumentType: 'Safety relay module',      manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 2.5,  lambdaDRatio: 0.20, DCd: 0.70, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-ri',    name: 'Relais interposé',         subsystemType: 'logic',    instrumentCategory: 'relay',       instrumentType: 'Interposing relay',        manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 3.0,  lambdaDRatio: 0.22, DCd: 0.65, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },

  // ── Actuators ───────────────────────────────────────────────────────────
  { libraryId: 'lib-xv',    name: 'On-off valve (XV)',        subsystemType: 'actuator', instrumentCategory: 'valve',       instrumentType: 'On-off valve',             manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 1.5,  lambdaDRatio: 0.25, DCd: 0.70, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-sv',    name: 'Solenoid valve (SV)',      subsystemType: 'actuator', instrumentCategory: 'valve',       instrumentType: 'Solenoid valve',           manufacturer: '', dataSource: 'exida SERH', factorized: { lambda: 3.0,  lambdaDRatio: 0.30, DCd: 0.60, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-bv',    name: 'Ball valve',               subsystemType: 'actuator', instrumentCategory: 'valve',       instrumentType: 'Ball valve',               manufacturer: '', dataSource: 'OREDA',      factorized: { lambda: 2.0,  lambdaDRatio: 0.25, DCd: 0.60, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-mv',    name: 'Motorised valve',          subsystemType: 'actuator', instrumentCategory: 'valve',       instrumentType: 'Motorised valve',          manufacturer: '', dataSource: 'OREDA',      factorized: { lambda: 4.5,  lambdaDRatio: 0.28, DCd: 0.55, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
  { libraryId: 'lib-pump',  name: 'Emergency shutdown pump',  subsystemType: 'actuator', instrumentCategory: 'other',       instrumentType: 'ESD pump',                 manufacturer: '', dataSource: 'OREDA',      factorized: { lambda: 5.0,  lambdaDRatio: 0.30, DCd: 0.55, DCs: 1.0 }, test: { T1: 1, T1Unit: 'yr' }, isCustom: false },
]

// ─── Simplified catalog (for LoopEditorRightPanel drag items) ────────────
export const LIBRARY_CATALOG: LibraryCatalogItem[] = BUILTIN_COMPONENTS.map(c => ({
  type: c.subsystemType,
  category: getCategoryLabel(c),
  name: c.name,
  lambda: c.factorized.lambda,
  dc: c.factorized.DCd,
}))

function getCategoryLabel(c: LibraryComponentEntry): string {
  const catMap: Partial<Record<SubsystemType, Record<string, string>>> = {
    sensor:   { transmitter: 'Transmetteur', switch: 'Switch' },
    logic:    { controller: 'PLC Sécurité', relay: 'Relais' },
    actuator: { valve: 'Vanne', other: 'Équipement' },
  }
  return catMap[c.subsystemType]?.[c.instrumentCategory] ?? c.instrumentCategory
}
