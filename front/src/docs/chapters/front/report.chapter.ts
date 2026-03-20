import type { DocChapterData } from '@/docs/types'

export const reportChapter: DocChapterData = {
  "id": "front-report",
  "group": "front",
  "kicker": "Front A to Z · 09",
  "title": "Préparer le rapport et publier une révision",
  "summary": "Le rapport est la sortie documentaire du travail mené dans PRISM. Il doit être propre, traçable, stable et relisible en revue ou en audit.",
  "icon": "FileText",
  "highlights": [
    {
      "label": "Sortie",
      "value": "PDF, snapshots, artefacts"
    },
    {
      "label": "Condition",
      "value": "Dossier assez complet pour être lu"
    },
    {
      "label": "But",
      "value": "Publier sans perdre le contexte"
    }
  ],
  "blocks": [
    {
      "title": "Avant de publier",
      "intro": "Une révision ne doit pas être publiée parce que le PDF “a l’air propre”. Elle doit l’être parce que le dossier est défendable.",
      "points": [
        "Vérifier que le contexte, l’architecture, la vérification et l’exploitation racontent la même histoire.",
        "S’assurer que les hypothèses majeures sont visibles et non cachées dans des champs secondaires.",
        "Fermer ou expliciter les écarts qui empêcheraient une lecture honnête du dossier."
      ]
    },
    {
      "title": "Ce que contient le package de rapport",
      "intro": "Le rapport doit synthétiser le dossier, pas réinventer une vérité parallèle.",
      "points": [
        "Le PDF reprend l’identité de la SIF, les hypothèses, l’architecture, les résultats et les pièces de preuve utiles.",
        "Les composants et sous-composants doivent rester lisibles dans leur hiérarchie documentaire.",
        "Les artefacts de révision servent à figer un état de travail précis pour relecture ultérieure."
      ]
    },
    {
      "title": "Après publication",
      "intro": "Une fois la révision publiée, l’état du dossier doit rester relisible et comparable.",
      "points": [
        "Utiliser l’historique pour comparer une version publiée à une version plus récente.",
        "Créer une nouvelle révision pour toute modification significative plutôt que d’altérer un état figé.",
        "Conserver la discipline documentaire sur les pièces jointes et exports publiés."
      ]
    }
  ]
}
