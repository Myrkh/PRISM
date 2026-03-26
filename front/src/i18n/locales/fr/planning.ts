import type { PlanningStrings } from '@/i18n/planning'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const planningStringsFr: PlanningStrings = {
  localeTag: 'fr-FR',
  months: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ],
  dayNamesShort: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  viewLabels: {
    month: 'Mois',
    agenda: 'Agenda',
  },
  statusLabels: {
    planned: 'Planifiée',
    in_progress: 'En cours',
    completed: 'Terminée',
    overdue: 'En retard',
  },
  runtime: {
    formatDate,
    defaultCampaignOnDate: dateLabel => `Campagne ${dateLabel}`,
    defaultCampaignWithTeam: team => `Campagne — ${team}`,
  },
  workspace: {
    today: "Aujourd'hui",
    overdueCount: count => `${count} échéance${count > 1 ? 's' : ''} dépassée${count > 1 ? 's' : ''}`,
    createButton: 'Campagne',
    emptyAgenda: 'Aucune campagne planifiée',
    otherItems: count => `+${count} autre${count > 1 ? 's' : ''}`,
  },
  sidebar: {
    title: 'Planning',
    newCampaign: 'Nouvelle campagne',
    statusesTitle: 'Statuts',
    projectTitle: 'Projet',
    allProjects: 'Tous les projets',
    deadlinesTitle: 'Échéances T1',
    overdueByDays: days => `En retard de ${days}j`,
    dueInDays: days => `Dans ${days}j`,
  },
  rightPanel: {
    sectionLabel: 'Campagne',
    period: 'Période',
    progress: 'Progression',
    remaining: count => `${count} restante${count > 1 ? 's' : ''}`,
    team: 'Équipe',
    testedSifs: 'SIFs testées',
    notes: 'Notes',
    verdicts: {
      pass: 'OK',
      conditional: 'Cond.',
      fail: 'NOK',
    },
    empty: {
      title: 'Sélectionnez une campagne',
      description: 'ou cliquez sur un jour pour en planifier une nouvelle',
    },
    form: {
      title: 'Titre',
      titlePlaceholder: 'ex: Arrêt T2 2025 — Unité HP',
      start: 'Début',
      end: 'Fin',
      project: 'Projet',
      sifs: 'SIFs concernées',
      noSifAvailable: 'Aucune SIF active avec procédure de proof test disponible dans ce projet.',
      team: 'Équipe',
      memberPlaceholder: 'Prénom Nom',
      notes: 'Notes',
      notesPlaceholder: 'Permis de feu requis, accès restreint…',
      cancel: 'Annuler',
      create: 'Créer',
      creating: 'Création…',
      selectProject: 'Sélectionner un projet',
      noProjectAvailable: 'Aucun projet disponible',
    },
  },
}
