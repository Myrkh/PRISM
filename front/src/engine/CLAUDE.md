# engine/ — Moteur de calcul SIL (TypeScript frontend)

## Rôle
Moteur de calcul PFD/PFH/SIL entièrement en TypeScript, exécuté côté frontend.
Le backend Python (`/api/engine`) est une alternative pour calculs lourds — mêmes algorithmes.

## Structure

```
engine/
├── index.ts              # Point d'entrée : export calculateSIF()
├── validation.ts         # Validation des inputs avant calcul
├── architectural.ts      # Calculs architecturaux (N°/K, redondances)
├── ccf.ts                # CCF (Common Cause Failure) — beta factor
├── resolver.ts           # Résolution composants → paramètres de calcul
├── tce.ts                # Test Coverage Effectiveness
├── str.ts                # Spurious Trip Rate
├── system.ts             # Calcul système (composition subsystems)
├── pfd/                  # Probability of Failure on Demand
│   ├── component.ts      # PFD par composant (1oo1, 1oo2, 2oo2, etc.)
│   ├── sif.ts            # PFD SIF total (produit des subsystems)
│   └── subsystem.ts      # PFD par sous-système
├── pfh/                  # Probability of Failure per Hour (mode HFT)
│   ├── component.ts
│   └── subsystem.ts
├── types/engine.ts       # Types internes du moteur
└── utils/
    ├── sil.ts            # Niveau SIL depuis PFD/PFH
    ├── stats.ts          # Utilitaires statistiques
    └── units.ts          # Conversion d'unités (FIT, h⁻¹, yr⁻¹)
```

## Utilisation
```ts
import { calculateSIF } from '@/engine'
const result = calculateSIF(sifConfig)
// result.pfd, result.sil, result.pfh, result.verdict
```

## Backend Python (équivalent)
- `backend/app/services/sil_service.py` — même logique en Python
- `backend/sil-py/sil_engine/` — bibliothèque de calcul pure Python
- API : `POST /api/engine/calculate`
- Schémas : `backend/app/schemas.py`
