# PRISM Safeloop — Monorepo

## Projets

| Dossier | Rôle | CLAUDE.md détaillé |
|---------|------|-------------------|
| `launcher/` | Electron app (installer + session manager) | `launcher/CLAUDE.md` |
| `front/` | PRISM Desktop app (React SPA) | `front/CLAUDE.md` |
| `backend/` | FastAPI SIL calc engine (Python) | `backend/CLAUDE.md` |
| `supabase/` | DB schema, migrations, RLS policies | — |
| `scripts/` | Scripts utilitaires build/deploy | — |

## Relation entre projets

```
launcher/
  └── ouvre une BrowserWindow sur → front/dist/   (PRISM Desktop)
  └── ouvre une BrowserWindow sur → launcher/dist/docs.html
                                      └── importe données depuis front/src/docs/

front/
  └── envoie requêtes de calcul → backend :8000/api/engine
  └── sync données → Supabase cloud

backend/
  └── sert front/dist/ en production (catch-all)
  └── PyInstaller bundle → PRISM-backend.exe
```

## CI/CD (GitHub Actions)
- Tag `launcher-v*` → build Windows NSIS installer → GitHub Release
- Tag `v*` (sans prefix) → build front/backend → deploy
- Workflows dans `.github/workflows/`

## Docker (dev/staging)
```bash
docker-compose up   # frontend :5173, backend :8000, nginx :80
```
