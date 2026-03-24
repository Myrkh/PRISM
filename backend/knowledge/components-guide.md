# Guide des composants SIS — Bibliothèque PRISM

> Base de connaissance PRISM AI — Sélection et paramétrage des composants
> Couvre les capteurs, logic solvers, actionneurs et leurs paramètres λD, λS, DC, SFF.

---

## 1. Types de composants dans PRISM

PRISM distingue trois familles dans chaque sous-système :

| Type | Rôle | Exemples |
|---|---|---|
| **Sensor** (capteur) | Détection de la déviation process | Transmetteur pression, niveau, température, débit, analyseur gaz |
| **Logic** (logique) | Traitement et décision de sécurité | SIS (Safety PLC), relay de sécurité, HIMA, Triconex, Allen-Bradley, ABB |
| **Actuator** (actionneur) | Action sur le process | Vanne ESD, disjoncteur, moteur arrêt, contacteur |

---

## 2. Paramètres clés par composant

### λD — Taux de défaillance dangereuse

Unité : défaillances / heure (/h)

| Catégorie composant | λD typique (/h) |
|---|---|
| Transmetteur pression (HART) | 5×10⁻⁸ – 2×10⁻⁷ |
| Transmetteur niveau (radar) | 1×10⁻⁷ – 5×10⁻⁷ |
| Détecteur de gaz catalytique | 5×10⁻⁷ – 2×10⁻⁶ |
| Détecteur de flamme UV/IR | 1×10⁻⁷ – 5×10⁻⁷ |
| Thermocouple / RTD | 1×10⁻⁷ – 5×10⁻⁷ |
| Logic solver (SIS certifié) | 1×10⁻⁸ – 5×10⁻⁸ |
| Vanne ESD on/off (fail-close) | 5×10⁻⁷ – 2×10⁻⁶ |
| Disjoncteur moteur | 1×10⁻⁶ – 5×10⁻⁶ |
| Pompe d'arrêt d'urgence | 1×10⁻⁶ – 5×10⁻⁶ |

**Source recommandée** : données fabricant certifiées (IEC 61508), OREDA, exida SERH.
Toujours privilégier les données certifiées sur les données génériques.

### DC — Diagnostic Coverage

```
DC = λDD / (λDD + λDU) = fraction des λD détectées par autodiagnostic
```

| Composant | DC typique | Condition |
|---|---|---|
| Transmetteur HART basique | 60–80% | Surveillance 4–20mA seulement |
| Transmetteur HART avec comparaison | 90–95% | 2 voies ou valve proof test |
| Logic solver SIS certifié SIL 3 | 99%+ | Diagnostics intégrés complets |
| Vanne sans retour de position | 0% | Aucun diagnostic |
| Vanne avec retour de position (fin de course) | 60–75% | Confirmation ouvert/fermé |
| Vanne avec Partial Stroke Test (PST) | 85–90% | Test partiel automatique |

### SFF — Safe Failure Fraction

```
SFF = (λS + λD × DC) / (λS + λD)
```

La SFF doit être ≥ aux seuils du tableau 3 IEC 61511 pour le SIL cible.

---

## 3. Architectures de vote

### 1oo1 (One out of One)

```
Capteur A → Décision
```

- HFT = 0 → SIL max limité par SFF
- Utilisation : SIL 1, fonctions non critiques
- Avantage : simple, économique
- Inconvénient : aucune tolérance aux pannes

### 1oo2 (One out of Two)

```
Capteur A ┐
          ├→ OR → Décision (1 suffit à déclencher)
Capteur B ┘
```

- HFT = 1 → SIL max élevé possible
- Utilisation : où la disponibilité opérationnelle est critique (pas de faux trip)
- **Attention** : PFD dépend fortement du β — si β élevé, bénéfice annulé

### 2oo2 (Two out of Two)

```
Capteur A ┐
          ├→ AND → Décision (2 requis)
Capteur B ┘
```

- HFT = 0 → mauvaise tolérance aux pannes dangereuses
- Utilisation : réduction des faux déclenchements seulement
- **Ne jamais utiliser seul pour la sécurité** sans analyse approfondie

### 2oo3 (Two out of Three) — Architecture de référence

```
Capteur A ┐
Capteur B ├→ Vote 2/3 → Décision
Capteur C ┘
```

- HFT = 1 (1 défaillance tolérée sans perte de fonction)
- **Architecture recommandée SIL 2 et SIL 3**
- Combinaison optimale sécurité + disponibilité
- Coût : 3 instruments + logic solver adapté

