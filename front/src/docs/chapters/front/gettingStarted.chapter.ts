import type { DocChapterData } from '@/docs/types'

export const gettingStartedChapter: DocChapterData = {
  "id": "front-start",
  "group": "front",
  "kicker": "Front A to Z · 01",
  "title": "Prise en main de PRISM",
  "summary": "Cette partie explique ce qu’un utilisateur doit comprendre avant d’ouvrir sa première SIF: ce que fait PRISM, ce qu’il ne fait pas seul, et comment aborder le workflow sans se perdre.",
  "icon": "BookOpenText",
  "highlights": [
    {
      "label": "Point de départ",
      "value": "Projet → SIF → cycle documentaire"
    },
    {
      "label": "Promesse produit",
      "value": "Calcul + dossier + preuve"
    },
    {
      "label": "Attitude attendue",
      "value": "Utiliser l’outil comme support d’ingénierie"
    }
  ],
  "blocks": [
    {
      "title": "À quoi sert PRISM",
      "intro": "PRISM sert à construire, lire et publier un dossier SIF cohérent. L’application regroupe le contexte de sécurité, la modélisation de l’architecture, les résultats de calcul, les preuves d’exploitation et les artefacts de révision.",
      "points": [
        "Le produit évite de disperser les informations entre tableurs, schémas séparés et comptes-rendus isolés.",
        "Chaque SIF devient un dossier vivant qui peut être relu, complété puis publié en révision figée.",
        "Le moteur de calcul est au service de la justification; il ne remplace pas la revue experte."
      ],
      "example": {
        "title": "Exemple concret",
        "summary": "Vous devez justifier une fonction de niveau haut bac envoyant vers une torche. Dans PRISM, vous allez créer la SIF, documenter son scénario, modéliser la fonction et préparer le rapport au même endroit.",
        "steps": [
          "Créer ou ouvrir le projet qui porte l’unité concernée.",
          "Créer la SIF avec son identifiant et son titre explicite.",
          "Avancer dans les onglets dans l’ordre logique: Contexte, Architecture, Vérification, Exploitation, Rapport."
        ],
        "result": "À la fin, vous obtenez un dossier relisible, pas seulement une valeur de PFDavg."
      }
    },
    {
      "title": "Ce que PRISM attend de l’utilisateur",
      "intro": "Le logiciel est utile quand l’utilisateur l’alimente avec une modélisation propre et des hypothèses assumées.",
      "points": [
        "Avant de chercher un résultat, clarifier le scénario de sécurité et la cible recherchée.",
        "Utiliser la bibliothèque comme accélérateur, pas comme vérité automatique.",
        "Relire les paramètres critiques importés ou recopiés avant de publier."
      ]
    },
    {
      "title": "Workflow recommandé pour une première SIF",
      "intro": "Pour un premier usage, le plus simple est de suivre strictement le cycle documentaire voulu par l’application.",
      "points": [
        "Commencer par Contexte pour cadrer le pourquoi de la fonction.",
        "Passer ensuite à Architecture pour traduire la fonction en sous-systèmes calculables.",
        "Lire le résultat dans Vérification, compléter l’exploitation, puis préparer le package de rapport."
      ]
    }
  ]
}
