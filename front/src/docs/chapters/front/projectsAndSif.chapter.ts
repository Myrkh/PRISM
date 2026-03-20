import type { DocChapterData } from '@/docs/types'

export const projectsAndSifChapter: DocChapterData = {
  "id": "front-projects",
  "group": "front",
  "kicker": "Front A to Z · 03",
  "title": "Projets, SIF et organisation du travail",
  "summary": "Cette partie explique comment structurer les projets, créer des SIF propres et garder une base de travail lisible dans le temps.",
  "icon": "FolderPlus",
  "highlights": [
    {
      "label": "Niveau 1",
      "value": "Projet industriel"
    },
    {
      "label": "Niveau 2",
      "value": "SIF documentée"
    },
    {
      "label": "Bonne pratique",
      "value": "Nommer clairement avant de calculer"
    }
  ],
  "blocks": [
    {
      "title": "Créer un projet proprement",
      "intro": "Le projet sert de conteneur métier et documentaire. Il doit rester lisible même plusieurs mois plus tard.",
      "points": [
        "Donner un nom de projet qui identifie clairement le site, l’unité ou le scope de travail.",
        "Utiliser les champs de référence et de client quand ils servent réellement à l’exploitation interne du dossier.",
        "Éviter les projets “fourre-tout” qui mélangent plusieurs scopes sans logique claire."
      ]
    },
    {
      "title": "Créer une SIF exploitable",
      "intro": "Une SIF bien créée doit pouvoir être retrouvée et relue sans contexte verbal supplémentaire.",
      "points": [
        "Renseigner un identifiant de SIF stable et un titre qui dit explicitement la fonction de sécurité.",
        "Lier la SIF à son process tag ou son équipement de référence quand cela aide la recherche future.",
        "Ne pas attendre la fin du dossier pour nettoyer les métadonnées de base."
      ],
      "example": {
        "title": "Exemple de création",
        "summary": "Une bonne entrée ressemble à “SIF-001 · Niveau très haut LSHH001 vers torche” plutôt qu’à un titre vague du type “Essai SIF”.",
        "steps": [
          "Créer le projet de l’unité ou de la campagne de revue.",
          "Créer la SIF avec un numéro stable.",
          "Compléter le titre et les repères dès le départ."
        ]
      }
    },
    {
      "title": "Garder une base lisible",
      "intro": "La maintenance documentaire commence dès la création des objets. Une base propre réduit le bruit dans la suite du workflow.",
      "points": [
        "Archiver les essais ou brouillons plutôt que de les laisser mélangés aux SIF actives.",
        "Éviter de cloner sans renommer correctement les identifiants visibles.",
        "Utiliser le tree et les futures recherches globales pour retrouver rapidement la bonne SIF."
      ]
    }
  ]
}
