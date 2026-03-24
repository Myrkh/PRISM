# Guide PRISM — Application et workflow

> Base de connaissance PRISM AI — Comment fonctionne l'application
> Ce fichier permet à l'IA de guider les utilisateurs dans PRISM.

---

## 1. Architecture générale de PRISM

PRISM est une application de gestion du cycle de vie SIS (Safety Instrumented System) conforme IEC 61511.

### Structure de données

```
Workspace
└── Projets (Project)
    └── SIF (Safety Instrumented Function)
        ├── Sous-systèmes (SIFSubsystem)
        │   ├── Voies (Channel)
        │   │   └── Composants (SIFComponent)
        ├── Proof Tests (ProofTestProcedure)
        ├── Campagnes (TestCampaign)
        ├── Événements opérationnels (OperationalEvent)
        ├── Trace HAZOP (HAZOPTrace)
        └── Révisions (SIFRevision)
```

---

## 2. Cycle de vie SIF dans PRISM

### Onglet Cockpit

Vue de synthèse globale de la SIF.
- **État calculé** : SIL atteint vs SIL cible, PFD, verdict global
- **Diagnostics prioritaires** : liste des problèmes bloquants et warnings
- **Gouvernance** : phase courante, dernière révision, responsable
- **Actions prioritaires** : 3 prochaines étapes recommandées par PRISM

**Quand l'utiliser** : entrée systématique, vérification rapide de l'état, après modification.

### Onglet Historique

Liste des révisions publiées de la SIF avec leurs artefacts.
- Visualisation de l'évolution des révisions
- Accès aux rapports PDF figés des révisions précédentes
- Comparaison entre révisions (diff)

### Onglet Contexte (Phase 1)

Documentation de l'identification et de l'analyse de risque.
- **SRS** : titre, description, danger, événement redouté
- **Paramètres process** : PST, temps de réponse SIF, état sûr
- **Taux de sollicitation** (demandRate)
- **SIL cible** issu du LOPA/HAZOP
- **Trace HAZOP** : nœuds, déviations, IPL, résultat LOPA

**Champs obligatoires IEC 61511** : PST, état sûr, SIL cible, description du danger.

### Onglet Architecture (Phase 2)

Éditeur graphique de l'architecture de la SIF.
- **Loop editor** : dessin de la boucle SIS (capteurs → logique → actionneurs)
- **Sous-systèmes** : Sensor / Logic / Actuator
- **Voies (channels)** : redondance au sein d'un sous-système
- **Composants** : issus de la bibliothèque ou créés manuellement
- **Paramètres architecture** : mission time (TH), proof test interval (T1), CCF beta

**Configuration clé** :
- Architecture vote (1oo1, 1oo2, 2oo3...)
- λD, λS, DC pour chaque composant
- Beta factor (CCF) par sous-système

### Onglet Vérification (Phase 3)

Calculs PFD et vérification SIL.
- **PFD calculé** par sous-système et total
- **Verdict SIL** atteint vs cible
- **SFF** et contraintes architecturales
- **Rapport d'écart** si PFD > cible
- **Sensibilité** : quel composant impacte le plus le PFD

C'est ici que le moteur de calcul (backend Python `sil-py`) est appelé.

### Onglet Exploitation (Phase 4)

Gestion des proof tests et campagnes.
- **Procédure proof test** : description, couverture (PTC), durée
- **Campagnes de test** : planifiées, en cours, réalisées
- **Événements opérationnels** : bypasses, incidents, modifications

**Indicateurs clés** : dernière campagne, prochaine campagne, respect T1.

### Onglet Rapport (Phase 5 — Publier)

Génération du dossier de preuve et publication de révision.
- **Contenu du rapport** : SRS, architecture, calculs, proof tests, HAZOP
- **Publication** : crée une nouvelle révision figée avec horodatage
- **Export PDF** : dossier de preuve complet
- **Révision label** : ex. "Rev A", "Rev 1.2"

---

## 3. Barre de cycle de vie (Lifecycle Bar)

La barre en haut de chaque SIF indique la progression dans le cycle IEC 61511 :

```
[Cockpit] | [1 Contexte] → [2 Architecture] → [3 Vérification] → [4 Exploitation] | [Publier ↗]
```

La phase active est surlignée. Les phases incomplètes (diagnostics bloquants) sont marquées d'un warning.

---

## 4. Diagnostics PRISM

PRISM génère des diagnostics automatiques à chaque modification.

### Niveaux de sévérité

| Niveau | Couleur | Signification |
|---|---|---|
| `error` | Rouge | Bloquant — la SIF ne peut pas être publiée |
| `warning` | Jaune | À corriger — PFD ou SIL en risque |
| `info` | Bleu | Informatif — bonne pratique |

### Diagnostics principaux

