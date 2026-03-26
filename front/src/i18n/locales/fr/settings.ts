import type { SettingsStrings } from '@/i18n/settings'

export const settingsStringsFr: SettingsStrings = {
  sidebarTitle: {
    app: 'Parametres PRISM',
    profile: 'Profil utilisateur',
  },
  scopeSwitcher: {
    backToSettings: 'Retour aux parametres PRISM',
  },
  confirmExit: {
    title: 'Quitter les parametres ?',
    message: 'Les modifications non enregistrees seront perdues.',
    cancel: 'Rester',
    confirm: 'Quitter',
  },
  sections: {
    app: {
      general: {
        label: 'General',
        hint: 'Langue, apparence et demarrage',
      },
      workspace: {
        label: 'Workspace',
        hint: 'Panneaux, largeurs et export',
      },
      engine: {
        label: 'Engine',
        hint: 'Calculs et valeurs SIF par defaut',
      },
      shortcuts: {
        label: 'Raccourcis clavier',
        hint: 'Personnaliser les raccourcis',
      },
    },
    profile: {
      account: {
        label: 'Compte',
        hint: 'Identite, provider et profil synchro',
      },
      session: {
        label: 'Session',
        hint: 'Session active et deconnexion',
      },
    },
  },
  profileCard: {
    eyebrow: 'Profil PRISM',
    openProfile: 'Ouvrir le profil',
    profileActive: 'Profil actif',
    openHint: 'Identite, sessions et acces du compte',
    providerFallback: 'Provider inconnu',
    memberSince: 'Membre depuis',
    lastSignIn: 'Derniere connexion',
    editProfile: 'Edit profile',
    prismSettings: 'Parametres PRISM',
  },
  profile: {
    values: {
      active: 'Active',
      unavailable: 'Non disponible',
    },
    account: {
      heroTitle: 'Identite synchronisee depuis Supabase',
      heroDescription: 'Ce profil est derive de la session autentifiee et sert de point d entree pour les reglages utilisateur.',
      fullName: 'Nom complet',
      email: 'Adresse email',
      provider: 'Provider',
      userId: 'Identifiant utilisateur',
      profileUpdated: 'Derniere synchro profil',
    },
    session: {
      heroTitle: 'Session courante et securite de base',
      heroDescription: 'Vous gardez ici les informations de connexion utiles, sans surcharger les parametres PRISM.',
      currentSession: 'Etat de session',
      provider: 'Provider courant',
      lastSignIn: 'Derniere connexion',
      memberSince: 'Creation du compte',
      signOutTitle: 'Deconnexion',
      signOutHint: 'Ferme la session locale et revient a l ecran d authentification.',
      signOutAction: 'Se deconnecter',
      signingOut: 'Deconnexion...',
    },
  },
  general: {
    language: {
      label: 'Langue de l interface',
      hint: 'Choisit la langue de l interface.',
      fr: 'Francais',
      en: 'Anglais',
    },
    theme: {
      label: 'Theme',
      hint: 'Choisit le theme de l application.',
      dark: 'Sombre',
      light: 'Clair',
    },
    landingView: {
      label: 'Ecran d accueil par defaut',
      hint: 'Ecran affiche au demarrage de l application.',
      views: {
        projects: 'Projets',
        library: 'Bibliotheque',
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
      hint: (min, max) => `Largeur par defaut du panneau gauche. ${min} a ${max}px.`,
    },
    rightPanel: {
      label: 'Largeur du panneau droit',
      hint: (min, max) => `Largeur par defaut du panneau droit. ${min} a ${max}px.`,
    },
    rightPanelDefaultState: {
      label: 'Sections des volets au demarrage',
      hint: 'Etat par defaut des sections accordeeon lors de la premiere ouverture d un volet.',
      open: 'Ouvert',
      closed: 'Ferme',
    },
    workflowBreadcrumb: {
      label: 'Barre de navigation workflow',
      hint: 'Affiche la barre cliquable sous le header dans le workflow SIF.',
      visible: 'Visible',
      hidden: 'Masquee',
    },
    pdfPageSize: {
      label: 'Format PDF',
      hint: 'Format de page utilise lors de l export des rapports SIL.',
      a4: 'A4',
      letter: 'Letter',
    },
  },
  engine: {
    tolerance: {
      label: 'Tolerance de comparaison',
      hint: 'Seuil d ecart avant alerte de mismatch.',
      unit: '%',
    },
    scientificNotation: {
      label: 'Notation scientifique',
      hint: 'Affiche les valeurs PFD/lambda en notation scientifique (ex. 1,23e-4).',
    },
    decimalRounding: {
      label: 'Chiffres significatifs',
      hint: 'Nombre de chiffres affiches pour les valeurs numeriques PFD/lambda.',
      unit: 'chiffres',
    },
    defaultMissionTime: {
      label: 'Temps de mission par defaut (TH)',
      hint: 'Pre-rempli a la creation d une SIF. Modifiable par SIF.',
      unit: 'h',
    },
    defaultProofTestInterval: {
      label: 'Intervalle d epreuve par defaut (TI)',
      hint: 'Pre-rempli a la creation d une SIF. Modifiable par SIF.',
      unit: 'h',
    },
  },
  shortcuts: {
    searchPlaceholder: 'Filtrer par commande ou raccourci...',
    jsonToggle: 'Basculer en JSON',
    tableToggle: 'Basculer en tableau',
    resetAll: 'Reinitialiser tout',
    pressKey: 'Appuyer sur un raccourci...',
    pressKeyCancel: 'Echap pour annuler',
    reset: 'Reinitialiser',
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
      default: 'Par defaut',
      user: 'Personnalise',
    },
    unbound: '-',
    jsonHint: 'Seuls vos raccourcis personnalises sont affiches ici. Modifiez-les directement dans le tableau.',
  },
  footer: {
    dirty: 'Modifications non enregistrees',
    saved: 'Preferences enregistrees pour cet appareil',
    esc: 'Esc pour quitter',
  },
  actions: {
    discard: 'Annuler',
    draftDefaults: 'Revenir aux valeurs par defaut',
    save: 'Enregistrer',
  },
}
