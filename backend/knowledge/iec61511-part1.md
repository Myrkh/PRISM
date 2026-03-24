# IEC 61511 — Partie 1 : Exigences fondamentales SIS

> Base de connaissance PRISM AI — IEC 61511-1:2016 + Amendement 1:2017
> Source de référence pour toute analyse de sécurité fonctionnelle dans PRISM.

---

## 1. Domaine d'application

IEC 61511 s'applique aux **systèmes instrumentés de sécurité (SIS)** dans l'**industrie de process** :
pétrochimie, chimie, raffinage, oil & gas, énergie, pharmacie, agroalimentaire.

Elle couvre le **cycle de vie de sécurité complet** : de l'analyse de risque à la mise hors service.

**Exclure** : équipements électriques/électroniques programmables hors process (→ IEC 61508).

---

## 2. Terminologie clé

| Terme | Définition |
|-------|-----------|
| **SIS** (Safety Instrumented System) | Système instrumenté dédié à la sécurité : capteurs + logique + actionneurs |
| **SIF** (Safety Instrumented Function) | Fonction de sécurité individuelle réalisée par un SIS |
| **SIL** (Safety Integrity Level) | Niveau discret 1→4 d'intégrité de sécurité requis |
| **PFD** (Probability of Failure on Demand) | Probabilité de défaillance à la sollicitation (mode demand) |
| **PFH** (Probability of Failure per Hour) | Fréquence de défaillance (mode continuous) |
| **PST** (Process Safety Time) | Délai maximal entre l'apparition du danger et l'action SIS requise |
| **MTTF** | Mean Time To Failure |
| **DC** (Diagnostic Coverage) | Fraction des défaillances dangereuses détectées par autodiagnostic |
| **SFF** (Safe Failure Fraction) | Fraction des défaillances non dangereuses + détectées |
| **β (beta factor)** | Fraction des défaillances en cause commune (CCF) |
| **λD** | Taux de défaillance dangereuse (/h) |
| **λS** | Taux de défaillance sûre (/h) |
| **T1** | Intervalle de test de preuve (proof test interval) |
| **TH** | Mission time (durée de vie totale du SIS) |
| **MTTR** | Mean Time To Restore (après détection) |

---

## 3. Niveaux SIL et PFD/PFH requis

### Mode faible sollicitation (Demand mode) — PFDavg

| SIL | PFDavg (mode demand) | Réduction du risque |
|-----|---------------------|---------------------|
| 1   | 10⁻² ≥ PFD > 10⁻¹   | 10 à 100            |
| 2   | 10⁻³ ≥ PFD > 10⁻²   | 100 à 1 000         |
| 3   | 10⁻⁴ ≥ PFD > 10⁻³   | 1 000 à 10 000      |
| 4   | 10⁻⁵ ≥ PFD > 10⁻⁴   | 10 000 à 100 000    |

### Mode haute sollicitation / continu (High demand / Continuous) — PFH

| SIL | PFH (/h) |
|-----|----------|
| 1   | 10⁻⁵ ≥ PFH > 10⁻⁶ |
| 2   | 10⁻⁶ ≥ PFH > 10⁻⁷ |
| 3   | 10⁻⁷ ≥ PFH > 10⁻⁸ |
| 4   | 10⁻⁸ ≥ PFH > 10⁻⁹ |

**Règle pratique** : si le taux de sollicitation dépasse 1 fois par an → mode continu.

---

## 4. Cycle de vie de sécurité (Safety Lifecycle)

```
Phase 1  — Analyse du risque process (HAZOP / LOPA)
           → Identification des EUC hazards
           → Détermination du risque tolérable

Phase 2  — Attribution des SIF (Allocation)
           → Chaque SIF reçoit un SIL cible issu du LOPA
           → Spécification des exigences de sécurité (SRS)

Phase 3  — Conception et vérification SIS
           → Architecture matérielle
           → Calcul PFD / vérification SIL
           → Vérification SFF et contraintes architecturales

Phase 4  — Réalisation, installation, mise en service
           → Tests d'acceptation FAT/SAT
           → Proof test initial

Phase 5  — Exploitation et maintenance
           → Proof tests périodiques
           → Campagnes de test
           → Gestion des modifications (MOC)

Phase 6  — Désaffectation
           → Retrait sûr du SIS
```

