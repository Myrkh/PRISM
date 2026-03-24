# Méthodologie de calcul SIL — Guide PRISM

> Base de connaissance PRISM AI — Formules, architectures, interprétation des résultats
> Ce document couvre les calculs PFD implémentés dans le moteur PRISM (sil-py).

---

## 1. Formules PFD de base

### Architecture 1oo1 (un capteur, une voie)

```
PFDavg(1oo1) = λD × T1 / 2
```

Avec :
- `λD` = taux de défaillance dangereuse non détectée (/h)
- `T1` = intervalle de proof test (heures)

**Exemple** : λD = 1×10⁻⁶/h, T1 = 8760h (1 an)
→ PFD = 1e-6 × 8760 / 2 = **4.38×10⁻³** → SIL 2 atteint ✅

### Architecture 1oo2 (redondance active — vote 1 sur 2)

```
PFDavg(1oo2) = λDU² × T1² / 3  +  β × λDU × T1 / 2
```

Termes :
- Premier terme : défaillances indépendantes (deux capteurs simultanément en panne)
- Second terme : défaillances en cause commune (CCF) via le facteur β

**Comportement** : très bonne disponibilité (1 voie suffit pour déclencher), mais faible sécurité si β élevé.

### Architecture 2oo2 (vote 2 sur 2)

```
PFDavg(2oo2) = λDU × T1
```

Pire que 1oo1 en termes de sécurité mais meilleure disponibilité (pas de faux déclenchement).
Rarement utilisé seul pour la sécurité.

### Architecture 2oo3 (vote 2 sur 3 — référence industrielle)

```
PFDavg(2oo3) = 3 × λDU² × T1² / 4  +  β × λDU × T1 / 2
```

**La plus utilisée pour SIL 2–3** : équilibre optimal sécurité / disponibilité.
- HFT = 1 (tolère 1 défaillance dangereuse sans perte de fonction)
- SFF généralement > 90% sur des composants modernes

### Architecture koon (générique)

Pour k-oo-n vote :
```
PFDavg(koon) = C(n,k) × λDU^(n-k+1) × T1^(n-k+1) / (n-k+2)  +  β × λDU × T1 / 2
```

---

## 2. Facteur β (Beta — Common Cause Failure)

Le β représente la fraction des défaillances simultanées dues à une cause commune.
Il **contrecarre directement le bénéfice de la redondance**.

### Valeurs typiques

| Architecture | β recommandé | Conditions |
|---|---|---|
| 1oo2, 2oo3 — même constructeur, même lieu | 5–10% | Séparation physique insuffisante |
| 1oo2, 2oo3 — constructeurs différents | 2–5% | Diversité technologique |
| 1oo2, 2oo3 — diversité totale + séparation | 1–2% | Bonnes pratiques CCF |
| Voies complètement isolées (câblage séparé, boîtiers séparés) | 1% | Séparation maximale |

### Impact du β sur le PFD 2oo3

```
β = 10% : PFD_CCF = 0.10 × λD × T1/2  →  domine si λD×T1 < 0.1
β = 1%  : PFD_CCF = 0.01 × λD × T1/2  →  négligeable
```

**Règle** : Si β×λD×T1/2 > 3×λD²×T1²/4 → les CCF dominent → ajouter de la diversité.

---

## 3. Diagnostic Coverage (DC)

DC = fraction des défaillances dangereuses détectées par autodiagnostic.

```
λDU = λD × (1 - DC)    // Dangereux Non-Détecté
λDD = λD × DC           // Dangereux Détecté
```

Dans les formules PFD, seul **λDU** est utilisé (les λDD sont supposés corrigés rapidement via MTTR).

### Valeurs DC typiques

| Technologie | DC typique |
|---|---|
| Capteur sans diagnostic | 0% |
| Capteur avec autotest basique | 60–80% |
| Transmetteur HART avec diagnostics avancés | 90–95% |
| Capteur certifié SIL avec diagnostics complets | 97–99% |
| Actionneur sans retour de position | 0% |
| Vanne avec retour de position | 60–75% |
| Vanne avec test partiel de course (PST) | 85–90% |

---

## 4. SFF (Safe Failure Fraction)

```
SFF = (λS + λDD) / (λS + λD)
    = (λS + λD × DC) / (λS + λD)
```

La SFF est utilisée pour déterminer les **contraintes architecturales** (SIL max atteignable).

### Impact sur le SIL max (IEC 61511 tableau 3, HFT=0)

