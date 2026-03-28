# backend/ — API FastAPI + Moteur SIL Python

## Stack
- Python 3.11 + FastAPI + Uvicorn (port 8000)
- PyInstaller → `PRISM-backend.exe` (bundle avec le frontend dans dist/)

## Endpoints

```
GET  /health, /api/health                → Health check
POST /api/engine/sil/compute             → Calcul SIL (PFD, PFH, verdict)
POST /api/engine/sil/report              → Génération rapport SIL
GET  /api/engine/library/components      → Liste composants bibliothèque
POST /api/library/*                      → API bibliothèque (CRUD templates)
POST /api/ai/chat                        → Stream chat PRISM AI (SSE)
GET  /api/ai/health                      → Health check service IA
GET  /api/ai/models                      → Modèles disponibles
/                                        → Sert le frontend (dist/ statique)
```

## Structure

```
backend/
├── main.py                              # FastAPI app init, static mount, uvicorn runner
├── requirements.txt                     # Dépendances Python
├── prism.spec                           # PyInstaller spec (→ PRISM-backend.exe)
├── app/
│   ├── schemas.py                       # Pydantic modèles request/response
│   ├── routes/
│   │   ├── engine.py                    # /api/engine/* (calcul SIL, bibliothèque)
│   │   └── ai.py                        # /api/ai/* (chat streaming, modèles)
│   └── services/
│       ├── sil_service.py               # Logique calcul SIL (wraps sil-py)
│       ├── sil_report_service.py        # Génération rapports
│       ├── component_library_service.py # Bibliothèque composants
│       ├── knowledge_service.py         # Base de connaissances IEC 61511
│       └── ai_service.py               # Orchestration appels LLM (Anthropic + Mistral)
├── sil-py/                              # Bibliothèque calcul SIL pure Python
│   └── sil_engine/
│       ├── formulas.py                  # Formules IEC 61511
│       ├── markov.py                    # Modèles de Markov
│       ├── montecarlo.py               # Simulation Monte Carlo
│       └── pds.py, pst.py, str_solver.py, ...
└── ptc_package_py/                      # Knowledge base Proof Test Campaign
    └── ptc_engine/                      # Scoring, parsing, reporting
```

## Providers IA supportés
- **Anthropic** : claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5
- **Mistral AI** : mistral-large-latest, mistral-small-latest, mistral-nemo
- Le provider est détecté automatiquement depuis le préfixe du model ID

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
