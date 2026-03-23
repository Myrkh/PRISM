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
      hint: 'Langue et apparence',
    },
    workspace: {
      label: 'Workspace',
      hint: 'Panneaux et largeurs',
    },
    engine: {
      label: 'Engine',
      hint: 'Tolérance de comparaison',
    },
    shortcuts: {
      label: 'Raccourcis clavier',
      hint: 'Personnaliser les raccourcis',
    },
  },
  general: {
    language: {
      label: 'Langue de l’interface',
      hint: 'Choisit la langue de l’interface.',
      fr: 'Français',
      en: 'Anglais',
    },
    theme: {
      label: 'Thème',
      hint: 'Choisit le thème de l’application.',
      dark: 'Sombre',
      light: 'Clair',
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
  },
  engine: {
    tolerance: {
      label: 'Tolérance de comparaison',
      hint: 'Seuil d’écart avant alerte de mismatch.',
      unit: '%',
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
