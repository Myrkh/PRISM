import type { LibraryStrings } from '@/i18n/library'

export const libraryStringsFr: LibraryStrings = {
  sourceScopeLabels: {
    all: 'Tout le catalogue',
    builtin: 'Catalogue PRISM',
    custom: 'Ma bibliothèque',
    project: 'Templates projet',
    user: 'Mes templates',
  },
  header: {
    filteredCount: count => `${count} résultats filtrés`,
    availableCount: count => `${count} templates disponibles`,
  },
  searchPlaceholder: 'Ex. Rosemount, switch niveau, Safety PLC, SOV, positionneur…',
  ctas: {
    import: 'Importer',
    importModel: 'Modèle JSON',
    importModelTitle: 'Télécharger un JSON modèle vierge compatible import',
    export: 'Exporter',
    exportTitle: 'Exporter les templates visibles (non-standards) en JSON',
    reloadTitle: 'Recharger la bibliothèque depuis le serveur',
    moreActionsTitle: "Plus d'actions",
  },
  importTarget: (projectLabel, libraryLabel) => projectLabel
    ? `Import vers ${projectLabel}${libraryLabel ? ` · ${libraryLabel}` : ''}`
    : `Import vers ma bibliothèque${libraryLabel ? ` · ${libraryLabel}` : ''}`,
  status: {
    noSelection: 'Aucune entrée sélectionnée pour import.',
    imported: (count, created, updated) => `${count} template(s) importé(s) · ${created} créé(s) · ${updated} mis à jour.`,
    exported: count => `${count} template(s) exporté(s).`,
    importModelDownloaded: 'Modèle JSON téléchargé.',
    deleted: 'Template supprimé.',
  },
  family: {
    empty: 'Aucun template ne correspond aux filtres actifs.',
    showMore: 'Charger plus',
    showLess: 'Voir moins',
  },
  sidebar: {
    title: 'Catalogue',
    reset: 'Réinitialiser',
    prismCatalogueTitle: 'Catalogue PRISM',
    prismCatalogueHint: 'lecture seule',
    myLibraryTitle: 'Ma bibliothèque',
    myLibraryAllLabel: 'Toute ma bibliothèque',
    myLibraryPersonalLabel: 'Mes templates',
    myLibraryPersonalHint: 'tous projets',
    familiesTitle: 'Famille',
    allFamiliesLabel: 'Toutes',
    newSensorTitle: 'Nouveau capteur',
    newLogicTitle: 'Nouvelle logique',
    newActuatorTitle: 'Nouvel actionneur',
    newCollectionTitle: 'Nouvelle collection',
    newCollectionPlaceholder: 'Nom de la collection…',
    newCollectionConfirm: 'OK',
    collectionColorTitle: 'Changer la couleur',
    collectionEditJsonTitle: 'Éditer en JSON',
    collectionDeleteTitle: 'Supprimer',
    collectionDeleteConfirmTitle: 'Supprimer la collection',
    collectionDeleteConfirmMessage: name => `Supprimer définitivement la collection ${name} et détacher ses composants ?`,
    collectionDeleteConfirmAction: 'Supprimer',
  },
}
