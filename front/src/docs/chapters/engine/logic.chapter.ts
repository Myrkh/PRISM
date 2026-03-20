import type { DocChapterData } from '@/docs/types'

export const engineLogicChapter: DocChapterData = {
  id: 'engine-logic',
  group: 'engine',
  kicker: 'Engine A to Z · 04',
  title: 'Comment le moteur interprète l’architecture',
  summary: 'Cette partie explique la lecture moteur des votes MooN, des éléments requis en série, des sous-composants, du proof test et des causes communes.',
  icon: 'ShieldCheck',
  highlights: [
    {
      label: 'Votes',
      value: 'Lecture par sous-système',
    },
    {
      label: 'Chemins',
      value: 'Voies et éléments requis',
    },
    {
      label: 'Sens',
      value: 'Interpréter avant de calculer',
    },
  ],
  blocks: [
    {
      title: 'Votes MooN et voies',
      intro: 'Le moteur lit d’abord la structure de vote au niveau du sous-système. C’est là que se décide la logique de redondance ou d’exigence des voies.',
      points: [
        'Le nombre de channels et l’architecture choisie donnent le cadre de calcul du sous-système.',
        'Une architecture de vote n’est pas un simple label visuel; elle change le sens de la contribution du sous-système.',
        'Le moteur suppose que cette architecture reflète le comportement réel de la fonction.',
      ],
    },
    {
      title: 'Éléments en série dans un channel',
      intro: 'Quand plusieurs composants du même channel sont requis pour que la voie fonctionne, le moteur les lit comme un chemin dont l’indisponibilité se cumule.',
      points: [
        'C’est particulièrement important pour les packages finaux ou les combinaisons parent / sous-composant.',
        'Une voie n’est pas rendue plus robuste simplement parce qu’elle contient plus d’objets; il faut regarder le sens fonctionnel de chacun.',
        'La lecture correcte du channel est donc un point critique de qualité du modèle.',
      ],
      example: {
        title: 'Exemple concret',
        summary: 'Deux vannes qui doivent toutes deux s’ouvrir pour vider un bac ne sont pas une redondance de sécurité du type 1oo2. Le moteur doit les lire comme deux éléments requis du même chemin fonctionnel.',
        steps: [
          'La SIF détecte un niveau haut et déclenche l’ouverture de deux organes en série vers la torche.',
          'Si une seule des deux vannes reste bloquée, la fonction échoue malgré la présence de deux équipements.',
          'Le bon modèle n’est donc pas “plus robuste parce qu’il y a deux objets”, mais “plus exigeant parce que les deux doivent réussir”.',
        ],
        result: 'Cette lecture évite de confondre une série fonctionnelle avec une vraie redondance de disponibilité.',
      },
    },
    {
      title: 'Proof test, CCF et paramètres complémentaires',
      intro: 'Le moteur exploite aussi les paramètres de test, de couverture et de cause commune là où le modèle courant le prévoit.',
      points: [
        'Les paramètres de test influencent le résultat dès qu’ils sont renseignés et supportés par le modèle.',
        'Les facteurs de cause commune doivent être utilisés avec discipline, car ils dépendent fortement du cas modélisé.',
        'Une donnée avancée sans justification claire peut dégrader ou embellir artificiellement le calcul.',
      ],
    },
    {
      title: 'Lire une architecture custom avec prudence',
      intro: 'Une logique personnalisée demande toujours une relecture explicite du sens appliqué par le modèle.',
      points: [
        'Il faut distinguer une combinaison booléenne de haut niveau et une structure de vote MooN réellement équivalente.',
        'Un `ET` métier n’est pas toujours synonyme d’une architecture “redondante”; il peut simplement signifier que plusieurs éléments sont requis en série.',
        'Quand le cas devient ambigü, la bonne pratique consiste à documenter la convention retenue dans le dossier et dans le rapport.',
      ],
    },
  ],
}
