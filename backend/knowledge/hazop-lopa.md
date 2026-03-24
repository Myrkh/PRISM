# HAZOP & LOPA — Guide méthodologique PRISM

> Base de connaissance PRISM AI — Analyse des risques process
> Fondement de toute allocation SIL dans PRISM.

---

## 1. HAZOP — Hazard and Operability Study

### Principe

Le HAZOP est une analyse systématique de toutes les déviations possibles des paramètres process.

### Structure d'un nœud HAZOP

```
Nœud : Ligne de transfert de propane L-101
Intention : Transfert propane liquide de T-101 vers T-201, débit 50 m³/h, P=8bar

Mot guide   Paramètre   Déviation           Cause               Conséquence            Mesures existantes    SIF requis
─────────── ─────────── ─────────────────── ─────────────────── ────────────────────── ──────────────────── ──────────
PLUS        Pression    Surpression ligne   Défaillance vanne   Rupture ligne → BLEVE  PSV-101 (IPL)        SIF-001 SIL 2
MOINS       Débit       Débit nul           Bouchage filtre     Cavitation pompe P-101  Alarme niveau        SIF-002 SIL 1
INVERSE     Débit       Retour de débit     Défaillance clapet  Contamination T-101     Clapet anti-retour   Non requis
```

### Mots guides IEC 61511

| Mot guide | Application |
|---|---|
| PLUS (More) | Plus de paramètre : débit trop élevé, pression trop haute |
| MOINS (Less) | Moins de paramètre : débit faible, niveau bas |
| AUCUN (None/No) | Absence totale : pas de débit, pas de pression |
| INVERSE (Reverse) | Sens opposé : retour de débit |
| AUTRE QUE (Other than) | Autre matière, autre état (liquide → gaz) |
| PLUS TÔT (Early) | Événement prématuré |
| PLUS TARD (Late) | Événement tardif |

### Lien HAZOP → SIF dans PRISM

Le champ **`hazardousEvent`** de la SIF est la conséquence HAZOP.
Le champ **`demandRate`** est la fréquence de la cause (IE) estimée lors du HAZOP.

---

## 2. LOPA — Layer of Protection Analysis

### Principe

Le LOPA quantifie le risque résiduel après application des couches de protection indépendantes (IPL).

### Formule LOPA de base

```
f_mitigated = f_IE × PFD_EUC × P_conditions × ∏ PFD_IPL_i

Avec :
  f_IE         = fréquence de l'événement initiateur (/an)
  PFD_EUC      = probabilité de défaillance de l'EUC à créer le danger
  P_conditions = probabilités conditionnelles (ignition, présence humaine...)
  PFD_IPL_i    = PFD de chaque IPL indépendante (hors SIS)
```

### Fréquences initiateurs typiques

| Type d'initiateur | Fréquence typique (/an) |
|---|---|
| Défaillance pompe simple | 0.1 |
| Défaillance vanne de contrôle | 0.1 |
| Perte d'utilité (électricité, instrument air) | 0.01–0.1 |
| Défaillance tuyauterie (petite fuite) | 0.001–0.01 |
| Erreur opérateur (tâche routinière) | 0.01–0.1 |
| Erreur opérateur (tâche sous supervision) | 0.001–0.01 |
| Défaillance compresseur | 0.01–0.1 |

### IPL valides (Independent Protection Layers)

Pour être IPL valide, une couche doit être :
- **Indépendante** : défaillance d'une IPL ne peut causer ou empêcher une autre
- **Efficace** : PFD ≤ 0.1 (facteur de réduction ≥ 10)
- **Auditable** : preuve de maintien de la performance

