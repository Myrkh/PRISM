# Product TODO

## Recentrage produit

- [ ] Repositionner SafeLoop comme outil de cycle de vie SIF, pas seulement comme calculateur SIL.
- [ ] Réduire la navigation primaire à un noyau clair: `Accueil`, `SIF`, `Preuves`.
- [ ] Sortir `Audit`, `Historique`, `Engine`, `HAZOP/LOPA`, `Settings` du premier niveau de navigation.
- [ ] Arrêter d'exposer la structure interne du logiciel comme structure principale de l'UX.

## Dashboard lifecycle

- [ ] Remplacer le tableau de bord actuel par un cockpit d'orientation lifecycle.
- [ ] Ne plus faire du dashboard une simple synthèse KPI/PFD/SIL.
- [ ] Concevoir un visuel central de type roue lifecycle cliquable pour orienter l'utilisateur vers la bonne phase.
- [ ] Utiliser la roue comme navigateur métier, pas comme graphique décoratif.
- [ ] Afficher pour chaque segment:
  - statut,
  - niveau de complétude,
  - blocages,
  - prochaine action attendue.
- [ ] Mettre au centre de la roue un CTA principal du type `Continuer la SIF`, `Verifier`, `Publier`, `Lancer proof test`.
- [ ] Ajouter une vue portefeuille au-dessus de la roue: SIF en retard, validations en attente, proof tests expirants, écarts critiques.

## Mapping lifecycle IEC 61511

- [ ] Mapper explicitement les modules produit sur les grandes phases lifecycle:
  - HAZOP / risque,
  - allocation / target SIL,
  - SRS,
  - architecture / conception,
  - verification,
  - validation,
  - exploitation / maintenance / proof test,
  - audit / assessment / evidence.
- [ ] Traiter `Functional Safety Management`, compétence, audit et gouvernance comme une couche transverse, pas comme un simple module latéral.
- [ ] Faire apparaître la continuité entre design cible et performance réelle en exploitation.

## UX coeur de produit

- [ ] Refaire l'accueil pour qu'il réponde d'abord à `où aller maintenant ?`.
- [ ] Remplacer les agrégats globaux trop précoces par des actions guidées et des files d'attente utiles.
- [ ] Donner à chaque écran une seule fonction dominante.
- [ ] Faire de chaque SIF un flux clair: `Definir`, `Architecturer`, `Verifier`, `Exploiter`, `Prouver`.
- [ ] Transformer `Rapport` en sortie de workflow, pas en espace primaire.

## Shell SIF

- [x] Créer une seconde barre sous le header principal pour le shell SIF.
- [x] Déplacer le toggle du panneau gauche dans cette barre secondaire.
- [x] Déplacer le toggle du panneau droit dans cette barre secondaire.
- [x] Mettre le flux lifecycle SIF dans cette même barre, entre les deux toggles.
- [x] Retirer la logique de toggles du rail gauche lorsqu'on est dans une SIF.
- [x] Extraire un rail droit commun au workbench pour éviter les navigations locales incohérentes selon les panneaux.
- [ ] Étendre le rail droit partagé aux workspaces globaux hors SIF.
- [ ] Sortir `Cockpit` du flux lifecycle principal ou le rétrograder en vue secondaire.

## Différenciation

- [ ] Faire du proof test et du monitoring d'exploitation un différenciateur principal du produit.
- [ ] Positionner SafeLoop comme la continuité entre HAZOP/LOPA, design SIS, verification SIL, validation, exploitation et preuve d'audit.
- [ ] Concevoir le dashboard comme une carte de pilotage du cycle de vie, pas comme une page de widgets.
