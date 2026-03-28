import type { SettingsStrings } from '@/i18n/settings'

export const settingsStringsFr: SettingsStrings = {
  sidebarTitle: {
    app: 'Parametres PRISM',
    profile: 'Profil utilisateur',
  },
  scopeSwitcher: {
    backToSettings: 'Retour aux parametres PRISM',
    app: 'App',
    profile: 'Profil',
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
      export: {
        label: 'Export',
        hint: 'Entreprise, rapports et parametres PDF',
      },
      ai: {
        label: 'PRISM AI',
        hint: 'Comportement IA et preferences de contexte',
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
      copyId: 'Copier l\'identifiant',
      copied: 'Copie !',
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
    commandPalettePosition: {
      label: 'Position de la palette',
      hint: 'Ou apparait la palette quand on l\'invoque avec Cmd+K.',
      top: 'En haut',
      center: 'Centre',
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
  export: {
    companyName: {
      label: 'Nom de l\'entreprise',
      hint: 'Affiche dans l\'en-tete de tous les rapports PDF exportes.',
      placeholder: 'ex. Acme Ingenierie',
    },
    signatureText: {
      label: 'Pied de rapport',
      hint: 'Mention legale ou bloc de signature ajoute a chaque rapport PDF.',
      placeholder: 'ex. Prepare par l\'equipe Securite. Confidentiel.',
    },
  },
  ai: {
    responseLanguage: {
      label: 'Langue des reponses IA',
      hint: 'Langue utilisee par PRISM AI dans ses reponses. Auto suit la langue de l\'interface.',
      auto: 'Auto',
      fr: 'Francais',
      en: 'English',
    },
    autoAttachSif: {
      label: 'Joindre le contexte SIF auto.',
      hint: 'Inclut automatiquement les donnees de la SIF active dans chaque message IA.',
      on: 'Actif',
      off: 'Inactif',
    },
  },
  shortcuts: {
    searchPlaceholder: 'Filtrer par commande ou raccourci...',
    openJson: 'Ouvrir keybindings.json',
    openUserCommandsJson: 'Ouvrir userCommands.json',
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
      general: 'Général',
      layout: 'Disposition',
      navigation: 'Navigation',
    },
    sources: {
      default: 'Par defaut',
      user: 'Personnalise',
    },
    unbound: '-',
    conflict: (otherCommand: string) => `Conflit avec « ${otherCommand} »`,
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
