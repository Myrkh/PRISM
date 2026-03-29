/**
 * engine/lopa/iefLibrary.ts — PRISM
 *
 * Reference database of Initiating Event Frequencies (IEF) for LOPA.
 * Sources: CCPS "Layer of Protection Analysis" (2001), OREDA 2015,
 *          HSE UK "Failure Rate and Event Data for use within Risk Assessments" (2012),
 *          AIChE DIPPR, IEC 61511-3 Annex B.
 *
 * IEF unit: per year [yr⁻¹] unless noted.
 */

export type IEFCategory =
  | 'process_equipment'
  | 'control_instrumentation'
  | 'mechanical_integrity'
  | 'human_error'
  | 'external_event'
  | 'utility_failure'

export interface IEFLibraryEntry {
  id: string
  category: IEFCategory
  description: string
  iefMin: number
  iefTypical: number
  iefMax: number
  unit: string        // always 'yr⁻¹' unless noted per-demand
  source: string
  conditions: string
  tags: string[]      // for search
}

export const IEF_CATEGORY_LABELS: Record<IEFCategory, string> = {
  process_equipment:        'Équipements procédé',
  control_instrumentation:  'Contrôle-commande / instrumentation',
  mechanical_integrity:     'Intégrité mécanique',
  human_error:              'Erreur humaine',
  external_event:           'Événements externes',
  utility_failure:          'Défaillance utilités',
}

