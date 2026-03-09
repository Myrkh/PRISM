create table public.prism_projects (
  id uuid not null default gen_random_uuid (),
  name text not null,
  ref text not null default ''::text,
  client text not null default ''::text,
  site text not null default ''::text,
  unit text not null default ''::text,
  standard text not null default 'IEC61511'::text,
  revision text not null default 'A'::text,
  description text not null default ''::text,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint prism_projects_pkey primary key (id),
  constraint prism_projects_standard_check check (
    (
      standard = any (
        array['IEC61511'::text, 'IEC61508'::text, 'ISA84'::text]
      )
    )
  ),
  constraint prism_projects_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'completed'::text,
          'archived'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger prism_projects_updated_at BEFORE
update on prism_projects for EACH row
execute FUNCTION prism_set_updated_at ();

create trigger trg_projects_updated_at BEFORE
update on prism_projects for EACH row
execute FUNCTION prism_update_updated_at ();

create table public.prism_proof_campaigns (
  id uuid not null default gen_random_uuid (),
  procedure_id uuid not null,
  sif_id uuid not null,
  project_id uuid not null,
  date text not null,
  team text null,
  verdict text null,
  notes text null,
  conducted_by text null,
  witnessed_by text null,
  step_results jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  response_measurements jsonb not null default '[]'::jsonb,
  procedure_snapshot jsonb null,
  pdf_artifact jsonb not null default '{}'::jsonb,
  closed_at timestamp with time zone null,
  constraint prism_proof_campaigns_pkey primary key (id),
  constraint prism_proof_campaigns_procedure_id_fkey foreign KEY (procedure_id) references prism_proof_procedures (id) on delete CASCADE,
  constraint prism_proof_campaigns_project_id_fkey foreign KEY (project_id) references prism_projects (id) on delete CASCADE,
  constraint prism_proof_campaigns_sif_id_fkey foreign KEY (sif_id) references prism_sifs (id) on delete CASCADE,
  constraint prism_proof_campaigns_verdict_check check (
    (
      verdict = any (
        array['pass'::text, 'fail'::text, 'conditional'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_proof_campaigns_procedure on public.prism_proof_campaigns using btree (procedure_id) TABLESPACE pg_default;

create index IF not exists idx_proof_campaigns_sif on public.prism_proof_campaigns using btree (sif_id) TABLESPACE pg_default;

create index IF not exists idx_proof_campaigns_project on public.prism_proof_campaigns using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_proof_campaigns_verdict on public.prism_proof_campaigns using btree (verdict) TABLESPACE pg_default;

create index IF not exists idx_proof_campaigns_date on public.prism_proof_campaigns using btree (date) TABLESPACE pg_default;

create index IF not exists idx_campaigns_procedure on public.prism_proof_campaigns using btree (procedure_id) TABLESPACE pg_default;

create index IF not exists idx_campaigns_sif on public.prism_proof_campaigns using btree (sif_id) TABLESPACE pg_default;

create index IF not exists idx_campaigns_verdict on public.prism_proof_campaigns using btree (verdict) TABLESPACE pg_default;

create trigger trg_campaigns_updated_at BEFORE
update on prism_proof_campaigns for EACH row
execute FUNCTION prism_update_updated_at ();

create trigger update_proof_campaigns_updated_at BEFORE
update on prism_proof_campaigns for EACH row
execute FUNCTION update_updated_at_column ();

create table public.prism_proof_procedures (
  id uuid not null default gen_random_uuid (),
  sif_id uuid not null,
  project_id uuid not null,
  ref text not null,
  revision text not null default 'A'::text,
  status text not null default 'draft'::text,
  periodicity_months smallint not null default 12,
  categories jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  made_by text null,
  made_by_date text null,
  verified_by text null,
  verified_by_date text null,
  approved_by text null,
  approved_by_date text null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  response_checks jsonb not null default '[]'::jsonb,
  constraint prism_proof_procedures_pkey primary key (id),
  constraint prism_proof_procedures_project_id_fkey foreign KEY (project_id) references prism_projects (id) on delete CASCADE,
  constraint prism_proof_procedures_sif_id_fkey foreign KEY (sif_id) references prism_sifs (id) on delete CASCADE,
  constraint prism_proof_procedures_status_check check (
    (
      status = any (
        array['draft'::text, 'ifr'::text, 'approved'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_proof_procedures_sif on public.prism_proof_procedures using btree (sif_id) TABLESPACE pg_default;

create index IF not exists idx_proof_procedures_project on public.prism_proof_procedures using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_proof_procedures_status on public.prism_proof_procedures using btree (status) TABLESPACE pg_default;

create index IF not exists idx_procedures_sif on public.prism_proof_procedures using btree (sif_id) TABLESPACE pg_default;

create index IF not exists idx_procedures_project on public.prism_proof_procedures using btree (project_id) TABLESPACE pg_default;

create trigger trg_procedures_updated_at BEFORE
update on prism_proof_procedures for EACH row
execute FUNCTION prism_update_updated_at ();

create trigger update_proof_procedures_updated_at BEFORE
update on prism_proof_procedures for EACH row
execute FUNCTION update_updated_at_column ();

create view public.prism_sif_proof_summary as
select
  s.id as sif_id,
  s.project_id,
  s.sif_number,
  p.id as procedure_id,
  p.ref as procedure_ref,
  p.status as procedure_status,
  p.periodicity_months,
  count(c.id) as campaign_count,
  max(c.date) as last_campaign_date,
  count(c.id) filter (
    where
      c.verdict = 'pass'::text
  ) as pass_count,
  count(c.id) filter (
    where
      c.verdict = 'fail'::text
  ) as fail_count,
  round(
    count(c.id) filter (
      where
        c.verdict = 'pass'::text
    )::numeric / NULLIF(count(c.id), 0)::numeric * 100::numeric,
    1
  ) as pass_rate_pct
from
  prism_sifs s
  left join prism_proof_procedures p on p.sif_id = s.id
  left join prism_proof_campaigns c on c.procedure_id = p.id
group by
  s.id,
  s.project_id,
  s.sif_number,
  p.id,
  p.ref,
  p.status,
  p.periodicity_months;

  create table public.prism_sif_revisions (
  id uuid not null default gen_random_uuid (),
  sif_id uuid not null,
  project_id uuid not null,
  revision_label text not null default ''::text,
  status text not null default 'draft'::text,
  change_description text not null default ''::text,
  created_by text not null default ''::text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  report_artifact jsonb null,
  proof_test_artifact jsonb null,
  report_config_snapshot jsonb null,
  constraint prism_sif_revisions_pkey primary key (id),
  constraint prism_sif_revisions_project_id_fkey foreign KEY (project_id) references prism_projects (id) on delete CASCADE,
  constraint prism_sif_revisions_sif_id_fkey foreign KEY (sif_id) references prism_sifs (id) on delete CASCADE,
  constraint prism_sif_revisions_status_check check (
    (
      status = any (
        array[
          'draft'::text,
          'in_review'::text,
          'verified'::text,
          'approved'::text,
          'archived'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_revisions_sif on public.prism_sif_revisions using btree (sif_id) TABLESPACE pg_default;

create index IF not exists idx_revisions_project on public.prism_sif_revisions using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_revisions_created on public.prism_sif_revisions using btree (created_at desc) TABLESPACE pg_default;

create table public.prism_sifs (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  sif_number text not null,
  revision text not null default 'A'::text,
  title text not null default ''::text,
  description text not null default ''::text,
  status text not null default 'draft'::text,
  pid text not null default ''::text,
  location text not null default ''::text,
  process_tag text not null default ''::text,
  hazardous_event text not null default ''::text,
  demand_rate numeric(12, 6) not null default 0.1,
  target_sil smallint not null default 2,
  rrf_required numeric(12, 2) not null default 100,
  made_by text not null default ''::text,
  verified_by text not null default ''::text,
  approved_by text not null default ''::text,
  doc_date text not null default ''::text,
  subsystems jsonb not null default '[]'::jsonb,
  proof_test_procedure jsonb null,
  test_campaigns jsonb not null default '[]'::jsonb,
  operational_events jsonb not null default '[]'::jsonb,
  hazop_trace jsonb null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  revision_locked_at timestamp with time zone null,
  locked_revision_id uuid null,
  constraint prism_sifs_pkey primary key (id),
  constraint prism_sifs_locked_revision_id_fkey foreign KEY (locked_revision_id) references prism_sif_revisions (id) on delete set null,
  constraint prism_sifs_project_id_fkey foreign KEY (project_id) references prism_projects (id) on delete CASCADE,
  constraint prism_sifs_status_check check (
    (
      status = any (
        array[
          'draft'::text,
          'in_review'::text,
          'verified'::text,
          'approved'::text
        ]
      )
    )
  ),
  constraint prism_sifs_target_sil_check check (
    (
      (target_sil >= 1)
      and (target_sil <= 4)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_prism_sifs_project_id on public.prism_sifs using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_prism_sifs_status on public.prism_sifs using btree (status) TABLESPACE pg_default;

create index IF not exists idx_prism_sifs_target_sil on public.prism_sifs using btree (target_sil) TABLESPACE pg_default;

create index IF not exists idx_sifs_project on public.prism_sifs using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_sifs_status on public.prism_sifs using btree (status) TABLESPACE pg_default;

create trigger prism_sifs_updated_at BEFORE
update on prism_sifs for EACH row
execute FUNCTION prism_set_updated_at ();

create trigger trg_sifs_updated_at BEFORE
update on prism_sifs for EACH row
execute FUNCTION prism_update_updated_at ();

create table public.profiles (
  id uuid not null,
  email text null,
  full_name text null,
  avatar_url text null,
  provider text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  last_sign_in_at timestamp with time zone null,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger set_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION set_profile_updated_at ();