# Shot List Documentation PRISM

Objectif : remplacer progressivement les captures temporaires par des captures PRISM propres, cohérentes et maintenables.

## Règles de prise de vue

- mode : `light mode`
- zoom navigateur : `100%`
- fenêtre : largeur confortable desktop, sans écran ultra large tronqué
- contenu : garder de vrais exemples lisibles, sans données sensibles
- style : éviter les captures floues, tronquées, avec overlays parasites ou modales non voulues

## Front

1. `front-shell-overview.png`
Vue complète de l’application avec `header`, `icon rail`, `project tree`, panneau central et `right panel`.
Usage : chapitre `Navigation & lecture de l’interface`.

2. `front-projecttree-active-sif.png`
Projet ouvert, `SIF` active, étapes dépliées, état actif visible.
Usage : navigation locale et logique `ProjectTree`.

3. `front-context-main.png`
Onglet `Contexte` complet avec contenu central propre et `right panel` visible.
Usage : chapitre `Contexte`.

4. `front-architecture-canvas.png`
Vue `Architecture` montrant clairement `sensor / logic / actuator`, les channels et au moins un parent avec sous-composant.
Usage : chapitre `Architecture`, lecture du canvas.

5. `front-architecture-rightpanel-config.png`
`Right panel` Architecture sur la vue de configuration des channels / votes / CCF.
Usage : chapitre `Architecture`, configuration des voies.

6. `front-architecture-library.png`
`Right panel` Architecture sur `Bibliothèque`, avec recherche active ou résultats visibles.
Usage : chapitre `Bibliothèque`.

7. `front-component-panel-header.png`
Panneau composant en haut, avec identité du composant et tuile `PFD`.
Usage : chapitre `Architecture`, paramétrer un composant.

8. `front-component-panel-parameters.png`
Panneau composant sur la partie paramètres, avec `factorisé / développé`, champs et unités lisibles.
Usage : chapitre `Architecture`, paramètres et avancé.

9. `front-subcomponent-panel.png`
Panneau d’un sous-composant montrant qu’il reprend le même template de configuration que le parent.
Usage : chapitre `Architecture`, sous-composants.

10. `front-verification-main.png`
Vue `Vérification` avec indicateurs principaux et graphe.
Usage : chapitre `Vérification`.

11. `front-exploitation-main.png`
Vue `Exploitation` avec synthèse, statut de proof test ou campagne visible.
Usage : chapitre `Exploitation`.

12. `front-proof-test-procedure.png`
Vue détaillée de procédure ou checks de proof test.
Usage : chapitre `Exploitation`, preuve d’exploitation.

13. `front-report-main.png`
Vue `Rapport` ou écran de préparation/publication du rapport.
Usage : chapitre `Rapport`.

## Engine

14. `engine-contract-view.png`
Vue `Engine` montrant le contrat normalisé ou sa lecture structurée.
Usage : chapitre `Du front au contrat de calcul`.

15. `engine-results-breakdown.png`
Vue `Engine` ou `Vérification` montrant le breakdown par sous-système.
Usage : chapitre `Ce que renvoie le moteur`.

16. `engine-subcomponent-traceability.png`
Vue `Engine` ou rapport montrant explicitement la hiérarchie `parent > sous-composant`.
Usage : contrat / résultats / traçabilité.

17. `engine-backend-terminal.png`
Capture terminal propre du backend démarré avec `./scripts/dev-backend.sh`, plus éventuellement un test `curl /health`.
Usage : chapitre `Démarrer le backend et comprendre la chaîne d’appel`.

## Library

18. `front-library-overview.png`
Vue complète de l'espace Library : sidebar 3 sections (CATALOGUE PRISM / MA BIBLIOTHÈQUE / FAMILLE), panneau central avec 3 cartes par famille (border-top colorée), right panel fermé ou neutre.
Usage : chapitre `Bibliothèque — Vue d'ensemble`.

19. `front-library-sidebar.png`
Sidebar Library complète avec toutes les sections dépliées : CATALOGUE PRISM (filtre Standards), MA BIBLIOTHÈQUE (Tout, Mes templates, lignes projet), section FAMILLE (Toutes / Capteur / Logique / Actionneur). Sans collections pour bien voir la structure de base.
Usage : chapitre `Bibliothèque — Navigation`.

20. `front-library-collections.png`
Sidebar Library — section MA BIBLIOTHÈQUE avec au moins 2 collections créées et la palette de 9 couleurs ouverte sur l'une d'elles. Montre bien l'interaction rename (double-clic) et color-picker.
Usage : chapitre `Bibliothèque — Collections`.

21. `front-library-families.png`
Panneau central Library avec les 3 cartes famille côte à côte (Capteurs en bleu, Logique en violet, Actionneurs en orange), chaque carte contenant 2–3 templates. La border-top colorée doit être clairement visible.
Usage : chapitre `Bibliothèque — Panel central`.

22. `front-library-rightpanel.png`
Right panel Library en mode création/édition de template : champs Nom, Famille, Description, tags, et éventuellement le sélecteur de Collection.
Usage : chapitre `Bibliothèque — Créer et importer`.

23. `front-library-menu-more.png`
Menu ⋯ ouvert dans la toolbar du panneau central Library avec les 3 items visibles : Importer un JSON, Modèle JSON, Exporter tout.
Usage : chapitre `Bibliothèque — Import / Export`.

## Search

24. `front-search-overview.png`
Vue Recherche globale complète : barre de recherche en haut, sidebar gauche avec filtres scope + projet, résultats groupés par scope au centre avec badges colorés et compteurs. Requête active avec résultats dans au moins 3 scopes différents.
Usage : chapitre `Recherche globale — Vue d'ensemble`.

25. `front-search-palette.png`
Palette de commandes ouverte (Ctrl+K) au-dessus d'une vue quelconque (Architecture ou Vérification). Requête active (ex. "XV-101" ou "bypass") avec 5–8 résultats listés : icône scope colorée, titre surligné, badge scope (Composant, SIF…), contexte projet.
Usage : chapitre `Recherche globale — Palette de commandes`.

26. `front-search-filters.png`
Vue Recherche globale : sidebar avec le scope "Composants" (ou autre) sélectionné et un projet filtré. Les compteurs par ligne sont bien lisibles. Le bouton "Reset" est visible. Le panneau central n'affiche que les composants du projet filtré.
Usage : chapitre `Recherche globale — Filtres`.

## Ordre recommandé de production

1. shell + navigation
2. contexte
3. architecture canvas
4. architecture right panel
5. composant parent
6. sous-composant
7. vérification
8. exploitation
9. rapport
10. engine contrat + résultats + terminal
11. library overview
12. library sidebar
13. library collections + color picker
14. library families (3 cartes)
15. library right panel création
16. library menu ⋯
17. search overview (résultats multi-scope)
18. search palette (Ctrl+K ouverte)
19. search filters (scope + projet actifs)