export const IEF_LIBRARY: IEFLibraryEntry[] = [
  // ── Process equipment ──────────────────────────────────────────────────────
  {
    id: 'ief-pump-seal',
    category: 'process_equipment',
    description: 'Défaillance joint de pompe centrifuge (fuite)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1',
    conditions: 'Joint mécanique simple. Réduire si double joint avec purge surveillée.',
    tags: ['pompe', 'pump', 'joint', 'seal', 'fuite', 'leak'],
  },
  {
    id: 'ief-pump-runaway',
    category: 'process_equipment',
    description: 'Démarrage intempestif de pompe (énergie résiduelle / commande erronée)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1',
    conditions: 'Pompe avec commande électrique et vanne d\'isolement amont.',
    tags: ['pompe', 'pump', 'démarrage', 'runaway'],
  },
  {
    id: 'ief-cv-fail-open',
    category: 'process_equipment',
    description: 'Vanne de régulation — blocage en position ouverte (fail-open)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1',
    conditions: 'Vanne pneumatique à fermeture de sécurité (air-to-close). OREDA = 0.1/yr médiane.',
    tags: ['vanne', 'valve', 'CV', 'fail-open', 'blocage'],
  },
  {
    id: 'ief-cv-fail-closed',
    category: 'process_equipment',
    description: 'Vanne de régulation — blocage en position fermée (fail-closed)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1',
    conditions: 'Vanne pneumatique à ouverture de sécurité (air-to-open).',
    tags: ['vanne', 'valve', 'CV', 'fail-closed', 'blocage'],
  },
  {
    id: 'ief-check-valve-fail-open',
    category: 'process_equipment',
    description: 'Clapet anti-retour — défaillance en position ouverte (backflow)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001',
    conditions: 'Clapet à battant ou à bille. Défaillance par usure ou colmatage.',
    tags: ['clapet', 'check valve', 'retour', 'backflow'],
  },
  {
    id: 'ief-level-controller',
    category: 'process_equipment',
    description: 'Défaillance contrôleur de niveau (débordement / désamorçage)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1',
    conditions: 'Contrôleur standard avec transmetteur DP ou ultrason. Hors boucle de régulation avancée.',
    tags: ['niveau', 'level', 'LIC', 'LT', 'débordement', 'overflow'],
  },
  {
    id: 'ief-pressure-controller',
    category: 'process_equipment',
    description: 'Défaillance contrôleur de pression (surpression ou dépression)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1',
    conditions: 'PIC standard avec transmetteur pression. Envisager les défaillances de capteur et de régulateur séparément si nécessaire.',
    tags: ['pression', 'pressure', 'PIC', 'PT', 'surpression', 'overpressure'],
  },
  {
    id: 'ief-temperature-controller',
    category: 'process_equipment',
    description: 'Défaillance contrôleur de température (emballement thermique)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001',
    conditions: 'TIC avec thermocouple ou PT100. Inclut dérive de capteur et défaillance de vanne de chauffe.',
    tags: ['température', 'temperature', 'TIC', 'TT', 'emballement', 'runaway'],
  },
  {
    id: 'ief-flow-controller',
    category: 'process_equipment',
    description: 'Défaillance contrôleur de débit (sur-débit ou sous-débit)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1',
    conditions: 'FIC standard avec débitmètre magnétique ou Coriolis.',
    tags: ['débit', 'flow', 'FIC', 'FT', 'sur-débit', 'sous-débit'],
  },
  {
    id: 'ief-heat-exchanger-tube-leak',
    category: 'process_equipment',
    description: 'Fuite tube échangeur de chaleur (contamination côté calandre)',
    iefMin: 1e-3, iefTypical: 1e-2, iefMax: 0.1,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, OREDA 2015',
    conditions: 'Échangeur tubulaire standard. Réduire pour échangeur à plaques soudées ou à haute intégrité.',
    tags: ['échangeur', 'heat exchanger', 'tube', 'fuite', 'leak'],
  },
  {
    id: 'ief-heat-exchanger-tube-rupture',
    category: 'process_equipment',
    description: 'Rupture tube échangeur de chaleur (choc thermique, corrosion sévère)',
    iefMin: 1e-4, iefTypical: 1e-3, iefMax: 1e-2,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001',
    conditions: 'Rupture complète d\'un tube. Applicable pour échangeurs non inspectés ou corrosion connue.',
    tags: ['échangeur', 'heat exchanger', 'rupture', 'tube'],
  },
  {
    id: 'ief-tank-overfill',
    category: 'process_equipment',
    description: 'Remplissage excessif de réservoir atmosphérique (débordement)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, UK HSE RR672',
    conditions: 'Réservoir avec remplissage batch. Fréquence par transfert × nombre de transferts/an. Réduire si remplissage automatique avec boucle de régulation.',
    tags: ['réservoir', 'tank', 'débordement', 'overfill', 'remplissage'],
  },
  {
    id: 'ief-compressor-failure',
    category: 'process_equipment',
    description: 'Démarrage intempestif / défaillance compresseur (surpression aval)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'OREDA 2015, Section 5',
    conditions: 'Compresseur centrifuge ou à pistons. Inclut défaillance de la vanne de by-pass anti-pompage.',
    tags: ['compresseur', 'compressor', 'surpression', 'overpressure'],
  },

  // ── Control & Instrumentation ──────────────────────────────────────────────
  {
    id: 'ief-bpcs-failure',
    category: 'control_instrumentation',
    description: 'Défaillance boucle BPCS (Basic Process Control System) — dérive ou blocage',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1 / IEC 61511-3 Annex B',
    conditions: 'Boucle BPCS complète (capteur + contrôleur + actionneur). Valeur standard CCPS = 0.1/yr.',
    tags: ['BPCS', 'DCS', 'PLC', 'boucle', 'régulation', 'control loop'],
  },
  {
    id: 'ief-transmitter-failure',
    category: 'control_instrumentation',
    description: 'Défaillance transmetteur de mesure (dérive, signal gelé, HS)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'OREDA 2015, CCPS LOPA 2001',
    conditions: 'Transmetteur 4-20 mA standard. Dérive détectable en ligne par cohérence de processus.',
    tags: ['transmetteur', 'transmitter', 'capteur', 'sensor', 'dérive'],
  },
  {
    id: 'ief-solenoid-valve-failure',
    category: 'control_instrumentation',
    description: 'Défaillance vanne solénoïde (blocage en position)',
    iefMin: 0.001, iefTypical: 0.01, iefMax: 0.1,
    unit: 'yr⁻¹',
    source: 'OREDA 2015, HSE UK 2012',
    conditions: 'Solénoïde 2 voies, pneumatique. Valeur à ajuster selon qualité de l\'air instrument et fréquence d\'opération.',
    tags: ['solénoïde', 'solenoid', 'vanne', 'valve', 'blocage'],
  },
  {
    id: 'ief-prv-inadvertent-open',
    category: 'control_instrumentation',
    description: 'Ouverture intempestive soupape de sécurité (PSV / PRV)',
    iefMin: 0.001, iefTypical: 0.01, iefMax: 0.1,
    unit: 'yr⁻¹',
    source: 'API RP 521, CCPS LOPA 2001',
    conditions: 'PSV à ressort, calibrée à ≥ 1.1× MAWP. Défaillance en ouverture par corrosion ou déréglage.',
    tags: ['PSV', 'PRV', 'soupape', 'relief', 'pressure relief', 'ouverture'],
  },

  // ── Mechanical Integrity ───────────────────────────────────────────────────
  {
    id: 'ief-pipe-small-leak',
    category: 'mechanical_integrity',
    description: 'Fuite petite brèche canalisation process (≤ 10 mm)',
    iefMin: 1e-4, iefTypical: 1e-3, iefMax: 0.1,
    unit: 'yr⁻¹ par 100 m',
    source: 'HSE UK RR672 (2008), ICI LUP',
    conditions: 'Tuyauterie acier carbone ou acier inox sans contrainte de corrosion particulière. Ajuster selon matériau et service.',
    tags: ['tuyauterie', 'pipe', 'fuite', 'leak', 'brèche'],
  },
  {
    id: 'ief-pipe-full-bore-rupture',
    category: 'mechanical_integrity',
    description: 'Rupture complète canalisation process (full-bore)',
    iefMin: 1e-6, iefTypical: 1e-5, iefMax: 1e-4,
    unit: 'yr⁻¹ par 100 m',
    source: 'HSE UK RR672 (2008), DNV GL',
    conditions: 'Rupture guillotine complète. Applicable uniquement si justifiée par analyse de contrainte ou historique corrosion.',
    tags: ['tuyauterie', 'pipe', 'rupture', 'full bore', 'guillotine'],
  },
  {
    id: 'ief-vessel-catastrophic',
    category: 'mechanical_integrity',
    description: 'Défaillance catastrophique appareil sous pression (éclatement)',
    iefMin: 1e-6, iefTypical: 1e-5, iefMax: 1e-4,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, HSE UK, PED/DESP',
    conditions: 'Appareil soumis à inspection périodique réglementaire. Réduire à 1e-6 si inspection renforcée et surveillance corrosion.',
    tags: ['appareil', 'vessel', 'éclatement', 'rupture', 'catastrophic'],
  },
  {
    id: 'ief-flange-leak',
    category: 'mechanical_integrity',
    description: 'Fuite bride / joint de tuyauterie',
    iefMin: 1e-3, iefTypical: 0.01, iefMax: 0.1,
    unit: 'yr⁻¹ par bride',
    source: 'CCPS LOPA 2001, OREDA',
    conditions: 'Bride ASME standard, joint spirométallique. Fréquence croissante avec la température et la pression de service.',
    tags: ['bride', 'flange', 'joint', 'gasket', 'fuite'],
  },
  {
    id: 'ief-loading-arm-failure',
    category: 'mechanical_integrity',
    description: 'Défaillance bras de chargement / déchargement (disconnexion accidentelle)',
    iefMin: 1e-3, iefTypical: 0.01, iefMax: 0.1,
    unit: 'yr⁻¹ par opération',
    source: 'CCPS LOPA 2001',
    conditions: 'Bras articulé ou flexible. Inclut départ prématuré du camion/wagon.',
    tags: ['chargement', 'loading', 'bras', 'arm', 'camion', 'truck'],
  },

  // ── Human Error ────────────────────────────────────────────────────────────
  {
    id: 'ief-operator-routine-error',
    category: 'human_error',
    description: 'Erreur opérateur — tâche de routine simple, opérateur entraîné',
    iefMin: 1e-3, iefTypical: 0.01, iefMax: 0.1,
    unit: 'yr⁻¹ par demande',
    source: 'CCPS LOPA 2001, THERP / NARA HEP',
    conditions: 'Tâche simple, procédure disponible et appliquée, opérateur formé et compétent. IEF annuelle = HEP × fréquence des demandes.',
    tags: ['opérateur', 'operator', 'erreur', 'human error', 'HEP', 'routine'],
  },
  {
    id: 'ief-operator-complex-error',
    category: 'human_error',
    description: 'Erreur opérateur — tâche complexe, conditions de stress ou d\'urgence',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 0.5,
    unit: 'yr⁻¹ par demande',
    source: 'CCPS LOPA 2001, THERP',
    conditions: 'Tâche non-routinière, pression temporelle, plusieurs étapes. Réduire avec simulations et exercices réguliers.',
    tags: ['opérateur', 'operator', 'erreur', 'human error', 'complexe', 'stress'],
  },
  {
    id: 'ief-operator-alarm-response',
    category: 'human_error',
    description: 'Non-réponse opérateur à alarme (oubli ou mauvaise priorité)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 0.5,
    unit: 'yr⁻¹ par demande',
    source: 'CCPS LOPA 2001, Bhopal investigation, HSE ALARM guidance',
    conditions: 'Applicable quand la charge d\'alarmes est élevée (>2 alarmes/10min). Améliorer avec rationalization d\'alarmes.',
    tags: ['alarme', 'alarm', 'opérateur', 'réponse', 'réactivité'],
  },
  {
    id: 'ief-maintenance-error',
    category: 'human_error',
    description: 'Erreur de maintenance — remontage incorrect ou purge non effectuée',
    iefMin: 0.001, iefTypical: 0.01, iefMax: 0.1,
    unit: 'yr⁻¹ par intervention',
    source: 'CCPS LOPA 2001, maintenance records',
    conditions: 'Intervention de maintenance périodique sur élément critique. Réduire avec check-list de démarrage et permis de travail.',
    tags: ['maintenance', 'montage', 'assemblage', 'assembly', 'erreur'],
  },
  {
    id: 'ief-operator-procedure-skip',
    category: 'human_error',
    description: 'Saut d\'étape de procédure lors d\'opération batch',
    iefMin: 0.001, iefTypical: 0.01, iefMax: 0.1,
    unit: 'yr⁻¹ par demande',
    source: 'CCPS LOPA 2001, THERP Table 20-22',
    conditions: 'Opération batch avec procédure séquentielle (batch sheet). HEP réduit si DCS guide les étapes.',
    tags: ['procédure', 'batch', 'séquence', 'étape', 'skip'],
  },

  // ── External Events ────────────────────────────────────────────────────────
  {
    id: 'ief-lightning-strike',
    category: 'external_event',
    description: 'Foudroiement installation non protégée',
    iefMin: 1e-4, iefTypical: 1e-3, iefMax: 0.01,
    unit: 'yr⁻¹',
    source: 'IEC 62305, UK HSE, données météo locales',
    conditions: 'Basé sur la densité locale de foudre (Nk) et la surface de l\'installation. Utiliser Keraunic number local. Réduire à 1e-4 avec paratonnerres conformes IEC 62305.',
    tags: ['foudre', 'lightning', 'foudroiement', 'strike', 'météo'],
  },
  {
    id: 'ief-vehicle-impact',
    category: 'external_event',
    description: 'Impact de véhicule sur équipement (accès véhicule possible)',
    iefMin: 1e-4, iefTypical: 1e-3, iefMax: 0.01,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, HSE RR672',
    conditions: 'Zone accessible aux véhicules lourds. Réduire à 1e-5 avec barrières de protection (bollards).',
    tags: ['véhicule', 'vehicle', 'impact', 'collision', 'forklift'],
  },
  {
    id: 'ief-external-fire',
    category: 'external_event',
    description: 'Feu externe provenant d\'une installation adjacente',
    iefMin: 1e-5, iefTypical: 1e-4, iefMax: 1e-3,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, API RP 505',
    conditions: 'Probabilité conditionnelle d\'impact sur l\'équipement cible si feu sur installation voisine. Dépend de la distance et des mesures de compartimentation.',
    tags: ['feu', 'fire', 'externe', 'external', 'incendie'],
  },
  {
    id: 'ief-seismic',
    category: 'external_event',
    description: 'Événement sismique (séisme)',
    iefMin: 1e-5, iefTypical: 1e-4, iefMax: 1e-3,
    unit: 'yr⁻¹',
    source: 'Zonage sismique local (Eurocode 8), HAZUS',
    conditions: 'Utiliser la fréquence de dépassement locale pour le niveau d\'accélération critique de l\'équipement. Très site-spécifique.',
    tags: ['séisme', 'seismic', 'earthquake', 'tremblement'],
  },

  // ── Utility Failure ────────────────────────────────────────────────────────
  {
    id: 'ief-instrument-air-failure',
    category: 'utility_failure',
    description: 'Défaillance alimentation air instrument (perte de pression)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, Table 4.1',
    conditions: 'Réseau air instrument sans redondance. Réduire à 0.01/yr avec réservoir tampon dimensionné ≥ 30 min.',
    tags: ['air instrument', 'instrument air', 'IA', 'pression', 'utilité'],
  },
  {
    id: 'ief-power-failure',
    category: 'utility_failure',
    description: 'Perte alimentation électrique (réseau principal, simple circuit)',
    iefMin: 0.1, iefTypical: 0.5, iefMax: 2.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, données réseau EDF/EN50160',
    conditions: 'Alimentation secteur simple (pas de redondance). Réduire à 0.01/yr avec alimentation secourue (ASI) ou groupe électrogène.',
    tags: ['électricité', 'power', 'alimentation', 'coupure', 'blackout'],
  },
  {
    id: 'ief-cooling-water-failure',
    category: 'utility_failure',
    description: 'Défaillance eau de refroidissement (perte débit ou pression)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, OREDA',
    conditions: 'Réseau eau de refroidissement à circuit ouvert, sans pompe de secours. Conséquence critique pour réacteur exothermique ou condenseur.',
    tags: ['eau de refroidissement', 'cooling water', 'CW', 'refroidissement'],
  },
  {
    id: 'ief-nitrogen-failure',
    category: 'utility_failure',
    description: 'Défaillance alimentation azote (inertage, pressurisation)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001',
    conditions: 'Alimentation azote en bouteilles ou réseau sans redondance. Critique pour réacteurs sensibles à l\'oxygène ou stockages sous inertage.',
    tags: ['azote', 'nitrogen', 'N2', 'inertage', 'inerting'],
  },
  {
    id: 'ief-steam-failure',
    category: 'utility_failure',
    description: 'Défaillance alimentation vapeur (chaudière ou réseau)',
    iefMin: 0.01, iefTypical: 0.1, iefMax: 1.0,
    unit: 'yr⁻¹',
    source: 'CCPS LOPA 2001, OREDA',
    conditions: 'Réseau vapeur sans traçage de secours. Conséquence critique pour procédés nécessitant une température minimale (solidification, viscosité).',
    tags: ['vapeur', 'steam', 'chaudière', 'boiler', 'chauffage'],
  },
]

// ─── Helper: search ────────────────────────────────────────────────────────────

export function searchIEFLibrary(query: string): IEFLibraryEntry[] {
  if (!query.trim()) return IEF_LIBRARY
  const q = query.toLowerCase()
  return IEF_LIBRARY.filter(e =>
    e.description.toLowerCase().includes(q)
    || e.tags.some(t => t.toLowerCase().includes(q))
    || e.conditions.toLowerCase().includes(q)
    || IEF_CATEGORY_LABELS[e.category].toLowerCase().includes(q),
  )
}

export function getIEFByCategory(category: IEFCategory): IEFLibraryEntry[] {
  return IEF_LIBRARY.filter(e => e.category === category)
}
