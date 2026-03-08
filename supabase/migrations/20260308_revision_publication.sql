alter table prism_sifs
  add column if not exists revision_locked_at timestamptz,
  add column if not exists locked_revision_id uuid references prism_sif_revisions(id) on delete set null;

alter table prism_sif_revisions
  add column if not exists report_artifact jsonb,
  add column if not exists proof_test_artifact jsonb,
  add column if not exists report_config_snapshot jsonb;
