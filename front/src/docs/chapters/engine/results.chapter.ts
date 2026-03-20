import type { DocChapterData } from '@/docs/types'

export const engineResultsChapter: DocChapterData = {
  id: 'engine-results',
  group: 'engine',
  kicker: 'Engine A to Z · 05',
  title: 'Ce que renvoie le moteur',
  summary: 'Le moteur produit plus qu’un chiffre final. Il renvoie un résultat détaillé qui alimente la lecture technique, le cockpit, l’engine view et la publication du rapport.',
  icon: 'FileText',
  highlights: [
    {
      label: 'Résultat principal',
      value: 'SIL / PFDavg / RRF',
    },
    {
      label: 'Détail',
      value: 'Sous-systèmes et composants',
    },
    {
      label: 'Usage',
      value: 'Front, engine, report',
    },
  ],
  blocks: [
    {
      title: 'Résultat global',
      intro: 'Le premier niveau de sortie donne la lecture synthétique de la SIF calculée.',
      points: [
        'SIL atteint, PFDavg et RRF servent de lecture technique globale du niveau de protection obtenu.',
        'Cette sortie synthétique est celle qui remonte en priorité dans Vérification et Cockpit.',
        'Elle doit cependant toujours être reliée au détail de construction du résultat.',
      ],
    },
    {
      title: 'Breakdown détaillé',
      intro: 'Le moteur renvoie aussi des résultats par sous-système et des informations qui permettent une lecture plus fine du dossier.',
      points: [
        'Chaque sous-système garde sa contribution propre et ses indicateurs associés.',
        'Les composants et sous-composants peuvent être relus dans la hiérarchie documentaire quand la traçabilité est conservée.',
        'Cette granularité permet de relier un problème observé à une zone précise du modèle.',
      ],
    },
    {
      title: 'Comment le front l’exploite',
      intro: 'Les sorties moteur sont réutilisées par plusieurs vues, chacune avec un rôle différent.',
      points: [
        'Vérification expose la lecture technique détaillée et les répartitions.',
        'Le cockpit en fait une lecture synthétique orientée décision.',
        'Le rapport transforme ces mêmes résultats en preuve documentaire relisible et stable.',
      ],
      example: {
        title: 'Exemple de lecture multi-vues',
        summary: 'Une même SIF peut être vue à trois niveaux: synthèse dans le cockpit, détail dans Vérification, puis mise en récit dans le rapport.',
        steps: [
          'Le cockpit indique rapidement si le dossier semble passer ou non au regard de la cible.',
          'La vue Vérification permet d’identifier le sous-système ou le package le plus contributif.',
          'Le rapport réutilise ce même résultat pour produire un artefact stable et partageable.',
        ],
        result: 'Le moteur n’alimente pas une seule page; il nourrit toute la chaîne de lecture du dossier.',
      },
    },
    {
      title: 'Pourquoi la traçabilité compte autant que la valeur',
      intro: 'Un chiffre seul n’aide pas beaucoup à défendre une décision. Ce qui fait la qualité du résultat, c’est aussi sa capacité à être relu, expliqué et contesté si besoin.',
      points: [
        'Conserver la structure parent / sous-composant évite d’aplatir le raisonnement documentaire.',
        'Le détail par sous-système aide à justifier où se situe réellement la contrainte technique.',
        'Une traçabilité propre accélère les revues et réduit les discussions floues au moment de publier.',
      ],
    },
  ],
}
