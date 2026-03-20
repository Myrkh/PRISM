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
