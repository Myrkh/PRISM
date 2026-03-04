# SafeLoop Pro

SafeLoop Pro est une application web orientée ingénierie SIS/SIL pour structurer des projets, modéliser des SIF, visualiser des indicateurs, et préparer des livrables de vérification.

## Vision produit (version actuelle)

- **Front-end prioritaire** pour valider l'UX et les parcours métier.
- **Moteur de calcul simplifié** côté front pour prototypage rapide.
- **Moteur normatif final prévu en Python** (backend) dans une phase ultérieure.

## Stack actuelle (front)

- React + TypeScript + Vite
- Zustand (state management)
- Tailwind + composants UI Radix/shadcn-like

## "Zustand", c'est quoi ?

Zustand est une librairie légère de gestion d'état côté front.
Dans ce projet, elle sert à :

- stocker les projets/SIF et l'état de navigation,
- piloter les modales et la sélection des composants,
- persister en local (localStorage) pour retrouver son travail après refresh.

👉 Important : cela **ne remplace pas une base de données** multi-utilisateur.

## Persistance : Supabase ou autre ?

Oui, **Supabase est un très bon choix** pour ce produit, surtout en MVP pro.

### Pourquoi Supabase est adapté

- Auth intégrée (utilisateurs, équipes)
- Postgres managé (données structurées projets/SIF/documents)
- Row Level Security (droits par entreprise/projet)
- Stockage de fichiers natif (rapports, pièces jointes)
- Time-to-market rapide

### Limites à anticiper

- Besoin de bien concevoir le schéma + droits (RLS)
- Couplage à l'écosystème Supabase (acceptable en MVP)

### Alternative recommandée si besoin d'indépendance stricte

- Backend Python (FastAPI) + PostgreSQL managé (Neon/RDS/etc.) + stockage objet (S3-compatible).

## Pourquoi "README template Vite" = onboarding faible ?

Avant cette mise à jour, la racine décrivait surtout le template Vite générique.
Pour un nouveau dev/collaborateur métier, il manquait :

- le but produit,
- l'architecture cible (front + backend Python futur),
- les choix d'infra,
- les conventions de parcours utilisateur.

Un bon onboarding réduit les erreurs, accélère l'équipe, et professionnalise le projet.

## Recommandation UX : HAZOP/LOPA où l'afficher ?

### Option recommandée (la plus intuitive)

1. **Projet (card + détail projet)**
   - Afficher un résumé HAZOP/LOPA (nœud, scénario, niveau de risque, date de session)
   - Bouton "Voir extraits" pour ouvrir un panneau dédié.

2. **SIF (liste SIF + page SIF)**
   - Afficher les liens de traçabilité :
     - `HAZOP Node`
     - `Scenario ID`
     - `LOPA Ref`
     - `IPL concernées`
   - Badge de complétude traçabilité (0–100%).

👉 En pratique : **résumé au niveau Projet**, **traçabilité fine au niveau SIF**.

## Historique (type GED) : où le mettre ?

Bonne idée. Recommandation :

- **Dans la liste SIF** : colonne "Historique" (nombre de révisions, dernière activité).
- **Dans la page SIF** : onglet "Historique" avec timeline (création, modification paramètres, changement statut, export rapport).
- **Dans le détail document** : table de révisions + signataires (inspirée de ta capture).

## Module "Proof Test" (procédure + résultats) : faisable et fortement différenciant

Oui, c'est non seulement possible, mais c'est une excellente opportunité de faire un produit réellement unique.

### Interface 1 — Rédaction de procédure Proof Test par SIF

Créer un onglet dédié **Proof Test** dans la page SIF avec :

- En-tête procédure : référence, révision, statut (Draft / IFR / Approved), périodicité.
- Étapes structurées : prérequis, sécurité, test capteurs, logique, vanne finale, critères d'acceptation.
- Paramètres cibles : temps de réponse SIF max, temps de réaction vanne max, seuils de tolérance.
- Signatures : Rédacteur / Vérificateur / Approbateur + horodatage.

