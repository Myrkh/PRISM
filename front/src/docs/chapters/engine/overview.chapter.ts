import type { DocChapterData } from '@/docs/types'

export const engineOverviewChapter: DocChapterData = {
  id: 'engine-overview',
  group: 'engine',
  kicker: 'Engine A to Z · 01',
  title: 'Ce que fait le moteur PRISM',
  summary: 'Le moteur prend la modélisation SIF du front, la convertit en contrat de calcul, applique les conventions supportées, puis produit un résultat exploitable par les vues de vérification et de rapport.',
  icon: 'Cpu',
  highlights: [
    {
      label: 'Entrée',
      value: 'Contrat normalisé',
    },
    {
      label: 'Sortie',
      value: 'PFD, SIL, breakdown, traçabilité',
    },
    {
      label: 'Position',
      value: 'Moteur au service du dossier',
    },
  ],
  blocks: [
    {
      title: 'Rôle exact du moteur',
      intro: 'Le moteur n’est pas une boîte séparée du produit; il est la couche quantitative qui soutient la lecture documentaire de la SIF.',
      points: [
        'Il consomme les paramètres structurés de la SIF pour produire un résultat cohérent avec la modélisation courante.',
        'Il renvoie assez d’informations pour alimenter le cockpit, la vérification, l’engine view et le rapport.',
        'Il ne décide pas à la place de l’ingénieur si le dossier est acceptable ou publiable.',
      ],
    },
    {
      title: 'Quand le moteur est invoqué',
      intro: 'Le calcul intervient partout où le produit a besoin d’une lecture quantitative de la SIF.',
      points: [
        'Dans Vérification pour afficher les résultats et la répartition des contributions.',
        'Dans le cockpit pour remonter l’état technique global.',
        'Dans Engine et Report pour exposer le contrat et les résultats détaillés.',
      ],
    },
    {
      title: 'Ce que le moteur ne fait pas seul',
      intro: 'La valeur calculée n’est jamais une preuve suffisante à elle seule. Elle doit rester reliée au scénario de sécurité et aux conventions de modélisation utilisées.',
      points: [
        'Le moteur ne reconstruit pas tout seul l’intention métier si le canvas a été mal lu ou mal saisi.',
        'Il ne sait pas détecter automatiquement qu’une donnée constructeur est déjà incluse dans un package parent.',
        'Il ne remplace pas la revue documentaire, la lecture critique du contexte ni la validation experte avant publication.',
      ],
    },
    {
      title: 'Exemple de lecture saine',
      intro: 'Une bonne utilisation du moteur consiste à lire son résultat comme une réponse quantitative à une modélisation donnée, pas comme un verdict absolu.',
      points: [
        'Un résultat “surprenant” doit d’abord conduire à relire l’architecture et les paramètres, pas à remettre immédiatement en cause la formule.',
        'La comparaison entre cockpit, vérification détaillée et report est utile pour repérer une incohérence ou un oubli.',
        'Plus la traçabilité du dossier est propre, plus la valeur calculée devient défendable en revue.',
      ],
    },
  ],
}