| SFF | SIL max HFT=0 | SIL max HFT=1 |
|-----|---|---|
| < 60%  | SIL 1 | SIL 2 |
| 60–90% | SIL 2 | SIL 3 |
| 90–99% | SIL 3 | SIL 4 |
| ≥ 99%  | SIL 3 | SIL 4 |

**Attention** : SFF élevée ≠ PFD faible. SFF gouverne les contraintes architecturales, PFD gouverne la performance quantitative.

---

## 5. PFD système complet

Un SIF est composé de trois sous-systèmes en série fonctionnelle :

```
PFD_SIF = PFD_capteurs + PFD_logique + PFD_actionneurs
```

**Exemple SIF complet SIL 2** :
- Capteurs 2oo3 PT : PFD = 3.2×10⁻³
- Logic solver Allen-Bradley : PFD = 2×10⁻⁴
- Vanne ESD + actionneur : PFD = 8×10⁻⁴
→ **PFD_SIF = 4.2×10⁻³** → SIL 2 ✅

---

## 6. Interprétation des résultats

### Lecture d'un résultat PFD

| PFD calculé | SIL atteint | Marge |
|---|---|---|
| 9.9×10⁻³ | SIL 1 | Très faible — surveiller |
| 5×10⁻³ | SIL 2 | Limite basse SIL 2 |
| 1×10⁻³ | SIL 2 | Confortable |
| 1.1×10⁻⁴ | SIL 3 | Bonne marge |
| 9×10⁻⁵ | SIL 3 | Très faible — proche SIL 2 |

### Règles d'écart PFD

Un écart SIL (PFD calculé > PFD target) exige obligatoirement :
1. **Justification documentée** dans le dossier de preuve
2. **Mesure compensatoire** : réduction T1, ajout voie redondante, amélioration DC, ou IPL additionnelle dans le LOPA
3. **Approbation du responsable sécurité**

---

## 7. Mission time et son impact

```
PFD(T1, TH) = λDU × T1/2 × (1 + λDU × TH/6)   // formule complète mission time
```

Pour λDU×TH << 1, le terme correction est négligeable.
Pour TH = 20 ans (175 200h) et λD = 1e-6/h → λD×TH = 0.175 → impact ~3%.

**Bonne pratique** : Mission time TH = 20 ans pour les équipements process standard.

---

## 8. Preuve de test (Proof Test)

### Formule avec couverture proof test (PTC)

```
λDU_effectif = λD × (1 - DC) × (1 - PTC)
```

Un proof test à 90% de couverture réduit λDU_effectif à 10% de sa valeur initiale → PFD divisé par 10.

### Fréquence proof test recommandée par SIL

| SIL cible | T1 recommandé | Couverture recommandée |
|---|---|---|
| SIL 1 | 1–3 ans | ≥ 60% |
| SIL 2 | 6 mois–1 an | ≥ 90% |
| SIL 3 | 1–6 mois | ≥ 99% |

---

## 9. Process Safety Time (PST) et temps de réponse SIF

### Règle de base

```
t_réponse_SIF < PST
```

### Bonne pratique industrielle

```
t_réponse_SIF ≤ PST / 2   // laisser une marge pour les incertitudes
```

### Décomposition du temps de réponse SIF

```
t_SIF = t_détection + t_logique + t_action_actionneur
```

- Capteur pressure : 0.1–2s
- Transmetteur HART : 0.5–3s
- Logic solver (scan cycle) : 10–100ms typique
- Vanne ESD à fermeture rapide : 1–10s selon taille

**Si t_SIF ≥ PST** : écart bloquant — revoir l'architecture ou le PST avec le process engineer.

---

## 10. Diagnostics courants et leur signification

| Code diagnostic PRISM | Cause | Action recommandée |
|---|---|---|
| `MISSING_PST` | PST non renseigné dans SRS | Saisir le PST — obligatoire IEC 61511 clause 10 |
| `MISSING_SAFE_STATE` | État sûr non défini | Définir l'état sûr (vanne fermée, pompe arrêtée...) |
| `RESPONSE_TIME_EXCEEDS_PST` | t_réponse ≥ PST | Réduire temps de réponse ou réviser PST avec process |
| `SFF_TOO_LOW` | SFF < seuil pour SIL cible | Améliorer DC ou changer technologie composant |
| `PFD_TARGET_MISSED` | PFD calculé > PFD cible | Réduire T1, ajouter voie, améliorer DC |
| `MISSING_PROOF_TEST` | Aucune campagne de test | Créer une campagne avec T1 conforme SRS |
| `CCF_DOMINATES` | Terme β >> terme indépendant | Augmenter séparation ou diversité |
