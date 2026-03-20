import architectureLibraryImage from '@/docs/assets/front/front-architecture-library.png'
import libraryImage from '@/docs/assets/front/front-library.png'
import libraryRightPanelImage from '@/docs/assets/front/front-library-rightpanel-config.png'
import type { DocChapterData } from '@/docs/types'
import { COMPONENT_TEMPLATE_IMPORT_DOC_EXAMPLE } from '@/features/library/templateUtils'

export const libraryChapter: DocChapterData = {
  id: 'front-library',
  group: 'front',
  kicker: 'Front A to Z · 06',
  title: 'Bibliothèque de composants et sources de données',
  summary: 'La bibliothèque maître sert à gérer les composants réutilisables du produit: standards validés du backend, templates projet et bibliothèque personnelle. Elle permet aussi de créer un template depuis zéro, de l’éditer avec le même panneau que les composants SIF, puis de l’importer ou l’exporter au format JSON attendu par PRISM.',
  icon: 'FolderPlus',
  highlights: [
    {
      label: 'Source principale',
      value: 'lambda_db + templates PRISM',
    },
    {
      label: 'Capacités',
      value: 'Recherche, édition, import/export',
    },
    {
      label: 'Création',
      value: 'Capteur / logique / actionneur',
    },
    {
      label: 'Vigilance',
      value: 'Toujours relire les données importées',
    },
  ],
  blocks: [
    {
      title: 'Lire la bibliothèque maître',
      intro: 'La vue Bibliothèque n’est pas un simple catalogue statique. Elle rassemble les standards natifs fournis par le backend, les templates liés à un projet et la bibliothèque personnelle de l’utilisateur dans une seule interface de gestion.',
      points: [
        'Les filtres du panneau gauche permettent de restreindre la vue par origine, famille ou projet sans perdre la logique globale du catalogue.',
        'Le panneau central sert à rechercher, parcourir et sélectionner rapidement un composant réutilisable.',
        'Le panneau droit devient l’inspecteur de création et d’édition: il reprend le même gabarit que la configuration des composants SIF.',
      ],
      visual: {
        src: libraryImage,
        alt: 'Vue Bibliothèque maître montrant le catalogue, les actions de création et les familles de composants.',
        caption: 'La bibliothèque maître sert à piloter le catalogue global: standards validés, templates projet et bibliothèque personnelle.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 620,
      },
    },
    {
      title: 'Créer ou modifier un template comme un vrai composant',
      intro: 'Quand un template est sélectionné, le panneau droit reprend la même logique que le panneau composant de l’Architecture. On ne remplit donc pas une fiche simplifiée: on renseigne un véritable objet de calcul réutilisable.',
      points: [
        'Le header met en avant l’identité du composant et la tuile PFD pour garder une lecture cohérente avec le reste de l’application.',
        'Les sections Identification, Paramètres, Test et Avancé reprennent le même template de saisie que dans les SIF.',
        'Un standard validé du backend reste en lecture de référence: l’enregistrer depuis la bibliothèque crée une copie projet ou personnelle.',
      ],
      visual: {
        src: libraryRightPanelImage,
        alt: 'Panneau droit Bibliothèque montrant la configuration complète d’un template de composant.',
        caption: 'Le right panel Bibliothèque réutilise le même gabarit de paramètres que les composants SIF, ce qui permet de créer un template depuis zéro sans changer de logique de travail.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 720,
      },
      example: {
        title: 'Exemple concret',
        summary: 'Vous devez constituer une bibliothèque client. Vous créez un capteur standard, un automate de sécurité et une vanne finale en reprenant exactement le même panneau que dans l’Architecture des SIF.',
        steps: [
          'Ouvrir Bibliothèque puis choisir `Nouveau capteur`, `Nouvelle logique` ou `Nouvel actionneur`.',
          'Renseigner les paramètres techniques et les métadonnées de template dans le panneau droit.',
          'Enregistrer dans `My Library` ou `Project` selon le périmètre voulu.',
        ],
        result: 'Le template devient réutilisable dans la bibliothèque globale et dans le picker d’Architecture.',
      },
    },
    {
      title: 'Importer, exporter et préparer un JSON compatible',
      intro: 'La bibliothèque accepte un import JSON natif PRISM. Le plus sûr consiste à exporter un template existant ou à télécharger le modèle JSON fourni par l’application, puis à le compléter hors ligne avant réimport.',
      points: [
        'Le bouton `Modèle JSON` télécharge un fichier déjà compatible avec l’importeur. La doc propose le même téléchargement pour préparer un import sans quitter ce chapitre.',
        'Le bouton `Exporter` génère un JSON PRISM complet à partir des templates visibles dans la vue.',
        'À l’import, PRISM réhydrate le `componentSnapshot` et remappe les champs dans le panneau de paramètres, à condition de garder un `subsystemType` cohérent et un snapshot complet.',
        'Le modèle téléchargé embarque trois starters: capteur, logique et actionneur. Vous pouvez supprimer ceux qui ne vous servent pas et dupliquer ceux à décliner.',
      ],
      actions: [
        {
          label: 'Télécharger le modèle JSON',
          actionId: 'download-library-json-model',
          hint: 'Le fichier téléchargé correspond au format attendu par l’importeur PRISM. Il peut être rempli hors ligne puis réimporté dans `My Library` ou `Project`.',
        },
      ],
      snippets: [
        {
          title: 'Flux recommandé',
          tone: 'terminal',
          code: [
            '1. Télécharger le modèle JSON depuis la Bibliothèque ou depuis cette documentation',
            '2. Remplacer les noms, descriptions, tags et valeurs techniques',
            '3. Conserver `subsystemType` et `componentSnapshot` cohérents',
            '4. Réimporter le fichier dans `My Library` ou `Project`',
            '5. Relire le template dans le panneau droit avant usage',
          ].join('\n'),
          caption: 'Le modèle JSON sert de point d’entrée sûr pour créer une bibliothèque client sans deviner la structure attendue par PRISM.',
        },
        {
          title: 'Exemple JSON rempli',
          tone: 'code',
          code: COMPONENT_TEMPLATE_IMPORT_DOC_EXAMPLE,
          caption: 'Cet exemple montre un starter capteur complètement rempli. Le modèle téléchargé ajoute aussi une logique et un actionneur pour démarrer une bibliothèque complète.',
        },
      ],
    },
    {
      title: 'Deux usages, une seule source de vérité',
      intro: 'PRISM distingue la bibliothèque maître de l’application et le picker contextuel utilisé dans Architecture, mais les deux s’appuient sur la même logique de données.',
      points: [
        'La vue bibliothèque globale sert à parcourir, comparer, éditer et retrouver des composants standards ou projet.',
        'La bibliothèque du panneau Architecture sert à insérer rapidement un composant dans un channel par glisser-déposer.',
        'Cette séparation garde une seule source de vérité, tout en conservant un usage local très fluide pendant la modélisation.',
      ],
      visual: {
        src: architectureLibraryImage,
        alt: 'Right panel Architecture sur l’onglet Bibliothèque avec résultats visibles.',
        caption: 'Le picker d’Architecture consomme la même bibliothèque que la vue globale, mais dans une logique d’insertion rapide dans le canvas.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 640,
      },
    },
  ],
}
