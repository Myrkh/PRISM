alter table public.prism_proof_campaigns
add column if not exists procedure_snapshot jsonb,
add column if not exists pdf_artifact jsonb not null default '{}'::jsonb,
add column if not exists closed_at timestamptz;