| Diagnostic | Phase | Sévérité |
|---|---|---|
| PST non renseigné | Contexte | Warning |
| État sûr non défini | Contexte | Warning |
| Temps réponse ≥ PST | Contexte | Error |
| SIL cible non défini | Contexte | Error |
| Aucun sous-système | Architecture | Error |
| λD manquant sur composant | Architecture | Error |
| SFF trop faible pour SIL cible | Architecture | Error |
| PFD calculé > PFD cible | Vérification | Error |
| DC coverage insuffisante | Vérification | Warning |
| CCF beta dominant | Vérification | Warning |
| T1 > recommandé pour SIL | Exploitation | Warning |
| Aucun proof test planifié | Exploitation | Warning |

---

## 5. Bibliothèque de composants

La bibliothèque centralise les composants réutilisables.

### Catégories

- **PRISM Library** : composants génériques fournis par PRISM (λD issus de données certifiées)
- **Ma bibliothèque** : composants créés par l'utilisateur
- **Bibliothèque projet** : composants spécifiques à un projet

### Workflow ajout composant

1. Library → bouton "+ Sensor / Logic / Actuator"
2. Renseigner tag, fabricant, modèle, λD, λS, DC
3. Optionnel : certificat IEC 61508, numéro SERH
4. Le composant apparaît dans la bibliothèque et peut être ajouté à n'importe quelle SIF

---

## 6. Paramètres et préférences

Accessibles via **Settings** (roue dentée dans le header) :

| Section | Paramètre | Notes |
|---|---|---|
| Général | Langue (FR/EN) | Changement instantané |
| Général | Thème (dark/light) | |
| Workspace | `rightPanelDefaultState` | Sections ouvertes/fermées au démarrage |
| Engine | Notation scientifique | Affichage PFD en 1.2×10⁻³ ou 0.0012 |
| Engine | Décimales d'arrondi | Précision affichage calculs |
| Engine | T1 par défaut | Intervalle proof test par défaut |
| Engine | TH par défaut | Mission time par défaut |
| IA | Provider (Cloud/Local) | Anthropic API ou Ollama |
| IA | Modèle | Sonnet / Opus / Haiku / Mistral |
| IA | Ollama host:port | Pour installation locale |

---

## 7. Raccourcis clavier importants

| Raccourci | Action |
|---|---|
| `⌘K` | Ouvrir la Command Palette |
| `⌘I` | Ouvrir / fermer le chat PRISM AI |
| `⌘N` | Nouveau chat (dans le chat panel) |
| `⌘B` | Toggle panneau gauche |
| `⌘\` | Toggle panneau droit |
| `⌘⇧F` | Mode focus (masque tous les panneaux) |
| `⌘1–7` | Naviguer vers onglet SIF (Cockpit=1, Rapport=7) |

---

## 8. Révisions et dossier de preuve

### Workflow de révision

```
SIF en cours → modifications → vérification OK → Publier
                                                     ↓
                                               Révision figée (Rev A, Rev B...)
                                               + PDF généré
                                               + Artefacts archivés
                                                     ↓
                                               Nouvelle révision ouverte automatiquement
```

### Contenu obligatoire d'une révision (IEC 61511)

1. SRS complète (PST, état sûr, SIL cible, danger)
2. Architecture détaillée (composants, λD, DC, β)
3. Calcul PFD avec résultat et verdict
4. Rapport d'écart si applicable
5. Procédure et historique proof tests
6. Trace HAZOP/LOPA de justification
7. Responsable et date de validation

---

## 9. Conseils pour l'IA — Comment aider un utilisateur PRISM

### Répondre aux questions sur le PFD

1. Identifier le sous-système problématique
2. Analyser λD × T1/2 pour chaque composant
3. Vérifier si le terme CCF (β × λD × T1/2) domine
4. Suggérer : réduire T1, améliorer DC, ou ajouter redondance

### Guider vers la bonne phase

- Si données manquantes → Contexte
- Si PFD non calculé → Architecture (vérifier composants)
- Si PFD calculé mais échec SIL → Vérification (analyser écart)
- Si proof test absent → Exploitation

### Questions fréquentes

**"Mon SIL 2 n'est pas atteint, que faire ?"**
→ Vérifier dans l'ordre : 1) λD des composants (données correctes ?), 2) DC (sous-estimé ?), 3) T1 (trop long ?), 4) β (trop élevé ?), 5) Architecture (HFT suffisant ?)

**"La SFF est trop faible pour mon SIL cible"**
→ SFF = (λS + λD×DC) / (λS + λD). Pour augmenter : augmenter DC (meilleurs diagnostics) ou changer de composant avec meilleur ratio λS/λD.

**"Mon temps de réponse dépasse le PST"**
→ Erreur bloquante. Actions : 1) Réduire scan time du logic solver, 2) Utiliser vanne à fermeture plus rapide, 3) Rapprocher les capteurs, 4) Revoir le PST avec le process engineer (prudence).
