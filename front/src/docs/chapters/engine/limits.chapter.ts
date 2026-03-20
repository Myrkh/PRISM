import type { DocChapterData } from '@/docs/types'

export const engineLimitsChapter: DocChapterData = {
  id: 'engine-limits',
  group: 'engine',
  kicker: 'Engine A to Z · 06',
  title: 'Hypothèses, limites et bonnes pratiques de lecture',
  summary: 'La documentation moteur doit aussi dire clairement ce qui reste simplifié, approximé ou encore non couvert. Cette partie sert à éviter les faux sentiments de certitude.',
  icon: 'TriangleAlert',
  highlights: [
    {
      label: 'Principe',
      value: 'Pas de boîte noire magique',
    },
    {
      label: 'Lecture saine',
      value: 'Résultat + contexte + hypothèses',
    },
    {
      label: 'Reflexe',
      value: 'Revue experte avant publication',
    },
  ],
  blocks: [
    {
      title: 'Ce qu’il faut toujours vérifier',
      intro: 'Avant de conclure sur une valeur, il faut relire la qualité de la modélisation et de la donnée d’entrée.',
      points: [
        'Vérifier que l’architecture déclarée correspond bien à la fonction réelle.',
        'S’assurer que les paramètres importés ne doublonnent pas des données déjà incluses dans un package.',
        'Identifier les hypothèses fortes qui influencent le résultat final.',
      ],
    },
    {
      title: 'Limites connues',
      intro: 'Comme tout moteur spécialisé, PRISM a un périmètre de couverture qu’il faut assumer au lieu de le maquiller.',
      points: [
        'Les cas très dynamiques, les dépendances temporelles riches ou certaines logiques avancées dépassent la lecture native actuelle.',
        'Les architectures personnalisées demandent une relecture attentive du sens réellement appliqué par le modèle.',
        'Le rapport final doit rester honnête sur les approximations plutôt que de lisser artificiellement le discours.',
      ],
    },
    {
      title: 'Comment réagir face à un résultat surprenant',
      intro: 'Le bon réflexe n’est pas de forcer le dossier à “passer”, mais de revenir à la chaîne de modélisation.',
      points: [
        'Relire d’abord le contexte métier et le scénario dangereux visé.',
        'Comparer ensuite la structure architecture / channels / composants avec le comportement réellement attendu.',
        'Vérifier enfin les hypothèses de test, de couverture et de bibliothèque avant de conclure à un vrai problème technique.',
      ],
      example: {
        title: 'Exemple de relecture',
        summary: 'Une fonction paraît trop pénalisée après ajout d’un sous-composant. Avant de douter du moteur, il faut d’abord vérifier que le package parent ne contenait pas déjà cette même donnée.',
        steps: [
          'Relire la source de données du composant parent.',
          'Vérifier si la SOV ou le positionneur n’étaient pas déjà inclus dans la valeur constructeur.',
          'Corriger la modélisation puis relancer le calcul.',
        ],
        result: 'La qualité du résultat dépend souvent davantage de la qualité du modèle que d’un problème d’algorithme.',
      },
    },
    {
      title: 'Bonne pratique de publication',
      intro: 'La meilleure utilisation du moteur consiste à l’intégrer dans une chaîne de justification, pas à le traiter comme l’unique arbitre du dossier.',
      points: [
        'Revenir au contexte et à l’architecture quand un résultat surprend ou contredit l’intuition métier.',
        'Documenter les hypothèses importantes dans le dossier plutôt que les laisser implicites.',
        'Utiliser la publication seulement quand la lecture technique et documentaire raconte une histoire cohérente.',
      ],
    },
  ],
}