### Tableau de sélection architecture

| SIL cible | Architecture recommandée | Notes |
|---|---|---|
| SIL 1 | 1oo1 ou 1oo2 | 1oo1 si SFF suffisante |
| SIL 2 | 1oo2 ou 2oo3 | 2oo3 si β maîtrisé, 1oo2 si disponibilité critique |
| SIL 3 | 2oo3 ou 2oo4 | Exige composants haute DC + β < 2% |
| SIL 4 | Non recommandé process | Revoir l'architecture process |

---

## 4. Logic solvers — Systèmes SIS certifiés

### Caractéristiques attendues

Un logic solver SIS doit être certifié IEC 61508 pour le SIL ciblé. Points clés :
- **Temps de cycle** (scan) : typiquement 10–100 ms pour process standard
- **Diagnostics intégrés** : test RAM, CPU, I/O, alimentation, communication
- **Mode de défaillance sûr** : sortie fail-safe à 0V (de-energize-to-trip)
- **Ségrégation** des circuits sécurité / contrôle (si BPCS intégré)

### Logic solvers communs dans PRISM

| Constructeur | Modèle type | SIL certifié |
|---|---|---|
| Triconex (Schneider) | Tricon, TriMax | SIL 3 |
| HIMA | H51q, HIMax | SIL 3 |
| Allen-Bradley (Rockwell) | GuardLogix | SIL 2 (SIL 3 avec config) |
| ABB | AC800M HI | SIL 3 |
| Siemens | S7-400H / S7-1500 F | SIL 2–3 |
| Pilz | PNOZ | SIL 1–3 selon modèle |

---

## 5. Vannes ESD — Points d'attention

Les vannes sont **le maillon le plus faible** de la plupart des SIF process.

### Failure mode to consider

| Mode de défaillance | Type | Impact |
|---|---|---|
| Vanne coincée ouverte (fail-open) | Dangereux non détecté | Ne se ferme pas sur demande |
| Vanne coincée fermée (fail-close) | Sûr | Faux trip |
| Fuite interne | Dangereux | Dégradation graduelle |
| Défaillance actionneur pneumatique | Selon position de sécurité | — |

### Amelioration DC vanne

1. **Retour de position** (fin de course open/close) → DC ≈ 60–75%
2. **Partial Stroke Test (PST)** automatique → DC ≈ 85–90%
3. **Full Stroke Test** lors du proof test → remise à zéro λDU accumulé

### Position de sécurité (fail-safe)

- **Fail-close** (FC) : vanne se ferme sur perte d'énergie → pour isolement, arrêt
- **Fail-open** (FO) : vanne s'ouvre sur perte d'énergie → pour refroidissement, dépressurisation
- **Fail-lock** (FL) : vanne reste en position → à éviter sauf analyse spécifique

---

## 6. Bibliothèque composants PRISM — Utilisation

### Créer un composant depuis la bibliothèque

1. Aller dans **Library** → sélectionner le type (Sensor / Logic / Actuator)
2. Renseigner : tag, fabricant, modèle, λD, λS, DC, SFF, certification
3. Le composant est disponible dans toutes les SIF du workspace

### Paramètres obligatoires

| Paramètre | Obligatoire | Notes |
|---|---|---|
| `λD` (lambdaD) | ✅ | En /h — source : certificat fabricant |
| `λS` (lambdaS) | ✅ | En /h |
| `DC` | ✅ | En % (0–100) |
| `SFF` | Calculé auto | `(λS + λD×DC) / (λS + λD)` |
| Certification | Recommandé | IEC 61508 SIL X — numéro certificat |
| MTTR | Pour λDD | En heures — si non renseigné : 8h par défaut |

### Données par défaut si manquantes

PRISM applique des valeurs conservatrices (worst case) si les données ne sont pas renseignées :
- λD manquant : erreur bloquante
- DC manquant : 0% (aucun diagnostic)
- MTTR manquant : 8h

---

## 7. Données de défaillance — Sources de référence

| Source | Domaine | Accès |
|---|---|---|
| **OREDA** | Offshore oil & gas | Base de données défaillances terrain |
| **exida SERH** | Instruments process | Données certifiées par exida |
| **Certificats IEC 61508** | Composants certifiés | Fournis par le fabricant |
| **FARADIP** | Électronique industrielle | Base historique |
| **IEEE 493** | Équipements électriques | Standard industriel |
| **Données propriétaires** | Site spécifique | Retour d'expérience interne |

**Règle** : toujours citer la source des données λD dans la SIF et dans le rapport de preuve.
