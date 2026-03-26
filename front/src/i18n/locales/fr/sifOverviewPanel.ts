import type { SifOverviewPanelStrings } from '@/i18n/sifOverviewPanel'

export const sifOverviewPanelStringsFr: SifOverviewPanelStrings = {
  currentSif: 'SIF courante',
  untitledSif: 'SIF sans titre',
  result: {
    label: 'Résultat',
    onTarget: 'Dans la cible',
    belowTarget: 'Sous la cible',
  },
  sections: {
    snapshot: 'Snapshot',
    actions: 'Actions',
    context: 'Contexte',
  },
  hero: {
    title: 'Confiance en exploitation',
    description: 'Vue condensée de la tenue calcul, exploitation et gouvernance de la SIF.',
  },
  reading: {
    title: 'Lecture',
    targetSil: 'SIL cible',
    achieved: 'SIL atteint',
    pfdavg: 'PFDavg',
    rrf: 'RRF',
    nextProofTest: 'Prochain proof test',
    notScheduled: 'Non planifié',
    traceability: 'Traçabilité',
  },
  governance: {
    title: 'Snapshot gouvernance',
    metadataReady: 'Métadonnées prêtes',
    metadataDetail: count => `${count} champ${count > 1 ? 's' : ''} encore manquant${count > 1 ? 's' : ''}`,
    evidencePackage: 'Dossier de preuves',
    evidenceDetail: 'Éléments de preuve complétés',
    assumptionsReviewed: 'Hypothèses revues',
    assumptionsDetail: count => `${count} en revue`,
    approvalChain: 'Chaîne d’approbation',
    approvalDetail: 'Établi / Vérifié / Approuvé',
  },
  contextSections: {
    identification: 'Identification',
    accountability: 'Responsabilités',
  },
  rows: {
    demandRate: 'Taux de sollicitation',
    requiredRrf: 'RRF requis',
    scenarioId: 'ID scénario',
    hazopNode: 'Nœud HAZOP',
    lopaRef: 'Réf. LOPA',
    notAvailable: '—',
  },
}
