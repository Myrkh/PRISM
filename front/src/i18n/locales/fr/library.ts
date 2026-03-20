import type { LibraryStrings } from '@/i18n/library'

export const libraryStringsFr: LibraryStrings = {
  sourceScopeLabels: {
    all: 'Catalogue complet',
    builtin: 'Standards validés',
    project: 'Templates projet',
    user: 'Bibliothèque personnelle',
  },
  sourceMeta: {
    all: { label: 'Tout le catalogue', hint: 'Standards, projets et bibliothèque personnelle' },
    builtin: { label: 'Standards validés', hint: 'Catalogue lambda_db et base validée' },
    project: { label: 'Templates projet', hint: 'Composants propres à un ou plusieurs projets' },
    user: { label: 'Bibliothèque personnelle', hint: 'Mes templates réutilisables et imports privés' },
  },
  subsystemHints: {
    sensor: 'Transmetteurs, capteurs et switches utilisés dans les chaînes instrumentées.',
    logic: 'Solveurs logiques, automates de sécurité et relais associés.',
    actuator: 'Éléments finaux, vannes, positionneurs et accessoires de coupure.',
  },
  header: {
    eyebrow: 'Bibliothèque maître',
    title: 'Gérer les composants réutilisables',
    description: 'Une seule source pour les standards validés, les templates projet et la bibliothèque personnelle.',
    filteredCount: count => `${count} résultats filtrés`,
    availableCount: count => `${count} templates disponibles`,
  },
  searchPlaceholder: 'Ex. Rosemount, switch niveau, Safety PLC, SOV, positionneur…',
  ctas: {
    newSensor: 'Nouveau capteur',
    newLogic: 'Nouvelle logique',
    newActuator: 'Nouvel actionneur',
    import: 'Importer',
    importModel: 'Modèle JSON',
    export: 'Exporter',
    reload: 'Recharger',
    importModelTitle: 'Télécharger un JSON modèle compatible import',
    exportTitle: 'Exporter les templates visibles',
    reloadTitle: 'Recharger la bibliothèque',
    createTitle: typeLabel => `Créer un template ${typeLabel.toLowerCase()}`,
  },
  importTarget: (projectLabel, libraryLabel) => projectLabel
    ? `Import vers ${projectLabel}${libraryLabel ? ` · ${libraryLabel}` : ''}`
    : `Import vers ma bibliothèque${libraryLabel ? ` · ${libraryLabel}` : ''}`,
  chips: {
    validatedStandards: count => `${count} standards validés`,
    projectTemplates: count => `${count} templates projet`,
    personalTemplates: count => `${count} templates personnels`,
  },
  status: {
    noSelection: 'Aucune entrée sélectionnée pour import.',
    imported: (count, created, updated) => `${count} template(s) importé(s) · ${created} créé(s) · ${updated} mis à jour.`,
    exported: count => `${count} template(s) exporté(s).`,
    importModelDownloaded: 'Modèle JSON téléchargé.',
    archived: 'Template archivé.',
    deleted: 'Template supprimé.',
  },
  family: {
    templateCount: count => `${count} template${count > 1 ? 's' : ''}`,
    partLabel: {
      sensor: 'Partie capteurs',
      logic: 'Partie logique',
      actuator: 'Partie actionneurs',
    },
    empty: 'Aucun template ne correspond aux filtres actifs pour cette famille.',
    showMore: 'Charger plus',
    showLess: 'Voir moins',
  },
  sidebar: {
    title: 'Bibliothèque maître',
    summary: (query, totalVisible, totalIndexed) => query
      ? `${totalVisible} résultat${totalVisible > 1 ? 's' : ''} pour « ${query} »`
      : `${totalIndexed} templates disponibles dans le catalogue global`,
    reset: 'Réinitialiser',
    originTitle: 'Origine',
    familiesTitle: 'Familles',
    allFamiliesLabel: 'Toutes les familles',
    allFamiliesHint: 'Capteurs, logique et actionneurs',
    namedLibrariesTitle: 'Bibliothèques',
    allLibrariesLabel: 'Toutes les bibliothèques',
    allLibrariesHint: 'Bibliothèques nommées perso et projet',
    noNamedLibraries: 'Aucune bibliothèque nommée pour les filtres actifs. Crée-en une depuis le panneau droit pour séparer tes références client, site ou standard interne.',
    projectsTitle: 'Projets',
    allProjectsLabel: 'Tous les projets',
    allProjectsHint: 'Les standards et la bibliothèque perso restent visibles',
    usageTitle: 'Usage',
    usagePrimary: 'La bibliothèque maître sert à gérer les standards, les templates projet et les références personnelles.',
    usageSecondary: 'Recherche par type, fabricant, référence, bibliothèque nommée ou source pour retrouver rapidement un composant réutilisable.',
    collectionHint: {
      project: 'Bibliothèque projet',
      user: 'Bibliothèque personnelle',
      mixed: 'Bibliothèque mixte projet + perso',
    },
  },
}
