# PRISM AI — Knowledge Base

> Fichiers injectés systématiquement dans le contexte de l'IA PRISM.
> Ne pas modifier sans revue technique — ces fichiers définissent l'expertise métier de l'IA.

## Fichiers

| Fichier | Contenu | Tokens ~estimés |
|---------|---------|-----------------|
| `iec61511-part1.md` | Exigences fondamentales IEC 61511-1:2016 — SIL, SRS, contraintes architecturales, proof tests | ~2 200 |
| `sil-methodology.md` | Formules PFD, architectures de vote, β factor, DC, SFF, PST, interprétation résultats | ~2 400 |
| `hazop-lopa.md` | HAZOP mots guides, LOPA formule + exemples, lien vers SIF PRISM | ~2 000 |
| `components-guide.md` | Capteurs, logic solvers, actionneurs — λD typiques, DC, SFF, architectures | ~2 300 |
| `prism-guide.md` | Workflow PRISM, onglets SIF, diagnostics, bibliothèque, raccourcis | ~2 100 |

**Total knowledge base** : ~11 000 tokens — compatible Mistral 32k et Claude 200k.

## Stratégie d'injection

```python
# Ordre d'injection dans le system prompt
1. iec61511-part1.md    → toujours
2. sil-methodology.md  → toujours
3. hazop-lopa.md        → si question HAZOP/LOPA détectée OU si contexte SIF
4. components-guide.md  → si question composant/architecture détectée
5. prism-guide.md       → toujours (guide l'IA dans l'app)
```

## Mise à jour

Ces fichiers doivent être mis à jour lors de :
- Nouvelle version de l'IEC 61511 (amendements)
- Ajout de nouveaux types de composants dans la bibliothèque PRISM
- Évolution du workflow ou des onglets de l'application
- Retour d'expérience sur des réponses incorrectes de l'IA

## Fichiers à venir

- `iec61508-relevant.md` — clauses IEC 61508 pertinentes pour les composants
- `proof-test-procedures.md` — rédaction de procédures proof test
- `reporting-guide.md` — structure du dossier de preuve IEC 61511
- `french-regulations.md` — réglementations françaises applicables (ICPE, SEVESO)
