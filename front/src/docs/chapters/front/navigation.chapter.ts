import shellOverviewImage from '@/docs/assets/front/front-shell-overview.png'
import projectTreeActiveSifImage from '@/docs/assets/front/front-projecttree-active-sif.png'
import type { DocChapterData } from '@/docs/types'

export const navigationChapter: DocChapterData = {
  id: 'front-navigation',
  group: 'front',
  kicker: 'Front A to Z · 02',
  title: 'Navigation & lecture de l’interface',
  summary: 'L’interface est construite comme un atelier de travail. Cette documentation explique à quoi sert chaque zone et quand il faut l’utiliser.',
  icon: 'LayoutDashboard',
  highlights: [
    {
      label: 'Rail gauche',
      value: 'Vues globales de l’application',
    },
    {
      label: 'ProjectTree',
      value: 'Navigation projet / SIF / étape',
    },
    {
      label: 'Panneau droit',
      value: 'Inspecteur contextuel',
    },
  ],
  blocks: [
    {
      title: 'Comprendre les quatre zones',
      intro: 'La lecture la plus simple de l’interface consiste à distinguer navigation applicative, navigation locale, espace d’édition et inspecteur.',
      points: [
        'Le rail gauche donne accès aux vues globales comme projets, moteur, audit et documentation.',
        'Le ProjectTree sert à choisir un projet, une SIF et, si besoin, l’étape active du cycle local.',
        'Le centre affiche la vue de travail courante; le panneau droit montre les propriétés ou réglages associés.',
      ],
      visual: {
        src: shellOverviewImage,
        alt: 'Vue complète de PRISM avec header, rail d’icônes, ProjectTree, panneau central et panneau droit.',
        caption: 'Lecture globale de l’atelier PRISM: navigation applicative à gauche, navigation locale par projet, centre de travail et inspecteur à droite.',
        layout: 'stacked',
        fit: 'contain',
        objectPosition: 'center top',
        maxHeight: 520,
      },
    },
    {
      title: 'Quand utiliser le ProjectTree',
      intro: 'Le ProjectTree est la navigation principale d’une SIF ouverte. Il remplace avantageusement une barre d’onglets répétitive quand il est visible.',
      points: [
        'Cliquer sur un projet ouvre sa structure et montre immédiatement ses SIF.',
        'Cliquer sur une SIF active sa lecture locale et affiche ses étapes internes.',
        'Quand le tree est masqué, la barre locale du centre reprend le relais pour garder l’accès aux vues SIF.',
      ],
      visual: {
        src: projectTreeActiveSifImage,
        alt: 'ProjectTree avec projet ouvert, SIF active et étapes locales dépliées.',
        caption: 'Le ProjectTree devient la navigation locale de la SIF active: projet ouvert, SIF en édition et étapes directement accessibles.',
        layout: 'split',
        fit: 'contain',
        objectPosition: 'left top',
        maxHeight: 520,
      },
      example: {
        title: 'Exemple de lecture',
        summary: 'Vous ouvrez un projet puis une SIF depuis le tree. La SIF active affiche son état d’édition et ses étapes internes; vous pouvez entrer directement sur Architecture ou Vérification sans repasser par une vue intermédiaire.',
        steps: [
          'Déplier le projet depuis le panneau gauche.',
          'Cliquer sur la SIF voulue pour l’activer.',
          'Choisir l’étape voulue dans le sous-niveau qui apparaît sous la SIF active.',
        ],
      },
    },
    {
      title: 'Rôle du panneau droit',
      intro: 'Le panneau droit n’est pas une seconde page. Il doit être lu comme un inspecteur, un configurateur ou un panneau de décision lié à la vue courante.',
      points: [
        'Dans Architecture, il sert à configurer sous-systèmes, bibliothèque et composants.',
        'Dans Vérification ou Exploitation, il complète la vue avec les réglages et informations utiles sans surcharger le centre.',
        'Si le panneau n’apporte pas une aide directe à la tâche en cours, il doit rester fermé ou minimal.',
      ],
    },
  ],
}
