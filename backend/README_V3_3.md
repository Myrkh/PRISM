# PRISM SIL Engine — Backend Python V3.3

## Architecture
```
main.py              (646 lignes) — FastAPI endpoints
solver/
  formulas.py        (420 lignes) — PFD/PFH IEC analytique (V3.2 validé)
  extensions.py      (648 lignes) — Extensions V3.3 (6 nouvelles features)
  markov.py          (333 lignes) — CTMC exact
  pst.py             (228 lignes) — PST multi-phases
  str_solver.py      (169 lignes) — STR analytique + Markov
  montecarlo.py      (156 lignes) — Monte Carlo
  pds.py             ( 59 lignes) — PDS partiel
tests/
  test_verification.py (352 lignes) — 79+ cas de test
```
**Total : 3253 lignes Python**

## Nouveautés V3.3 (vs V3.2)

### 1. `pfh_moon(p, k, n)` — PFH koon généralisé
- Toutes architectures : 1oo4, 2oo4, 3oo4, koon
- Formule : coeff=n!/(k-1)! × lD_eff^r × lDU × ∏tGEi + β×λDU
- Validé IEC Tables B.10/B.13 Δ<0.2%
- Endpoint : POST /v2/koon/compute

### 2. `pfd_instantaneous(p, arch)` — PFD(t) courbe dents de scie
- PFD(t) instantané sur période T1
- Retourne : pfd_t[], pfd_avg, pfd_max, sil_avg, sil_worst, frac_sil{}
- pfd_max ≈ 2× pfd_avg pour 1oo2 (cohérent IEC)
- Endpoint : POST /v2/pfd/curve

### 3. `pfd_mgl(p, arch, mgl)` — MGL CCF
- Modèle Multiple Greek Letters : β (paires), γ (triplets), δ (quadruplets)
- 1oo2 ratio≈1 (paires = β), 1oo3 MGL < β-simple (triplet < paire)
- Endpoint : POST /v2/ccf/mgl

### 4. `architectural_constraints()` + `sil_achieved()` — SFF + HFT Route 1H/2H
- SFF = (λS+λDD)/(λS+λDD+λDU)
- HFT = n-k
- Tableau Route 1H : SFF×Type(A/B)×HFT → SIL max
- Verdict final = min(SIL_prob, SIL_arch) — principe du maillon faible
- Validé NTNU slide17 : SFF=85% TypeB HFT=1 → SIL2 ✓
- Endpoint : POST /v2/arch/constraints

### 5. `pfd_demand_duration()` — Durée de demande
- µde = 1/demand_duration, µDU = 1/(T1/2+MRT)
- PFD1 = λDU×µde/[(λde+µde)(λde+µDU)]
- PFD2 = λDU/(λde+µDU)  [recommandé si λde<<µde]
- Endpoint : POST /v2/pfd/demand_duration

### 6. `route_compute()` — Routage auto IEC → Markov
- Critère : λD×T1 > 0.1 → basculer vers Markov CTMC
- Fallback IEC défensif si Markov échoue
- Endpoint : POST /v2/compute/auto

### Bonus : `pfd_koon_generic(p, k, n)` + `pfd_arch_extended(p, arch)`
- PFD pour 1oo4, 2oo4, 3oo4 et toute koon
- Dispatch étendu avec fallback générique

## Sources
- IEC 61508-6 Annexe B — formules PFD/PFH (toutes validées)
- NTNU Ch8 (PFD Markov, demand duration), Ch9 (PFH koon)
- NTNU Architectural Constraints slides (Route 1H/2H)
- Omeiri/Innal 2021 JESA — pfh_1oo2_corrected (NON VÉRIFIÉ)
- Innal/Lundteigen RESS 2016 — PST 3 repair times (EN ATTENTE)

## Validation
- 79 cas de test, 0 FAIL, 100% acceptable (<10%)
- T11 (λT1=2.19, Markov requis) : seul cas IEC simplifié invalide (connu)