---

## 5. Exigences de la Spécification des Exigences de Sécurité (SRS)

La SRS est le document **obligatoire** définissant chaque SIF. Elle doit inclure :

### Exigences obligatoires SRS (clause 10)
- Identification du danger et de l'EUC concerné
- État sûr (safe state) pour chaque SIF
- **Process Safety Time (PST)** — temps disponible pour l'action SIS
- **Temps de réponse SIF** — doit être < PST (typiquement < 1/3 du PST)
- SIL cible (issu du LOPA)
- Mode de fonctionnement (demand / high demand / continuous)
- Taux de sollicitation attendu
- Fonctions de bypasse et d'inhibition
- Exigences de disponibilité et de tolérance aux pannes
- Exigences de preuve de test (test proof interval, couverture)

### Vérification SRS
La SRS doit être validée contre l'analyse de risque (LOPA).
Toute modification de la SRS déclenche une nouvelle vérification.

---

## 6. Détermination du SIL — Méthodes

### LOPA (Layer of Protection Analysis)
Méthode quantitative recommandée :
```
Fréquence du scénario initiateur (IE)
× Facteur de modification (conditionnels, probabilités d'ignition...)
÷ Facteur de réduction chaque IPL indépendante
= Fréquence résiduelle après tous IPL sauf SIS

→ SIL requis = fréquence résiduelle / fréquence tolérée
```

### Matrice de risque
Méthode qualitative : croisement Gravité × Probabilité → niveau de risque → SIL.
Moins précise que LOPA, acceptable pour des systèmes simples.

---

## 7. Contraintes architecturales (clause 11.4)

Les contraintes architecturales limitent le SIL max atteignable selon la SFF.

### Tableau 3 — Composants sans tolérance aux pannes matérielles (HFT=0)

| SFF | SIL max (HFT=0) |
|-----|-----------------|
| < 60%  | SIL 1 |
| 60–90% | SIL 2 |
| 90–99% | SIL 3 |
| ≥ 99%  | SIL 3 |

### Tableau 4 — Composants avec HFT=1

| SFF | SIL max (HFT=1) |
|-----|-----------------|
| < 60%  | SIL 2 |
| 60–90% | SIL 3 |
| 90–99% | SIL 4 |
| ≥ 99%  | SIL 4 |

**HFT (Hardware Fault Tolerance)** = nombre de défaillances dangereuses tolérées sans perte de la fonction de sécurité.
- 1oo1 → HFT = 0
- 1oo2, 2oo2 → HFT = 1
- 2oo3 → HFT = 1

---

## 8. Exigences pour les proof tests (clause 16)

Le proof test doit détecter les défaillances **non détectées par l'autodiagnostic**.

### Exigences minimales
- Couverture du proof test (PTC) définie dans la SRS
- Périodicité respectée (T1)
- Documentation obligatoire : date, résultats, technicien responsable
- Restauration de l'état opérationnel après test

### Couverture proof test recommandée
- SIL 1 : ≥ 60%
- SIL 2 : ≥ 90%
- SIL 3 : ≥ 99%

---

## 9. Bypass et inhibition

Tout bypass d'une SIF doit :
- Être autorisé par une procédure formelle (permis)
- Déclencher une mesure de compensation (ronde, surveillance accrue)
- Être tracé (horodatage, durée, responsable)
- Respecter une durée maximale définie dans la SRS

---

## 10. Compétences et gestion des personnes

IEC 61511 exige que toutes les personnes impliquées dans le cycle de vie SIS aient des **compétences démontrées** adaptées à leur rôle :
- Ingénieur SIS : formation spécifique IEC 61511 recommandée (TÜV FS Engineer)
- Toute activité doit être supervisée et documentée

---

## 11. Gestion des modifications (MOC)

Toute modification d'un SIS existant doit :
1. Être évaluée selon le processus MOC
2. Redéclencher les phases du lifecycle affectées
3. Faire l'objet d'une révision de la SRS si nécessaire
4. Être documentée dans le dossier de preuve (Safety Case)