### Interface 2 — Saisie des résultats de tests client

Dans ce même onglet, ajouter une section **Campagnes de tests** :

- Date test, équipe, mode d'exploitation, charge process.
- Mesures clés :
  - temps de réponse SIF,
  - temps de réaction vanne,
  - verdict (Pass/Fail),
  - commentaire / incident.
- Pièces jointes : fichier brut, PV signé, photo/vidéo (optionnel).

### Interface 3 — Graphique de tendance dans le temps

Afficher un graphe cumulatif par SIF :

- courbe `Temps réponse SIF` par campagne,
- courbe `Temps réaction vanne` par campagne,
- bande de tolérance (limites acceptables),
- marquage des points hors tolérance + motif.

👉 Résultat business fort : SafeLoop Pro devient un outil de **traçabilité de performance réelle** (pas seulement de calcul de conception).

## Argument différenciant fort (positionnement marché)

Le message produit peut être :

> "On ne fait pas que vérifier un SIL théorique : on prouve dans le temps que la SIF tient ses performances de test en conditions réelles."

Ce positionnement combine :

- ingénierie (design),
- exécution terrain (proof tests),
- gouvernance/audit (preuves, signatures, historique),
- amélioration continue (tendance des performances).

## Base de données solide, sécurisée, On-Prem : recommandations

### Supabase est-il un bon choix ?

Oui. **Supabase est open source** et peut être auto-hébergé On-Prem.
Pour un produit comme SafeLoop Pro, c'est un très bon choix si vous voulez aller vite avec un socle robuste.

### Architecture recommandée (On-Prem)

- PostgreSQL (données métier : projets, SIF, procédures, campagnes, mesures)
- API backend Python (FastAPI) pour logique métier/calcul normatif
- Supabase (Auth + RLS + Storage + outils DB) auto-hébergé
- Reverse proxy + TLS + segmentation réseau + sauvegardes chiffrées

### Supabase vs .NET : lequel choisir ?

Cela dépend de la compétence équipe et du rythme attendu :

- **Supabase + Python backend** :
  - + rapide à livrer,
  - + excellent pour MVP pro,
  - + stack moderne data-centric.

- **.NET (API + identité + EF + SQL Server/Postgres)** :
  - + très solide en contexte IT industriel historisé,
  - + gouvernance enterprise mature,
  - - souvent plus lourd à démarrer si l'équipe est plus orientée Python/JS.

### Recommandation pragmatique

1. MVP rapide : Supabase auto-hébergé + backend Python.
2. Standardiser sécurité : RLS, journaux d'audit, politique de sauvegarde/restauration testée.
3. Évaluer .NET plus tard uniquement si contrainte SI client forte (stack Microsoft imposée).

## Roadmap fonctionnelle courte

1. **Stabilisation UI/TS**
   - Corriger les erreurs TypeScript bloquantes
   - Fiabiliser les flows de navigation et modales

2. **Traçabilité documentaire**
   - Modèle de révision (rev, statut, auteur, vérificateur, approbateur)
   - Historique SIF/GED lisible

3. **Proof Test opérationnel**
   - Éditeur de procédure par SIF (versionné + signé)
   - Saisie campagnes client (temps réponse SIF + temps vanne)
   - Graphique de tendance + alertes hors tolérance

4. **Persistance cloud / on-prem**
   - MVP Supabase : auth, DB, storage, RLS (auto-hébergeable)

5. **Backend calcul Python**
   - Service de calcul normatif (IEC 61508/61511)
   - Versioning des hypothèses/formules

## Commandes utiles

```bash
npm install
npm run dev
npm run type-check
npm run build
```

## Notes

- Le `type-check` peut actuellement remonter des erreurs connues tant que le chantier de stabilisation TS n'est pas terminé.
- Les calculs front restent provisoires tant que le moteur Python normatif n'est pas branché.