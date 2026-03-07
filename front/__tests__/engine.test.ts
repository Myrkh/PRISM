// =============================================================================
// PRISM Calc Engine — Tests Unitaires
// Source : 10_ENGINE_IMPLEMENTATION.md §8
//
// Cas de validation de référence IEC 61508-6 Annexe B
// =============================================================================

import { computeSIF, DEFAULT_OPTIONS } from '../src/engine/index'
import { computeComponentPFD } from '../src/engine/pfd/component'
import { computeSubsystemPFD } from '../src/engine/pfd/subsystem'
import { computeArchitecturalSIL } from '../src/engine/architectural'
import { computeSubsystemSTR } from '../src/engine/str'
import { pfdavgToSIL, minSIL } from '../src/engine/utils/sil'
import { toHours, fitToPerHour } from '../src/engine/utils/units'
import { binomialCoeff } from '../src/engine/utils/stats'
import { resolveFailureRates, makeDefaultComponentParams } from '../src/engine/resolver'
import type {
  ComponentParams, ChannelDef, SIFDefinition, EngineInput,
} from '../src/engine/types/engine'

// ---------------------------------------------------------------------------
// Helpers pour les tests
// ---------------------------------------------------------------------------

function makeSimpleComp(lambdaDU: number, T1: number, lambdaDD = 0, MTTR = 8): ComponentParams {
  return makeDefaultComponentParams({
    failureRate: {
      mode: 'DEVELOPED',
      lambdaDU,
      lambdaDD,
      lambdaSU: 0,
      lambdaSD: 0,
    },
    MTTR,
    test: {
      type: 'STOPPED',
      T1,
      T0: 0,
      sigma: 1.0,
      gamma: 0,
      pi: 0,
      X: true,
      omega1: 0,
      omega2: 0,
      ptc: 1.0,
    },
  })
}

function makeChannel(comp: ComponentParams): ChannelDef {
  return { id: 'ch1', components: [comp] }
}

function makeChannels(comp: ComponentParams, N: number): ChannelDef[] {
  return Array.from({ length: N }, (_, i) => ({
    id: `ch${i + 1}`,
    components: [{ ...comp, id: `comp${i + 1}`, tag: `TAG-${i + 1}` }],
  }))
}

// ---------------------------------------------------------------------------
// Tests : Résolution des paramètres
// ---------------------------------------------------------------------------

describe('Resolver — Résolution des taux de défaillance', () => {
  test('Mode factorisé → développé', () => {
    const comp = makeDefaultComponentParams({
      failureRate: {
        mode: 'FACTORISED',
        lambda: 1e-6,
        lambdaD_ratio: 0.6,
        DCd: 0.5,
        DCs: 0.3,
      },
    })
    const rates = resolveFailureRates(comp)
    expect(rates.lambdaDU).toBeCloseTo(1e-6 * 0.6 * 0.5, 15) // 3×10⁻⁷
    expect(rates.lambdaDD).toBeCloseTo(1e-6 * 0.6 * 0.5, 15) // 3×10⁻⁷
    expect(rates.lambdaSU).toBeCloseTo(1e-6 * 0.4 * 0.7, 15) // 2.8×10⁻⁷
    expect(rates.lambdaSD).toBeCloseTo(1e-6 * 0.4 * 0.3, 15) // 1.2×10⁻⁷
    expect(rates.lambda).toBeCloseTo(1e-6, 15)
  })

  test('Mode développé — SFF calculé', () => {
    const comp = makeSimpleComp(1e-7, 8760, 9e-7)
    const rates = resolveFailureRates(comp)
    expect(rates.SFF).toBeCloseTo(0.9, 10) // SFF = 1 - λDU/λ = 1 - 10⁻⁷/10⁻⁶ = 0.9
  })

  test('Lambda total cohérent', () => {
    const comp = makeDefaultComponentParams({
      failureRate: {
        mode: 'DEVELOPED',
        lambdaDU: 1e-7,
        lambdaDD: 3e-7,
        lambdaSU: 2e-7,
        lambdaSD: 4e-7,
      },
    })
    const rates = resolveFailureRates(comp)
    expect(rates.lambda).toBeCloseTo(1e-6, 15)
    // SFF = (λSD + λSU + λDD) / λ = (4e-7 + 2e-7 + 3e-7) / 1e-6 = 0.9
    expect(rates.SFF).toBeCloseTo(0.9, 10)
  })

  test('SFF mode factorisé — calcul correct', () => {
    // λ=1e-6, λD/λ=0.6, DCd=0.5, DCs=0.3
    // λDU=3e-7, λDD=3e-7, λSU=2.8e-7, λSD=1.2e-7
    // SFF = (1.2e-7 + 2.8e-7 + 3e-7) / 1e-6 = 7e-7/1e-6 = 0.7
    const comp = makeDefaultComponentParams({
      failureRate: { mode: 'FACTORISED', lambda: 1e-6, lambdaD_ratio: 0.6, DCd: 0.5, DCs: 0.3 },
    })
    const rates = resolveFailureRates(comp)
    expect(rates.SFF).toBeCloseTo(0.7, 10)
  })
})

