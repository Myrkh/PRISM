import type { SettingsStrings } from '@/i18n/settings'

export const settingsStringsFr: SettingsStrings = {
  sidebarTitle: 'Paramètres',
  confirmExit: {
    title: 'Quitter les paramètres ?',
    message: 'Les modifications non enregistrées seront perdues.',
    cancel: 'Rester',
    confirm: 'Quitter',
  },
  sections: {
    general: {
      label: 'Général',
      hint: 'Langue, apparence & démarrage',
    },
    workspace: {
      label: 'Workspace',
      hint: 'Panneaux, largeurs & export',
    },
    engine: {
      label: 'Engine',
      hint: 'Calculs & valeurs SIF par défaut',
    },
    shortcuts: {
      label: 'Raccourcis clavier',
      hint: 'Personnaliser les raccourcis',
    },
  },
  general: {
    language: {
      label: "Langue de l'interface",
      hint: "Choisit la langue de l'interface.",
      fr: 'Français',
      en: 'Anglais',
    },
    theme: {
      label: 'Thème',
      hint: "Choisit le thème de l'application.",
      dark: 'Sombre',
      light: 'Clair',
    },
    landingView: {
      label: "Écran d'accueil par défaut",
      hint: "Écran affiché au démarrage de l'application.",
      views: {
        projects: 'Projets',
        library: 'Bibliothèque',
        engine: 'Engine',
        'audit-log': 'Audit Log',
        planning: 'Planning tests',
        hazop: 'HAZOP / LOPA',
      },
    },
  },
  workspace: {
    unit: 'px',
    leftPanel: {
      label: 'Largeur du panneau gauche',
      hint: (min, max) => `Largeur par défaut du panneau gauche. ${min} à ${max}px.`,
    },
    rightPanel: {
      label: 'Largeur du panneau droit',
      hint: (min, max) => `Largeur par défaut du panneau droit. ${min} à ${max}px.`,
    },
    rightPanelDefaultState: {
      label: 'Sections des volets au démarrage',
      hint: "État par défaut des sections accordéon lors de la première ouverture d'un volet.",
      open: 'Ouvert',
      closed: 'Fermé',
    },
    pdfPageSize: {
      label: 'Format PDF',
      hint: "Format de page utilisé lors de l'export des rapports SIL.",
      a4: 'A4',
      letter: 'Letter',
    },
  },
  engine: {
    tolerance: {
      label: 'Tolérance de comparaison',
      hint: "Seuil d'écart avant alerte de mismatch.",
      unit: '%',
    },
    scientificNotation: {
      label: 'Notation scientifique',
      hint: 'Affiche les valeurs PFD/λ en notation scientifique (ex. 1,23e-4).',
    },
    decimalRounding: {
      label: 'Chiffres significatifs',
      hint: 'Nombre de chiffres affichés pour les valeurs numériques PFD/λ.',
      unit: 'chiffres',
    },
    defaultMissionTime: {
      label: 'Temps de mission par défaut (TH)',
      hint: 'Pré-rempli à la création d\'une SIF. Modifiable par SIF.',
      unit: 'h',
    },
    defaultProofTestInterval: {
      label: "Intervalle d'épreuve par défaut (TI)",
      hint: "Pré-rempli à la création d'une SIF. Modifiable par SIF.",
      unit: 'h',
    },
  },
  shortcuts: {
    searchPlaceholder: 'Filtrer par commande ou raccourci…',
    jsonToggle: 'Basculer en JSON',
    tableToggle: 'Basculer en tableau',
    resetAll: 'Réinitialiser tout',
    pressKey: 'Appuyer sur un raccourci…',
    pressKeyCancel: 'Échap pour annuler',
    reset: 'Réinitialiser',
    columns: {
      command: 'Commande',
      keybinding: 'Raccourci',
      when: 'Contexte',
      source: 'Source',
    },
    categories: {
      palette: 'Palette de commandes',
      layout: 'Disposition',
      navigation: 'Navigation',
    },
    sources: {
      default: 'Par défaut',
      user: 'Personnalisé',
    },
    unbound: '—',
    jsonHint: 'Seuls vos raccourcis personnalisés sont affichés ici. Modifiez-les directement dans le tableau.',
  },
  footer: {
    dirty: 'Modifications non enregistrées',
    saved: 'Préférences enregistrées pour cet appareil',
    esc: 'Esc pour quitter',
  },
  actions: {
    discard: 'Annuler',
    draftDefaults: 'Revenir aux valeurs par défaut',
    save: 'Enregistrer',
  },
}
