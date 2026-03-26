import type { AppLocale } from './types'
import { sifWorkflowStringsEn } from './locales/en/sifWorkflow'
import { sifWorkflowStringsFr } from './locales/fr/sifWorkflow'

export type SifWorkflowStepId = 'hazard' | 'allocation' | 'srs' | 'design' | 'validation' | 'operation'

export interface SifWorkflowStrings {
  localeTag: string
  lifecycleCockpit: {
    badge: string
    untitled: string
    fallbackProcessTag: string
    empty: {
      title: string
      description: string
      newProject: string
      firstSif: string
    }
    header: {
      project: string
      newSif: string
      open: string
    }
    steps: Record<SifWorkflowStepId, {
      label: string
      shortLabel: string
      description: string
      destination: string
    }>
    hints: {
      hazardDone: string
      hazardMissing: string
      allocationDone: (targetSil: number) => string
      allocationMissing: string
      srsDone: (processTag: string) => string
      srsMissing: string
      designDone: string
      designMissing: string
      validationDone: (sil: number) => string
      validationMissing: (sil: number, targetSil: number) => string
      operationDone: string
      operationMissing: string
    }
    verdict: {
      title: string
      target: (targetSil: number) => string
      pfdavg: string
      rrf: string
    }
    progress: {
      title: string
    }
    information: {
      title: string
      project: string
      standard: string
      status: string
      revision: string
      components: string
      emptyRevision: string
    }
  }
  cockpitRightPanel: {
    statuses: Record<'complete' | 'review' | 'missing', string>
    sections: {
      state: string
      governance: string
      dossier: string
    }
    intros: {
      state: string
      dossier: string
      history: string
    }
    stateCards: {
      readiness: string
      calculation: string
      trace: string
      evidence: string
      approvals: string
      assumptions: string
      met: string
      belowTarget: string
      coherentBase: string
      reworkBase: string
      revisionPublished: (revision: string | number) => string
      revisionWorking: (revision: string | number) => string
    }
    governance: {
      author: string
      verification: string
      approval: string
      notProvided: string
    }
    dossier: {
      proofProcedure: string
      procedureUndocumented: string
      campaignsRecorded: string
      noCampaign: string
      reportPackage: string
      toComplete: string
      references: {
        scenarioId: string
        hazopNode: string
        lopaRef: string
        proofTestRef: string
        revision: string
        publishedOn: (date: string) => string
        workingRevision: (revision: string | number) => string
      }
    }
  }
}

const SIF_WORKFLOW_STRINGS: Record<AppLocale, SifWorkflowStrings> = {
  fr: sifWorkflowStringsFr,
  en: sifWorkflowStringsEn,
}

export function getSifWorkflowStrings(locale: AppLocale): SifWorkflowStrings {
  return SIF_WORKFLOW_STRINGS[locale]
}
