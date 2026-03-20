import architectureCanvasImage from '@/docs/assets/front/front-architecture-canvas.png'
import architectureRightPanelConfigImage from '@/docs/assets/front/front-architecture-rightpanel-config.png'
import componentPanelHeaderImage from '@/docs/assets/front/front-component-panel-header.png'
import componentPanelParametersImage from '@/docs/assets/front/front-component-panel-parameters.png'
import subcomponentPanelImage from '@/docs/assets/front/front-subcomponent-panel.png'
import type { DocChapterData } from '@/docs/types'

export const architectureChapter: DocChapterData = {
  id: 'front-architecture',
  group: 'front',
  kicker: 'Front A to Z · 05',
  title: 'Modéliser l’architecture de la SIF',
  summary: 'Architecture est le cœur de modélisation du produit. On y configure les sous-systèmes, les voies, les composants et leurs sous-composants de manière interprétable par le moteur.',
  icon: 'Network',
  highlights: [
    {
      label: 'Lecture',
      value: 'Sous-système → channel → composant',
    },
    {
      label: 'Force',
      value: 'Canvas + configuration + bibliothèque',
    },
    {
      label: 'Risque',
      value: 'Mauvaise structure = mauvais calcul',
    },
  ],
  blocks: [
    {
      title: 'Lire le canvas',
      intro: 'Le canvas représente la structure de la fonction de sécurité, pas un schéma P&ID complet. Il faut le lire comme un modèle de calcul et de justification.',
      points: [
        'Les trois familles principales sont capteurs, logique et actionneurs.',
        'Chaque sous-système peut contenir une ou plusieurs voies selon l’architecture retenue.',
        'Les composants portés dans chaque voie décrivent ce qui doit fonctionner pour que cette voie remplisse sa part de la fonction.',
      ],
      visual: {
        src: architectureCanvasImage,
        alt: 'Canvas d’architecture SIF montrant sous-systèmes, voies, composants et sous-composants.',
        caption: 'Le canvas montre la structure réelle utilisée par le moteur: familles, voies, composants parents et sous-composants engagés dans la fonction.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 560,
      },
    },
    {
      title: 'Configurer les voies et les architectures',
      intro: 'Le panneau droit d’Architecture permet de définir la structure de vote et le nombre de voies de chaque sous-système.',
      points: [
        'Choisir le nombre de channels réellement présents et l’architecture configurée pour chaque famille.',
        'Prendre en compte la cause commune seulement quand elle est justifiée et renseignée correctement.',
        'Utiliser les configurations de channels pour représenter une architecture réelle, pas une simple convention graphique.',
      ],
      visual: {
        src: architectureRightPanelConfigImage,
        alt: 'Panneau droit Architecture sur la configuration des voies, votes et paramètres CCF.',
        caption: 'Le right panel Architecture sert à structurer les voies, les votes et la cause commune avant d’entrer dans le détail composant.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 660,
      },
    },
    {
      title: 'Paramétrer un composant',
      intro: 'Quand un composant est sélectionné, son panneau doit être traité comme une fiche technique à relire sérieusement.',
      points: [
        'Renseigner identité, catégorie, type d’instrument et source de données avec soin.',
        'Relire la tuile PFD et l’identité du composant avant de descendre dans les réglages détaillés.',
        'Utiliser le header du panneau pour vérifier qu’on travaille bien sur le bon objet dans le bon channel.',
      ],
      visual: {
        src: componentPanelHeaderImage,
        alt: 'En-tête du panneau composant avec identité du composant et tuile PFD.',
        caption: 'Le haut du panneau composant sert à identifier immédiatement l’objet en cours d’édition avant de relire ou modifier ses paramètres.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 520,
      },
      example: {
        title: 'Exemple concret',
        summary: 'Vous ajoutez une vanne et lui rattachez une électrovanne comme sous-composant. Le parent porte la logique du package; le sous-composant reste cliquable et paramétrable avec son propre template.',
        steps: [
          'Créer le composant parent dans le channel actionneur.',
          'Ajouter le sous-composant depuis le panneau de configuration.',
          'Vérifier que le parent et le sous-composant ne comptent pas deux fois la même donnée constructeur.',
        ],
        result: 'Le canvas reste lisible et le contrat moteur garde la relation de parenté.',
      },
    },
    {
      title: 'Paramètres, unités et réglages avancés',
      intro: 'La zone paramètres sert à relire les données qui alimentent réellement le calcul: lambdas, diagnostics, couverture de test, durées et unités.',
      points: [
        'Renseigner les paramètres factorisés ou développés selon la donnée disponible, mais pas les deux de manière incohérente.',
        'Vérifier systématiquement les unités affichées avant de valider les valeurs saisies.',
        'Les réglages avancés servent à affiner un cas réel, pas à remplir du vide pour faire complet.',
      ],
      visual: {
        src: componentPanelParametersImage,
        alt: 'Panneau composant sur la partie paramètres avec champs, unités et réglages détaillés.',
        caption: 'Les paramètres doivent être lus comme une fiche de modélisation: données utiles, unités cohérentes et hypothèses explicites.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 680,
      },
    },
    {
      title: 'Sous-composants: garder la hiérarchie lisible',
      intro: 'Un sous-composant ne doit pas être confondu avec un composant frère du même channel. Il reste rattaché à son parent tout en gardant sa propre configuration.',
      points: [
        'Le canvas doit faire comprendre la hiérarchie parent → sous-composant au premier regard.',
        'Le sous-composant reprend le même template général de configuration que le parent, avec ses paramètres propres.',
        'Le contrat moteur aplatit ensuite parent et sous-composants comme éléments requis en série, tout en gardant la traçabilité de parenté.',
      ],
      visual: {
        src: subcomponentPanelImage,
        alt: 'Panneau d’édition d’un sous-composant utilisant le même template de configuration que le parent.',
        caption: 'Le sous-composant reste un objet pleinement paramétrable, mais il garde sa place de sous-ensemble du composant parent.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'right top',
        maxHeight: 680,
      },
    },
  ],
}
