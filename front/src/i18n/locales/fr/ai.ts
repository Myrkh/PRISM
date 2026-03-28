import type { AiStrings } from '@/i18n/ai'

export const aiStringsFr: AiStrings = {
  proposals: {
    commands: {
      createProject: 'CRÉER PROJET',
      createSif:     'CRÉER SIF',
      draftSif:      'DRAFT SIF',
      createLibrary: 'CRÉER BIBLIOTHÈQUE',
    },
    actions: {
      openProject:    'Ouvrir le projet créé',
      openSif:        'Ouvrir la SIF créée',
      openTemplate:   'Ouvrir le template créé',
      reopenPreview:  'Rouvrir la preview',
      openPreview:    'Ouvrir la preview',
    },
    sections: {
      conflicts:   'Conflits à résoudre',
      missing:     'Informations manquantes',
      uncertain:   'Informations insuffisantes',
      assumptions: 'Hypothèses',
    },
    preview: {
      titleSif:        'Brouillon IA non appliqué',
      titleProject:    'Brouillon projet non appliqué',
      subtitleSif:     'Cette SIF est un brouillon temporaire. Rien ne sera sauvegardé tant que vous n\'appliquez pas la proposition.',
      subtitleProject: 'Ce projet est une preview temporaire. Rien ne sera sauvegardé tant que vous n\'appliquez pas la proposition.',
      applySif:        'Appliquer au projet',
      applyProject:    'Appliquer au workspace',
      applying:        'Application…',
      discard:         'Annuler la preview',
      json:            'JSON',
      governanceTitle: 'Gouvernance du draft',
      governanceHint:  'Les écarts, manques et hypothèses sont visibles avant toute création effective du projet.',
      governanceEmpty: 'Aucun conflit ni manque détecté dans la proposition actuelle.',
    },
    projectMeta: {
      sectionTitle: 'Métadonnées projet',
      sectionHint:  'Aperçu exact du contrat .prism proposé par PRISM AI.',
      name:         'Nom',
      reference:    'Référence',
      client:       'Client',
      site:         'Site',
      unit:         'Unité',
      revision:     'Révision',
      status:       'Statut',
      description:  'Description',
    },
    projectView: {
      sectionTitle: 'Vue projet',
      sectionHint:  'Le projet sera créé avec la structure ci-dessous.',
      empty:        'Aucune SIF n\'est encore incluse dans ce brouillon projet.',
      untitledSif:  'SIF sans titre',
    },
  },
}
