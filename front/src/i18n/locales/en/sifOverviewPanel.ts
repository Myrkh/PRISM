import type { SifOverviewPanelStrings } from '@/i18n/sifOverviewPanel'

export const sifOverviewPanelStringsEn: SifOverviewPanelStrings = {
  currentSif: 'Current SIF',
  untitledSif: 'Untitled SIF',
  result: {
    label: 'Result',
    onTarget: 'On target',
    belowTarget: 'Below target',
  },
  sections: {
    snapshot: 'Snapshot',
    actions: 'Actions',
    context: 'Context',
  },
  hero: {
    title: 'Operational confidence',
    description: 'Condensed view of how calculation, operations, and governance currently hold for the SIF.',
  },
  reading: {
    title: 'Reading',
    targetSil: 'Target SIL',
    achieved: 'Achieved',
    pfdavg: 'PFDavg',
    rrf: 'RRF',
    nextProofTest: 'Next proof test',
    notScheduled: 'Not scheduled',
    traceability: 'Traceability',
  },
  governance: {
    title: 'Governance snapshot',
    metadataReady: 'Metadata ready',
    metadataDetail: count => `${count} field${count === 1 ? '' : 's'} still missing`,
    evidencePackage: 'Evidence package',
    evidenceDetail: 'Completed evidence items',
    assumptionsReviewed: 'Assumptions reviewed',
    assumptionsDetail: count => `${count} pending review`,
    approvalChain: 'Approval chain',
    approvalDetail: 'Made / Verified / Approved',
  },
  contextSections: {
    identification: 'Identification',
    accountability: 'Accountability',
  },
  rows: {
    demandRate: 'Demand rate',
    requiredRrf: 'Required RRF',
    scenarioId: 'Scenario ID',
    hazopNode: 'HAZOP node',
    lopaRef: 'LOPA ref.',
    notAvailable: '—',
  },
}
