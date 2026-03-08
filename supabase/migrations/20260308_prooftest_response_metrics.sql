alter table public.prism_proof_procedures
add column if not exists response_checks jsonb not null default '[]'::jsonb;

alter table public.prism_proof_campaigns
add column if not exists response_measurements jsonb not null default '[]'::jsonb;
