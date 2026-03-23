# backend/ — API FastAPI + Moteur SIL Python

## Stack
- Python 3.11 + FastAPI + Uvicorn (port 8000)
- PyInstaller → `PRISM-backend.exe` (bundle avec le frontend dans dist/)

## Endpoints

```
GET  /health, /api/health           → Health check
POST /api/engine/calculate          → Calcul SIL (PFD, PFH, verdict)
GET  /api/engine/results            → Historique des runs
POST /api/library/*                 → API bibliothèque composants
/                                   → Sert le frontend (dist/ statique)
```

## Structure

```
backend/
├── main.py                         # FastAPI app init, static mount, uvicorn runner
├── requirements.txt                # Dépendances Python
├── prism.spec                      # PyInstaller spec (→ PRISM-backend.exe)
├── app/
│   ├── schemas.py                  # Pydantic modèles request/response
│   ├── routes/engine.py            # Route /api/engine/calculate
│   └── services/
│       ├── sil_service.py          # Logique calcul SIL (wraps sil-py)
│       ├── sil_report_service.py   # Génération rapports
│       └── component_library_service.py
├── sil-py/                         # Bibliothèque calcul SIL pure Python
│   └── sil_engine/
│       ├── formulas.py             # Formules IEC 61511
│       ├── markov.py               # Modèles de Markov
│       ├── montecarlo.py           # Simulation Monte Carlo
│       └── pds.py, pst.py, str_solver.py, ...
└── ptc_package_py/                 # Knowledge base Proof Test Campaign
    └── ptc_engine/                 # Scoring, parsing, reporting
```

## Dev
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

## Build PyInstaller
```bash
pyinstaller prism.spec
# → dist/PRISM-backend.exe (standalone, inclut Python runtime)
```
