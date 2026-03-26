import type { AuditStrings } from '@/i18n/audit'

export const auditStringsFr: AuditStrings = {
  localeTag: 'fr-FR',
  kinds: {
    governance: 'Gouvernance',
    'proof-tests': 'Test de preuve',
    operations: 'Opérations',
    engine: 'Engine',
  },
  engineSubKinds: {
    manual: 'Exécution',
    compare: 'Comparaison',
    batch: 'Lot',
  },
  scopes: {
    all: {
      label: 'Tous les événements',
      hint: 'Vue complète du journal de traçabilité',
    },
    warnings: {
      label: 'Alertes',
      hint: 'Événements qui demandent une lecture prioritaire',
    },
    governance: {
      label: 'Gouvernance',
      hint: 'Création et statut des dossiers',
    },
    'proof-tests': {
      label: 'Tests de preuve',
      hint: 'Campagnes et verdicts d\'exploitation',
    },
    operations: {
      label: 'Opérations',
      hint: 'Incidents et événements observés sur le terrain',
    },
    engine: {
      label: 'Calculs Engine',
      hint: 'Calculs backend et comparaisons TS / Python',
    },
  },
  header: {
    eyebrow: 'Traçabilité active',
    title: 'Audit Log',
    description: 'Lecture transverse des événements utiles du workspace, des dossiers actifs jusqu\'aux calculs Engine.',
    visible: count => `${count} visible${count > 1 ? 's' : ''}`,
    warnings: count => `${count} alerte${count > 1 ? 's' : ''} dans le périmètre`,
    statVisibleLabel: 'événements',
    statWarningsLabel: 'alertes',
  },
  toolbar: {
    sortDesc: 'Plus récent en premier',
    sortAsc: 'Plus ancien en premier',
  },
  search: {
    placeholder: 'Rechercher un projet, une SIF, une action ou un détail…',
    filtered: (count, total) => `${count} résultats sur ${total}`,
    visibleTotal: count => `${count} événements visibles`,
  },
  sidebar: {
    title: 'Journal d\'audit',
    summaryLoading: 'Synchronisation des calculs Engine en cours…',
    summaryProjectFiltered: count => `${count} événement${count > 1 ? 's' : ''} dans le projet filtré`,
    summaryDefault: count => `${count} événements reconstruits depuis les dossiers actifs et les calculs backend`,
    reset: 'Réinitialiser',
    scopeTitle: 'Portée',
    projectsTitle: 'Projets',
    allProjectsLabel: 'Tous les projets',
    allProjectsHint: 'Lecture transverse sans restriction',
    quickReadTitle: 'Lecture rapide',
    warningsSummary: count => `${count} événement${count > 1 ? 's' : ''} d'alerte dans le périmètre courant`,
    usage: 'Utilise la recherche du panneau central pour retrouver un projet, une SIF, une action ou un calcul Engine.',
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
    contextEmpty: 'Le contexte projet et la vue liée apparaîtront ici dès qu\'une ligne sera sélectionnée.',
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
    date: 'Date',
    event: 'Événement',
    context: 'Contexte',
  },
  badges: {
    warning: 'Alerte',
    info: 'Info',
  },
  empty: {
    title: 'Aucun événement visible',
    loadingDescription: 'Le journal charge encore les calculs Engine. Réessaie dans un instant.',
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
    sifDate: {
      action: 'Enregistrement SIF mis à jour',
      details: 'La date du dossier SIF a été confirmée ou ajustée.',
    },
    sifStatus: {
      action: status => `Statut SIF : ${status}`,
      details: status => `Transition du dossier vers ${status}.`,
    },
    campaign: {
      action: verdict => `Campagne de test de preuve (${verdict})`,
      defaultDetails: 'Campagne enregistrée.',
    },
    event: {
      action: type => `Événement terrain : ${type}`,
      defaultDetails: 'Événement opérationnel enregistré.',
    },
    engine: {
      runLaunched: 'Calcul backend lancé',
      runDone: 'Calcul backend terminé',
      runFailed: 'Calcul backend échoué',
      compareLaunched: 'Comparaison TS / Python lancée',
      compareDone: 'Comparaison TS / Python terminée',
      compareFailed: 'Comparaison TS / Python échouée',
      batchLaunched: "Lancement d'un lot backend",
      batchDone: 'Lot backend terminé',
      batchFailed: 'Lot backend échoué',
      defaultError: 'Le backend a renvoyé une erreur pendant le calcul.',
      recordedRun: 'Calcul backend enregistré.',
      mode: mode => `Mode ${mode}`,
      sil: value => `SIL ${value}`,
      warnings: count => `${count} avertissement${count > 1 ? 's' : ''}`,
      runtime: ms => `${ms} ms`,
      version: version => `v${version}`,
    },
  },
}
