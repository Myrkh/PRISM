import type { AuditStrings } from '@/i18n/audit'

export const auditStringsFr: AuditStrings = {
  localeTag: 'fr-FR',
  kinds: {
    governance: 'Gouvernance',
    'proof-tests': 'Proof test',
    operations: 'Opérations',
    engine: 'Engine',
  },
  scopes: {
    all: {
      label: 'Tous les événements',
      hint: 'Vue complète du journal de traçabilité',
    },
    warnings: {
      label: 'Warnings',
      hint: 'Événements qui demandent une lecture prioritaire',
    },
    governance: {
      label: 'Gouvernance',
      hint: 'Création, mise à jour et statut des dossiers',
    },
    'proof-tests': {
      label: 'Proof tests',
      hint: 'Campagnes et verdicts d’exploitation',
    },
    operations: {
      label: 'Opérations',
      hint: 'Incidents et événements observés sur le terrain',
    },
    engine: {
      label: 'Engine runs',
      hint: 'Runs backend et compare TS / Python',
    },
  },
  header: {
    eyebrow: 'Traçabilité active',
    title: 'Audit Log',
    description: 'Lecture transverse des événements utiles du workspace, des dossiers actifs jusqu’aux runs Engine.',
    visible: count => `${count} visible${count > 1 ? 's' : ''}`,
    warnings: count => `${count} warning${count > 1 ? 's' : ''} dans le périmètre`,
  },
  search: {
    placeholder: 'Rechercher un projet, une SIF, une action ou un détail…',
    filtered: (count, total) => `${count} résultats sur ${total}`,
    visibleTotal: count => `${count} événements visibles`,
  },
  sidebar: {
    title: 'Journal d’audit',
    summaryLoading: 'Synchronisation des runs Engine en cours…',
    summaryProjectFiltered: count => `${count} événement${count > 1 ? 's' : ''} dans le projet filtré`,
    summaryDefault: count => `${count} événements reconstruits depuis les dossiers actifs et les runs backend`,
    reset: 'Réinitialiser',
    scopeTitle: 'Portée',
    projectsTitle: 'Projets',
    allProjectsLabel: 'Tous les projets',
    allProjectsHint: 'Lecture transverse sans restriction',
    quickReadTitle: 'Lecture rapide',
    warningsSummary: count => `${count} événement${count > 1 ? 's' : ''} warning dans le périmètre courant`,
    usage: 'Utilise la recherche du panneau central pour retrouver un projet, une SIF, une action ou un run Engine.',
  },
  rightPanel: {
    eventTab: 'Événement',
    selectionTitle: 'Sélection',
    selectionEmpty: 'Sélectionne un événement dans le journal pour inspecter son contexte et ouvrir la vue liée.',
    contextTitle: 'Contexte',
    contextDate: 'Date',
    contextProject: 'Projet',
    contextSif: 'SIF',
    contextActor: 'Acteur',
    contextLinkedView: 'Vue liée',
    contextEmpty: 'Le contexte projet et la vue liée apparaîtront ici dès qu’une ligne sera sélectionnée.',
    actionTitle: 'Action',
    openEngine: 'Ouvrir Engine',
    openSif: 'Ouvrir la SIF liée',
    actionEmpty: 'Cet événement ne pointe pas vers une vue navigable précise.',
  },
  row: {
    actorFallback: 'Système',
    linkedViewFallback: 'Contexte projet uniquement',
  },
  table: {
    level: 'Niveau',
    date: 'Date',
    event: 'Événement',
    context: 'Contexte',
  },
  badges: {
    warning: 'Warning',
    info: 'Info',
  },
  empty: {
    title: 'Aucun événement visible',
    loadingDescription: 'Le journal charge encore les runs Engine. Réessaie dans un instant.',
    resetDescription: 'Ajuste la portée dans le panneau gauche ou efface la recherche pour revenir au journal complet.',
  },
  model: {
    actors: {
      system: 'Système',
      unknownProject: 'Projet inconnu',
    },
    linkedViews: {
      project: 'Projet / dossier',
      cockpit: 'Cockpit',
      exploitation: 'Exploitation',
      engineHistory: 'Engine · Historique',
    },
    projectCreated: {
      action: 'Projet créé',
      details: projectName => `Le projet « ${projectName} » a été initialisé.`,
    },
    projectUpdated: {
      action: 'Projet mis à jour',
      details: projectName => `Les métadonnées du projet « ${projectName} » ont été modifiées.`,
    },
    sifDate: {
      action: 'Enregistrement SIF mis à jour',
      details: 'La date du dossier SIF a été confirmée ou ajustée.',
    },
    sifStatus: {
      action: status => `Statut SIF : ${status}`,
      details: status => `Transition du dossier vers ${status}.`,
    },
    campaign: {
      action: verdict => `Campagne de proof test (${verdict})`,
      defaultDetails: 'Campagne enregistrée.',
    },
    event: {
      action: type => `Événement terrain : ${type}`,
      defaultDetails: 'Événement opérationnel enregistré.',
    },
    engine: {
      runLaunched: 'Run backend lancé',
      runDone: 'Run backend terminé',
      runFailed: 'Run backend échoué',
      compareLaunched: 'Compare TS / Python lancé',
      compareDone: 'Compare TS / Python terminé',
      compareFailed: 'Compare TS / Python échoué',
      batchLaunched: 'Batch run backend lancé',
      batchDone: 'Batch run backend terminé',
      batchFailed: 'Batch run backend échoué',
      defaultError: 'Le backend a renvoyé une erreur pendant le calcul.',
      recordedRun: 'Run backend enregistré.',
      mode: mode => `Mode ${mode}`,
      sil: value => `SIL ${value}`,
      warnings: count => `${count} warning${count > 1 ? 's' : ''}`,
      runtime: ms => `${ms} ms`,
      version: version => `v${version}`,
    },
  },
}
