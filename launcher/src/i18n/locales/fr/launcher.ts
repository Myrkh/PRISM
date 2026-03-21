/**
 * src/i18n/locales/fr/launcher.ts — PRISM Launcher
 * Traductions françaises (langue par défaut).
 */

import type { LauncherStrings } from '../../launcher'

export const launcherStringsFr: LauncherStrings = {
  nav: {
    home:     'Accueil',
    library:  'Modules',
    updates:  'Updates',
    settings: 'Config',
  },

  topBar: {
    launch:     'Lancer',
    themeLight: 'Mode clair',
    themeDark:  'Mode sombre',
    minimize:   'Réduire',
    maximize:   'Agrandir',
    close:      'Fermer',
  },

  home: {
    recentlyOpened: 'Récemment ouverts',
    projects:       'projets',
    newProject:     'Nouveau projet',
    openInPrism:    'Les projets s\'ouvrent directement dans PRISM',
  },

  updates: {
    stateLabel:     'État',
    changelogLabel: 'Notes de version',
    // Sim switcher
    simUpToDate:    'À jour',
    simAvailable:   'Dispo',
    simUpdating:    'MAJ…',
    simDone:        'Fait',
    // Up-to-date card
    upToDateBadge:  'À jour',
    upToDateTitle:  'PRISM est à jour',
    upToDateBody:   'Version {version} — dernière version disponible.',
    checkNow:       'Vérifier maintenant',
    checking:       'Vérification…',
    // Checking card
    checkingBadge:  'Vérification',
    checkingTitle:  'Recherche de mises à jour…',
    checkingBody:   'Connexion aux serveurs PRISM',
    // Downloading / installing
    downloadingBadge:  'Téléchargement',
    installingBadge:   'Installation',
    inProgressTitle:   'Mise à jour en cours',
    // Done card
    doneBadge:      'Terminé',
    doneTitle:      'Installation terminée',
    doneBody:       'Redémarrez PRISM pour appliquer la mise à jour.',
    restartBtn:     'Redémarrer PRISM',
    // Available card
    availableBadge: 'Mise à jour disponible',
    availableTitle: 'PRISM {tag} disponible',
    currentVersion: 'Vous avez v{version}',
    updateNowBtn:   'Mettre à jour maintenant',
    scheduleBtn:    'Planifier pour plus tard',
    // Inline schedule picker
    pickerMonth:    'Mois',
    pickerDay:      'Jour',
    pickerHour:     'Heure',
    scheduleConfirm: 'Planifier — {month} {day} à {hour}',
    months: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    // Changelog
    installedBadge: 'INSTALLÉ',
    // Progress steps
    stepConnecting:  'Connexion à GitHub Releases…',
    stepDownloading: 'Téléchargement prism-desktop-win.zip…',
    stepVerifying:   'Vérification SHA-256…',
    stepExtracting:  'Extraction des fichiers…',
    stepFinalizing:  'Finalisation…',
  },

  library: {
    included:       'Modules inclus',
    modulesCount:   'modules',
    extensions:     'Extensions disponibles',
    roadmap:        'Roadmap',
    badgeNative:    'Natif',
    actionIncluded: 'Inclus',
    actionInstall:  'Installer',
    actionSoon:     'Bientôt disponible',
  },

  footer: {
    checking:  'Connexion…',
    engineOk:  'Moteur opérationnel',
    engineOff: 'Moteur hors ligne',
    copyright: '© 2025 PRISM Engineering',
    legal:     'Légal',
  },

  settings: {
    title:    'Configuration',
    subtitle: 'Paramètres du launcher PRISM Desktop',
    sections: {
      appearance: 'Apparence',
      backend:    'Connexion moteur',
      data:       'Données locales',
      about:      'À propos',
      danger:     'Zone de danger',
    },
    appearance: {
      theme:     'Thème',
      themeHint: 'Appliqué au launcher et à l\'application PRISM',
      dark:      'Sombre',
      light:     'Clair',
    },
    language: {
      label: 'Langue',
      hint:  'Langue de l\'interface du launcher',
      fr:    'Français',
      en:    'English',
    },
    backend: {
      url:            'URL du backend',
      urlHint:        'Serveur FastAPI local de PRISM Desktop',
      autoStart:      'Démarrage automatique',
      autoStartHint:  'Lance le moteur Python au démarrage du launcher',
      autoUpdate:     'Mises à jour auto',
      autoUpdateHint: 'Télécharge et installe silencieusement',
    },
    data: {
      sqlite:        'Base SQLite',
      sqliteHint:    'AppData\\Roaming\\PRISM\\prism.db',
      openBtn:       'Ouvrir',
      backup:        'Backup manuel',
      backupHint:    'Copie horodatée de la base de données',
      exportBtn:     'Exporter',
      telemetry:     'Télémétrie anonyme',
      telemetryHint: 'Aide à améliorer PRISM (aucune donnée SIF)',
    },
    about: {
      desktop:      'PRISM Desktop',
      launcher:     'Launcher',
      standard:     'Standard',
      standardHint: 'Safety Instrumented Functions',
      docs:         'Documentation',
      openBtn:      'Ouvrir',
      bug:          'Signaler un bug',
    },
    danger: {
      reset:     'Réinitialiser les préférences',
      resetHint: 'Restaure tous les paramètres par défaut',
      resetBtn:  'Réinitialiser',
    },
  },

  auth: {
    welcome:             'Bienvenue',
    createAccount:       'Créer un compte',
    loginSubtitle:       'Connectez-vous pour accéder à vos projets SIF.',
    signupSubtitle:      'Créez votre compte PRISM Desktop local.',
    namePlaceholder:     'Nom complet',
    emailPlaceholder:    'Adresse email',
    passwordPlaceholder: 'Mot de passe',
    confirmPlaceholder:  'Confirmer le mot de passe',
    loginBtn:            'Se connecter',
    signupBtn:           'Créer le compte',
    noAccount:           'Pas encore de compte ?',
    hasAccount:          'Déjà un compte ?',
    createLink:          'Créer un compte',
    loginLink:           'Se connecter',
    localData:           'Données stockées localement',
  },

  account: {
    title:        'Mon compte',
    tabProfile:   'Profil',
    tabSecurity:  'Sécurité',
    avatarColor:  'Couleur de l\'avatar',
    fullName:     'Nom complet',
    email:        'Adresse email',
    emailHint:    'L\'email est lié au compte backend et ne peut pas être modifié ici.',
    plan:         'PRISM Desktop',
    planDetail:   'Licence locale · IEC 61511 · SIL 1–4',
    saveBtn:      'Enregistrer',
    saved:        'Enregistré',
    currentPwd:   'Mot de passe actuel',
    newPwd:       'Nouveau mot de passe',
    confirmPwd:   'Confirmer',
    changePwdBtn: 'Changer le mot de passe',
    pwdUpdated:   'Mot de passe mis à jour',
    pwdMismatch:  'Les mots de passe ne correspondent pas.',
    pwdTooShort:  'Minimum 8 caractères.',
    strength: {
      tooShort:   'Trop court',
      weak:       'Faible',
      medium:     'Moyen',
      strong:     'Fort',
      veryStrong: 'Très fort',
    },
  },

  userCard: {
    myAccount: 'Mon compte',
    logout:    'Déconnexion',
  },
}