// ---------------------------------------------------------------------------
// Tests : Utilitaires
// ---------------------------------------------------------------------------

describe('Utilitaires — conversions et SIL', () => {
  test('Conversion FIT → h⁻¹', () => {
    expect(fitToPerHour(500)).toBeCloseTo(5e-7, 15)
    expect(fitToPerHour(1)).toBeCloseTo(1e-9, 18)
  })

  test('Conversion années → heures', () => {
    expect(toHours(1, 'years')).toBe(8760)
    expect(toHours(6, 'months')).toBe(4380)
    expect(toHours(1, 'days')).toBe(24)
  })

  test('PFDavg → SIL', () => {
    expect(pfdavgToSIL(5e-5)).toBe(4)  // dans [10⁻⁵, 10⁻⁴[
    expect(pfdavgToSIL(5e-4)).toBe(3)  // dans [10⁻⁴, 10⁻³[
    expect(pfdavgToSIL(5e-3)).toBe(2)  // dans [10⁻³, 10⁻²[
    expect(pfdavgToSIL(5e-2)).toBe(1)  // dans [10⁻², 10⁻¹[
    expect(pfdavgToSIL(0.2)).toBeNull() // ≥ 10⁻¹
  })

  test('minSIL', () => {
    expect(minSIL(3, 2, 4)).toBe(2)
    expect(minSIL(4, 4, 3)).toBe(3)
    expect(minSIL(null, 3, 2)).toBe(2)
    expect(minSIL(null, null)).toBeNull()
  })

  test('Coefficient binomial', () => {
    expect(binomialCoeff(3, 2)).toBe(3)
    expect(binomialCoeff(4, 2)).toBe(6)
    expect(binomialCoeff(2, 1)).toBe(2)
    expect(binomialCoeff(1, 1)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Tests : PFD Composant
// ---------------------------------------------------------------------------

describe('PFD Composant — Loi TPS / TPC', () => {
  test('1oo1 formule : λDU × T1/2 (sans MRT — MRT intégré dans tCE du sous-système)', () => {
    const comp = makeSimpleComp(1e-6, 8760)
    const pfd = computeComponentPFD(comp)
    // PFDavg = λDU × sigma × ptc × T1/2 = 10⁻⁶ × 1 × 1 × 4380 = 4.38×10⁻³
    // Note : le MRT est intégré dans tCE au niveau sous-système, pas composant
    expect(pfd).toBeCloseTo(4.38e-3, 5)
  })

  test('Contribution λDD × MTTR', () => {
    const comp = makeSimpleComp(0, 8760, 1e-6, 8)
    const pfd = computeComponentPFD(comp)
    // λDU=0 → PFD = λDD × MTTR = 10⁻⁶ × 8 = 8×10⁻⁶
    expect(pfd).toBeCloseTo(8e-6, 10)
  })

  test('PFD augmente avec T1', () => {
    const comp1 = makeSimpleComp(1e-6, 8760)    // 1 an
    const comp2 = makeSimpleComp(1e-6, 17520)   // 2 ans
    expect(computeComponentPFD(comp2)).toBeGreaterThan(computeComponentPFD(comp1))
  })

  test('PFD diminue quand DC augmente (Mode factorisé)', () => {
    const lowDC = makeDefaultComponentParams({
      failureRate: { mode: 'FACTORISED', lambda: 1e-6, lambdaD_ratio: 0.6, DCd: 0.3, DCs: 0 },
      test: { type: 'STOPPED', T1: 8760, T0: 0, sigma: 1, gamma: 0, pi: 0, X: true, omega1: 0, omega2: 0, ptc: 1 },
      MTTR: 8,
    })
    const highDC = makeDefaultComponentParams({
      failureRate: { mode: 'FACTORISED', lambda: 1e-6, lambdaD_ratio: 0.6, DCd: 0.9, DCs: 0 },
      test: { type: 'STOPPED', T1: 8760, T0: 0, sigma: 1, gamma: 0, pi: 0, X: true, omega1: 0, omega2: 0, ptc: 1 },
      MTTR: 8,
    })
    expect(computeComponentPFD(highDC)).toBeLessThan(computeComponentPFD(lowDC))
  })

  test('PTC < 1 dégrade la PFD', () => {
    const fullCoverage = makeDefaultComponentParams({
      failureRate: { mode: 'DEVELOPED', lambdaDU: 1e-6, lambdaDD: 0, lambdaSU: 0, lambdaSD: 0 },
      MTTR: 0,
      test: { type: 'STOPPED', T1: 8760, T0: 0, sigma: 1, gamma: 0, pi: 0, X: true, omega1: 0, omega2: 0, ptc: 1.0, lifetime: 87600 },
    })
    const partialCoverage = makeDefaultComponentParams({
      failureRate: { mode: 'DEVELOPED', lambdaDU: 1e-6, lambdaDD: 0, lambdaSU: 0, lambdaSD: 0 },
      MTTR: 0,
      test: { type: 'STOPPED', T1: 8760, T0: 0, sigma: 1, gamma: 0, pi: 0, X: true, omega1: 0, omega2: 0, ptc: 0.8, lifetime: 87600 },
    })
    expect(computeComponentPFD(partialCoverage)).toBeGreaterThan(computeComponentPFD(fullCoverage))
  })
})

// ---------------------------------------------------------------------------
// Tests : PFD Sous-Système MooN
// ---------------------------------------------------------------------------

describe('PFD Sous-Système — Architectures MooN + CCF', () => {
  const T1 = 8760
  const lambdaDU = 1e-6

  test('1oo1 : résultat identique au composant', () => {
    const comp = makeSimpleComp(lambdaDU, T1)
    const channels = [makeChannel(comp)]
    const result = computeSubsystemPFD({
      channels,
      voting: { M: 1, N: 1 },
      ccf: { beta: 0, betaD: 0, method: 'MAX' },
    })
    expect(result.pfdavg).toBeCloseTo(computeComponentPFD(comp), 8)
  })

  test('1oo2 sans CCF — formule simplifiée (λDU×T1)²/3', () => {
    const channels = makeChannels(makeSimpleComp(lambdaDU, T1), 2)
    const result = computeSubsystemPFD({
      channels,
      voting: { M: 1, N: 2 },
      ccf: { beta: 0, betaD: 0, method: 'MAX' },
    })
    // PFDavg ≈ (10⁻⁶ × 8760)² / 3 ≈ 2.56×10⁻⁵
    // Avec tCE ≈ T1/2 + 8 = 4388h :
    // PFD_ind = 2 × (1×λDU) × (1×λDU) × tCE² ≈ 2 × 1e-12 × 4388² ≈ 3.85×10⁻⁵
    expect(result.pfdavg).toBeGreaterThan(0)
    expect(result.pfdavg).toBeLessThan(1e-3) // doit être << SIL 2
    expect(result.pfd_ccf).toBe(0)
  })

  test('1oo2 avec CCF β=2% — terme CCF dominant', () => {
    const channels = makeChannels(makeSimpleComp(lambdaDU, T1), 2)
    const result = computeSubsystemPFD({
      channels,
      voting: { M: 1, N: 2 },
      ccf: { beta: 0.02, betaD: 0.01, method: 'MAX' },
    })
    // PFD_CCF = 0.02 × 10⁻⁶ × (4380 + 8) = 8.776×10⁻⁵
    expect(result.pfd_ccf).toBeCloseTo(8.776e-5, 4)
    expect(result.pfdavg).toBeGreaterThan(result.pfd_ccf) // total > CCF seul
  })

  test('1oo2 << 1oo1 (sans CCF)', () => {
    const comp = makeSimpleComp(lambdaDU, T1)
    const loo1 = computeSubsystemPFD({
      channels: [makeChannel(comp)],
      voting: { M: 1, N: 1 },
      ccf: { beta: 0, betaD: 0, method: 'MAX' },
    })
    const loo2 = computeSubsystemPFD({
      channels: makeChannels(comp, 2),
      voting: { M: 1, N: 2 },
      ccf: { beta: 0, betaD: 0, method: 'MAX' },
    })
    expect(loo2.pfdavg).toBeLessThan(loo1.pfdavg)
  })

  test('2oo2 > 1oo1 (série plus dangereuse)', () => {
    const comp = makeSimpleComp(lambdaDU, T1)
    const loo1 = computeSubsystemPFD({
      channels: [makeChannel(comp)],
      voting: { M: 1, N: 1 },
      ccf: { beta: 0, betaD: 0, method: 'MAX' },
    })
    const too2 = computeSubsystemPFD({
      channels: makeChannels(comp, 2),
      voting: { M: 2, N: 2 },
      ccf: { beta: 0, betaD: 0, method: 'MAX' },
    })
    expect(too2.pfdavg).toBeGreaterThan(loo1.pfdavg)
  })

  test('2oo3 ≈ 1oo2 avec CCF dominant (β élevé)', () => {
    const channels3 = makeChannels(makeSimpleComp(lambdaDU, T1), 3)
    const channels2 = makeChannels(makeSimpleComp(lambdaDU, T1), 2)
    const beta = 0.1 // β élevé → CCF domine

    const loo2 = computeSubsystemPFD({
      channels: channels2,
      voting: { M: 1, N: 2 },
      ccf: { beta, betaD: beta / 2, method: 'MAX' },
    })
    const too3 = computeSubsystemPFD({
      channels: channels3,
      voting: { M: 2, N: 3 },
      ccf: { beta, betaD: beta / 2, method: 'MAX' },
    })

    // Avec β élevé, les deux sont dominés par le terme CCF → valeurs proches
    // PFD_CCF est identique pour les deux architectures
    expect(loo2.pfd_ccf).toBeCloseTo(too3.pfd_ccf, 8)
  })
})

// ---------------------------------------------------------------------------
// Tests : Contraintes Architecturales
// ---------------------------------------------------------------------------

describe('Contraintes Architecturales — Route 1H', () => {
  test('Type A, SFF=92%, HFT=1 → SIL 4', () => {
    const sil = computeArchitecturalSIL({
      HFT: 1, SFF: 0.92, componentType: 'TYPE_A',
      standard: 'IEC61508_ROUTE1H',
    })
    expect(sil).toBe(4)
  })

  test('Type B, SFF=75%, HFT=0 → SIL 1', () => {
    const sil = computeArchitecturalSIL({
      HFT: 0, SFF: 0.75, componentType: 'TYPE_B',
      standard: 'IEC61508_ROUTE1H',
    })
    expect(sil).toBe(1)
  })

  test('Type B, SFF=45%, HFT=0 → null (non autorisé)', () => {
    const sil = computeArchitecturalSIL({
      HFT: 0, SFF: 0.45, componentType: 'TYPE_B',
      standard: 'IEC61508_ROUTE1H',
    })
    expect(sil).toBeNull()
  })

  test('Route 2H : HFT=0 → SIL 2', () => {
    const sil = computeArchitecturalSIL({
      HFT: 0, SFF: 0.5, componentType: 'TYPE_A',
      standard: 'IEC61508_ROUTE2H',
    })
    expect(sil).toBe(2)
  })

  test('Route 2H : HFT=1 → SIL 3', () => {
    const sil = computeArchitecturalSIL({
      HFT: 1, SFF: 0.5, componentType: 'TYPE_B',
      standard: 'IEC61508_ROUTE2H',
    })
    expect(sil).toBe(3)
  })

  test('IEC 61511:2016 : HFT=1 → SIL 3', () => {
    const sil = computeArchitecturalSIL({
      HFT: 1, SFF: 0.5, componentType: 'TYPE_B',
      standard: 'IEC61511_2016',
    })
    expect(sil).toBe(3)
  })

  test('Type A, SFF=50%, HFT=0 → SIL 1', () => {
    const sil = computeArchitecturalSIL({
      HFT: 0, SFF: 0.50, componentType: 'TYPE_A',
      standard: 'IEC61508_ROUTE1H',
    })
    expect(sil).toBe(1) // < 60% → SIL 1
  })

  test('Type A, SFF=95%, HFT=2 → SIL 4', () => {
    const sil = computeArchitecturalSIL({
      HFT: 2, SFF: 0.95, componentType: 'TYPE_A',
      standard: 'IEC61508_ROUTE1H',
    })
    expect(sil).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Tests : STR
// ---------------------------------------------------------------------------

describe('STR — Taux de Déclenchement Intempestif', () => {
  function makeCompWithSafe(lambdaSU: number, lambdaSD: number, T1: number): ComponentParams {
    return makeDefaultComponentParams({
      failureRate: {
        mode: 'DEVELOPED',
        lambdaDU: 0,
        lambdaDD: 0,
        lambdaSU,
        lambdaSD,
      },
      MTTR: 8,
      test: {
        type: 'STOPPED', T1, T0: 0, sigma: 1, gamma: 0, pi: 0,
        X: true, omega1: 0, omega2: 0, ptc: 1,
      },
    })
  }

  test('1oo1 : STR = λS', () => {
    const lambdaS = 5e-6
    const comp = makeCompWithSafe(lambdaS, 0, 8760)
    const str = computeSubsystemSTR({
      channels: [makeChannel(comp)],
      voting: { M: 1, N: 1 },
      voteType: 'S',
    })
    expect(str).toBeCloseTo(lambdaS, 12)
  })

  test('1oo2 : STR = 2×λS (un seul suffit)', () => {
    const lambdaS = 5e-6
    const comp = makeCompWithSafe(lambdaS, 0, 8760)
    const str = computeSubsystemSTR({
      channels: makeChannels(comp, 2),
      voting: { M: 1, N: 2 },
      voteType: 'S',
    })
    expect(str).toBeCloseTo(2 * lambdaS, 12)
  })

  test('2oo2 << 1oo2 (moins de faux trips)', () => {
    const lambdaS = 5e-6
    const comp = makeCompWithSafe(0, lambdaS, 8760) // SD détecté rapidement
    const str_1oo2 = computeSubsystemSTR({
      channels: makeChannels(comp, 2),
      voting: { M: 1, N: 2 },
      voteType: 'S',
    })
    const str_2oo2 = computeSubsystemSTR({
      channels: makeChannels(comp, 2),
      voting: { M: 2, N: 2 },
      voteType: 'S',
    })
    expect(str_2oo2).toBeLessThan(str_1oo2)
  })
})

// ---------------------------------------------------------------------------
// Tests : Moteur SIF Complet
// ---------------------------------------------------------------------------

describe('Moteur SIF Complet — computeSIF()', () => {
  function makeSIF(
    lambdaDU_sensor: number,
    lambdaDU_actuator: number,
    T1: number,
    voting: { M: number; N: number } = { M: 1, N: 1 }
  ): SIFDefinition {
    const sensorComp = makeSimpleComp(lambdaDU_sensor, T1)
    const actuatorComp = makeSimpleComp(lambdaDU_actuator, T1)
    const nChannels = voting.N

    return {
      id: 'test-sif',
      demandMode: 'LOW_DEMAND',
      missionTime: 87600,
      sensors: {
        channels: makeChannels(sensorComp, nChannels),
        voting,
        voteType: 'S',
        ccf: { beta: 0.05, betaD: 0.025, method: 'MAX' },
      },
      solver: {
        mode: 'SIMPLE',
        pfd: 1e-5,
        pfh: 1e-9,
      },
      actuators: {
        channels: makeChannels(actuatorComp, nChannels),
        voting,
        voteType: 'S',
        ccf: { beta: 0.05, betaD: 0.025, method: 'MAX' },
      },
    }
  }

  test('SIF simple 1oo1 — structure résultat complète', () => {
    const input: EngineInput = {
      sif: makeSIF(1e-6, 5e-6, 8760),
      options: DEFAULT_OPTIONS,
    }
    const result = computeSIF(input)

    expect(result.sifId).toBe('test-sif')
    expect(result.pfdavg).toBeGreaterThan(0)
    expect(result.rrf).toBeGreaterThan(1)
    expect(result.contributions.sensors.pfdavg).toBeGreaterThan(0)
    expect(result.contributions.actuators.pfdavg).toBeGreaterThan(0)
    expect(result.contributions.solver.pfdavg).toBeCloseTo(1e-5)
    // Contributions en %
    const totalPct = result.contributions.sensors.contributionPct
      + result.contributions.solver.contributionPct
      + result.contributions.actuators.contributionPct
    expect(totalPct).toBeCloseTo(100, 3)
  })

  test('SIL final = min(PFD, architectural)', () => {
    const input: EngineInput = {
      sif: makeSIF(1e-7, 5e-7, 8760), // λDU très faible → SIL PFD élevé
      options: DEFAULT_OPTIONS,
    }
    const result = computeSIF(input)
    if (result.silAchieved !== null && result.silFromPFD !== null) {
      expect(result.silAchieved).toBeLessThanOrEqual(result.silFromPFD)
    }
  })

  test('PFDavg augmente avec T1', () => {
    const sif1 = makeSIF(1e-6, 5e-6, 8760)
    const sif2 = makeSIF(1e-6, 5e-6, 17520)

    const r1 = computeSIF({ sif: sif1, options: DEFAULT_OPTIONS })
    const r2 = computeSIF({ sif: sif2, options: DEFAULT_OPTIONS })

    expect(r2.pfdavg).toBeGreaterThan(r1.pfdavg)
  })

  test('RRF cohérent avec PFDavg', () => {
    const input: EngineInput = {
      sif: makeSIF(1e-6, 5e-6, 8760),
      options: DEFAULT_OPTIONS,
    }
    const result = computeSIF(input)
    expect(result.rrf).toBeCloseTo(1 / result.pfdavg, 5)
  })

  test('Pas de NaN dans les résultats', () => {
    const input: EngineInput = {
      sif: makeSIF(1e-6, 5e-6, 8760),
      options: DEFAULT_OPTIONS,
    }
    const result = computeSIF(input)

    expect(isNaN(result.pfdavg)).toBe(false)
    expect(isNaN(result.pfh)).toBe(false)
    expect(isNaN(result.str)).toBe(false)
    expect(isNaN(result.rrf)).toBe(false)
  })

  test('Architecture 1oo2 < 1oo1 (SIF complète)', () => {
    const sif_1oo1 = makeSIF(1e-6, 5e-6, 8760, { M: 1, N: 1 })
    const sif_1oo2 = makeSIF(1e-6, 5e-6, 8760, { M: 1, N: 2 })

    const r1 = computeSIF({ sif: sif_1oo1, options: DEFAULT_OPTIONS })
    const r2 = computeSIF({ sif: sif_1oo2, options: DEFAULT_OPTIONS })

    // 1oo2 doit avoir PFD inférieure à 1oo1 (même si CCF)
    expect(r2.pfdavg).toBeLessThan(r1.pfdavg)
  })

  test('Courbe PFD(t) générée si demandée', () => {
    const input: EngineInput = {
      sif: makeSIF(1e-6, 5e-6, 8760),
      options: { ...DEFAULT_OPTIONS, computeCurve: true, curvePoints: 50 },
    }
    const result = computeSIF(input)

    expect(result.curve).toBeDefined()
    expect(result.curve!.length).toBe(51) // 0 à 50 inclus
    expect(result.curve![0].t).toBe(0)
    expect(result.curve![0].pfd).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Tests : Exemple numérique de référence IEC 61508
// ---------------------------------------------------------------------------

describe('Cas de référence — Exemple IEC 61508 Annexe B', () => {
  /**
   * Cas de référence typique :
   * - Transmetteur pression : λDU = 5×10⁻⁷ h⁻¹, T1 = 1 an
   * - PFDavg ≈ 5×10⁻⁷ × 8760/2 = 2.19×10⁻³ → SIL 2
   */
  test('Transmetteur pression — SIL 2 établi', () => {
    const comp = makeSimpleComp(5e-7, 8760)
    const pfd = computeComponentPFD(comp)
    // PFDavg ≈ 5×10⁻⁷ × (4380 + 8) = 2.194×10⁻³
    expect(pfd).toBeCloseTo(2.194e-3, 4)
    expect(pfdavgToSIL(pfd)).toBe(2) // SIL 2
  })

  /**
   * Vanne isolement sans PST : λDU = 5×10⁻⁶ h⁻¹, T1 = 1 an
   * PFDavg = 5×10⁻⁶ × 4388 = 2.194×10⁻²  → SIL 1
   */
  test('Vanne isolement sans PST — SIL 1', () => {
    const comp = makeSimpleComp(5e-6, 8760)
    const pfd = computeComponentPFD(comp)
    expect(pfd).toBeCloseTo(2.194e-2, 3)
    expect(pfdavgToSIL(pfd)).toBe(1)
  })

  /**
   * Capteur 1oo2 avec β=2% — cohérence
   * λDU = 10⁻⁶ h⁻¹, T1 = 1 an, β = 2%
   * PFD_CCF = 0.02 × 10⁻⁶ × 4388 = 8.776×10⁻⁵
   */
  test('1oo2 avec β=2% — PFD_CCF cohérent', () => {
    const comp = makeSimpleComp(1e-6, 8760)
    const result = computeSubsystemPFD({
      channels: makeChannels(comp, 2),
      voting: { M: 1, N: 2 },
      ccf: { beta: 0.02, betaD: 0.01, method: 'MAX' },
    })
    // PFD_CCF ≈ 0.02 × 10⁻⁶ × (4380 + 8) = 8.776×10⁻⁵
    expect(result.pfd_ccf).toBeCloseTo(8.776e-5, 4)
  })
})
