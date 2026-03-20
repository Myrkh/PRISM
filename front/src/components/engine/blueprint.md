# Engine Blueprint

## Future Batch Run

Le batch run n’est pas prioritaire immédiatement, mais le socle est prêt :

- `prism_engine_run_batches` porte la campagne de calcul.
- `prism_engine_runs` porte chaque exécution individuelle liée au même `batch_id`.

Quand on l’ouvrira côté produit, le flux cible est :

1. choisir un périmètre :
   - toutes les SIF d’un projet
   - toutes les SIF sous cible
   - toutes les SIF publiées
   - une sélection explicite
2. créer une ligne `engine_run_batch`
3. créer les `engine_runs` enfants
4. suivre la progression dans `Engine > History`
5. projeter un résumé dans `Audit Log`

## UI cible

- entrée d’action `Batch run` dans `Engine`
- pas de surcharge dans `Audit Log`
- historique et progression pilotés depuis `Engine`
- `Audit Log` ne consomme qu’un résumé de lecture

## Traçabilité attendue

Pour chaque batch :

- `label`
- `scope`
- `status`
- `total_runs`
- `done_runs`
- `failed_runs`
- `created_by`
- `created_at`

Pour chaque run enfant :

- `trigger_kind = batch`
- `batch_id`
- `project_id`
- `sif_id`
- `requested_mode`
- `status`
- `backend_version`
- `payload_hash`
- `input_digest`
- `runtime_ms`
- `warning_count`
- `request_payload`
- `response_payload`