| Type IPL | PFD typique | Notes |
|---|---|---|
| Soupape de sécurité PSV calibrée | 0.01 | Doit être maintenue, testée |
| Rupture disc | 0.001–0.01 | Très fiable, non réarmable |
| Fond d'une cuvette de rétention | 0.01 | Si correctement dimensionnée |
| Alarme + action opérateur (10 min) | 0.1 | Dégradé si opérateur surchargé |
| Alarme + action opérateur (< 1 min) | Non valid | Temps insuffisant |
| SIS (SIF) | Selon PFD calculé | La SIF est une IPL |
| BPCS (régulation normale) | Non valide | Non indépendant de la cause |

### Fréquences tolérables (risk tolerance criteria)

| Gravité de la conséquence | Fréquence tolérée (/an) |
|---|---|
| Décès multiple, catastrophe | 10⁻⁵ |
| Décès unique | 10⁻⁴ |
| Blessure grave | 10⁻³ |
| Blessure légère | 10⁻² |
| Impact environnemental majeur | 10⁻⁵ – 10⁻⁴ |

**Note** : ces valeurs varient selon les entreprises, réglementations locales et secteur. PRISM utilise celles spécifiées dans `standards.md` du workspace.

### Exemple LOPA complet

```
Scénario : Surpression réacteur R-101 → explosion → décès

f_IE = 0.1/an   (défaillance vanne contrôle pression)
PFD_conditions = 0.5  (probabilité que la pression atteigne la limite)

IPL 1 : Alarme haute pression + opérateur (10 min) → PFD = 0.1
IPL 2 : PSV-101 soupape de sécurité → PFD = 0.01

f_mitigated avant SIF = 0.1 × 0.5 × 0.1 × 0.01 = 5×10⁻⁵ /an

Fréquence tolérée décès = 10⁻⁵ /an

SIF requis = 5×10⁻⁵ / 10⁻⁵ = 5 → PFD SIF requis ≤ 2×10⁻¹ → SIL 1
```

---

## 3. Lien LOPA → SIF dans PRISM

### Champs SIF issus du LOPA

| Champ SIF PRISM | Source LOPA |
|---|---|
| `targetSIL` | SIL calculé par LOPA |
| `demandRate` | f_IE × P_conditions × ∏PFD_IPL_i (hors SIS) |
| `hazardousEvent` | Description de la conséquence du scénario |
| `processSafetyTime` | Délai disponible avant conséquence — issu de l'étude process |

### Vérification cohérence SIL cible

```
Si f_initiateur_résiduel / f_tolérée ∈ [10, 100)  → SIL 1 requis
Si f_initiateur_résiduel / f_tolérée ∈ [100, 1000) → SIL 2 requis
Si f_initiateur_résiduel / f_tolérée ∈ [1000, 10000)→ SIL 3 requis
```

---

## 4. Trace HAZOP dans PRISM

La section **HAZOP** de PRISM stocke les traces HAZOP liées à chaque SIF :

```
HAZOPTrace {
  node        : nœud d'analyse (ex: "Ligne L-101")
  parameter   : paramètre étudié (pression, débit, température...)
  guideWord   : mot guide (MORE, LESS, NO, REVERSE, OTHER...)
  deviation   : description de la déviation
  cause       : cause identifiée
  consequence : conséquence (gravité, fréquence)
  safeguards  : mesures existantes listées
  sipRequirement : SIF requis (lien vers SIF)
  lopaResult  : résultat LOPA justifiant le SIL
}
```

Cette trace assure la **traçabilité complète** exigée par IEC 61511 entre le risque identifié et la SIF mise en place.

---

## 5. Bonnes pratiques

### Fréquences coupées les plus communes

- Ne jamais attribuer PFD < 0.01 à un BPCS (regulatory control) comme IPL
- Ne jamais attribuer PFD < 0.01 à une alarme avec < 10 min de délai d'action
- Vérifier l'indépendance des IPL avec soin (même source d'alimentation = pas indépendant)
- Documenter la base des fréquences initiateurs (source de données)

### Escalade automatique SIL

Si l'analyse LOPA donne un SIL requis ≥ 4 → l'architecture process doit être révisée.
IEC 61511 ne recommande pas SIL 4 en process industry — préférer réduire le risque à la source.
