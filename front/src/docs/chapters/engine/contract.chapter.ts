import type { DocChapterData } from '@/docs/types'

export const engineContractChapter: DocChapterData = {
  id: 'engine-contract',
  group: 'engine',
  kicker: 'Engine A to Z · 03',
  title: 'Du front au contrat de calcul',
  summary: 'Le moteur ne reçoit pas directement le canvas ou les widgets du front. Il reçoit un contrat propre, structuré et sérialisable qui résume la SIF sous une forme calculable.',
  icon: 'Network',
  highlights: [
    {
      label: 'Origine',
      value: 'Front structuré',
    },
    {
      label: 'Transformation',
      value: 'Normalisation puis flattening',
    },
    {
      label: 'But',
      value: 'Contrat calculable et traçable',
    },
  ],
  blocks: [
    {
      title: 'Structure générale',
      intro: 'Le contrat est organisé par sous-système, puis par channels, puis par composants utiles au calcul.',
      points: [
        'Chaque sous-système porte son type, son vote, ses voies et ses paramètres globaux utiles au moteur.',
        'Chaque channel contient les composants effectivement requis pour représenter le chemin considéré.',
        'Les paramètres de composant sont déjà consolidés avant l’envoi au backend.',
      ],
    },
    {
      title: 'Cas des sous-composants',
      intro: 'Les sous-composants gardent une parenté documentaire, mais ils deviennent calculables dans le même contrat que les autres composants.',
      points: [
        'Le front normalise le sous-composant comme un composant complet avec son propre template de données.',
        'Au moment de l’envoi, parent et sous-composants sont aplatis dans la liste de composants du channel.',
        'Le champ `parentComponentId` conserve la traçabilité pour l’affichage et le rapport sans casser le calcul.',
      ],
      example: {
        title: 'Exemple de lecture',
        summary: 'Une vanne parent avec électrovanne en sous-composant reste visible comme hiérarchie dans l’UI, mais le moteur lit un chemin contenant le parent et l’enfant comme éléments requis du même channel.',
        steps: [
          'Le parent est paramétré dans le canvas.',
          'Le sous-composant reçoit son propre panneau de configuration.',
          'Le contrat final transmet les deux éléments avec leur relation de parenté.',
        ],
        result: 'Le calcul reste cohérent avec une lecture série, tandis que le rapport garde une hiérarchie relisible.',
      },
      snippet: {
        title: 'Extrait simplifié de contrat',
        tone: 'code',
        code: `{"subsystems":[{"type":"actuator","channels":[{"components":[{"id":"XV-101","parentComponentId":null},{"id":"SOV-101","parentComponentId":"XV-101"}]}]}]}`,
        caption: 'Le backend reçoit une liste plate de composants calculables, mais la relation documentaire est conservée via `parentComponentId`.',
      },
    },
    {
      title: 'Ce que le backend ne voit pas',
      intro: 'Le backend n’a pas à connaître les détails de mise en page, les animations ou les conventions purement visuelles du front.',
      points: [
        'Le canvas, les états visuels du ProjectTree et les choix d’interface restent strictement côté front.',
        'Le backend reçoit un objet métier stable plutôt qu’une projection d’interface fragile.',
        'Cette séparation permet de faire évoluer l’UI sans casser le moteur tant que le contrat reste compatible.',
      ],
    },
    {
      title: 'Pourquoi cette normalisation est utile',
      intro: 'La normalisation isole le moteur des détails d’UI et donne une base stable pour les évolutions futures.',
      points: [
        'Le backend n’a pas à comprendre les détails visuels du canvas.',
        'Les vues Engine et Report peuvent relire le même contrat sans divergence d’interprétation.',
        'Les futures évolutions du front restent possibles tant que le contrat reste stable.',
      ],
    },
  ],
}
