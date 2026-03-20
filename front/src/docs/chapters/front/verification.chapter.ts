import type { DocChapterData } from '@/docs/types'

export const verificationChapter: DocChapterData = {
  "id": "front-verification",
  "group": "front",
  "kicker": "Front A to Z · 07",
  "title": "Lire la vérification et agir sur le résultat",
  "summary": "Le tab Vérification permet de comprendre si l’architecture atteint l’objectif recherché et où se trouvent les contributions ou écarts à traiter.",
  "icon": "ShieldCheck",
  "highlights": [
    {
      "label": "Sortie clé",
      "value": "PFDavg / SIL atteint / RRF"
    },
    {
      "label": "Lecture utile",
      "value": "Résultat + répartition + écart"
    },
    {
      "label": "Décision",
      "value": "Corriger, justifier ou publier"
    }
  ],
  "blocks": [
    {
      "title": "Commencer par le haut de page",
      "intro": "La première lecture doit aller du verdict global aux métriques principales avant de plonger dans le détail.",
      "points": [
        "Regarder le SIL atteint et la PFDavg avant toute discussion sur le style du graphique.",
        "Lire ensuite la répartition des contributions pour comprendre quel sous-système tire le résultat.",
        "Ne pas interpréter un bon chiffre sans relire rapidement la cohérence de l’architecture et des hypothèses."
      ]
    },
    {
      "title": "Comprendre les écarts",
      "intro": "Un écart n’est pas forcément un échec du moteur. C’est souvent un signal qu’il manque une justification, une donnée ou une correction d’architecture.",
      "points": [
        "Un SIL atteint insuffisant peut venir d’une structure trop faible ou de données pessimistes mais justes.",
        "Un écart documentaire peut aussi bloquer la publication même si le calcul est bon.",
        "Le cockpit doit ensuite servir à prioriser les actions de fermeture."
      ],
      "example": {
        "title": "Exemple concret",
        "summary": "La PFDavg globale paraît trop haute. Le breakdown montre que la part actionneur domine. La bonne action n’est pas de “corriger le résultat”, mais de relire le package final, ses tests et ses sous-composants.",
        "steps": [
          "Lire la contribution principale dans la répartition.",
          "Revenir au sous-système concerné dans Architecture.",
          "Vérifier la cohérence des données et des hypothèses de test."
        ]
      }
    },
    {
      "title": "Ce que la vue ne fait pas à ta place",
      "intro": "Vérification donne de la lisibilité, pas une approbation automatique.",
      "points": [
        "Le produit ne remplace pas la revue experte du sens métier des hypothèses.",
        "Un résultat est crédible seulement si le modèle et la donnée le sont aussi.",
        "Avant publication, relier le résultat à la logique de contexte et d’exploitation plutôt qu’à une valeur isolée."
      ]
    }
  ]
}
