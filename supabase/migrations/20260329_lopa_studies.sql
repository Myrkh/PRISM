-- LOPA Studies & Scenarios persistence
-- Two tables: prism_lopa_studies (one per MOC/study) + prism_lopa_scenarios (one row per scenario)
-- Pattern identical to prism_sifs / prism_proof_campaigns

-- ─── Studies ──────────────────────────────────────────────────────────────────

create table public.prism_lopa_studies (
  id           uuid        not null default gen_random_uuid(),
  project_id   uuid        not null,
  name         text        not null default 'Étude LOPA',
  description  text        not null default '',
  frozen_at    timestamptz null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint prism_lopa_studies_pkey
    primary key (id),
  constraint prism_lopa_studies_project_id_fkey
    foreign key (project_id) references public.prism_projects (id) on delete cascade
) tablespace pg_default;

create index if not exists idx_lopa_studies_project
  on public.prism_lopa_studies using btree (project_id) tablespace pg_default;

create trigger prism_lopa_studies_updated_at
  before update on public.prism_lopa_studies
  for each row execute function prism_set_updated_at();

-- ─── Scenarios ────────────────────────────────────────────────────────────────

create table public.prism_lopa_scenarios (
  id                       uuid        not null default gen_random_uuid(),
  study_id                 uuid        not null,
  project_id               uuid        not null,
  scenario_id              text        not null default '',   -- e.g. "SC-001"
  sort_order               integer     not null default 0,
  sif_ref                  uuid        null,
  hazop_ref                text        null,
  description              text        not null default '',
  consequence_category     text        not null default 'safety_personnel',
  consequence_description  text        not null default '',
  initiating_event         text        not null default '',
  ief                      float8      not null default 0.1,
  ief_source               text        not null default '',
  ignition_probability     float8      null,
  occupancy_factor         float8      null,
  ipls                     jsonb       not null default '[]'::jsonb,
  tmel                     float8      not null default 1e-5,
  risk_matrix_cell         text        not null default '',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint prism_lopa_scenarios_pkey
    primary key (id),
  constraint prism_lopa_scenarios_study_id_fkey
    foreign key (study_id) references public.prism_lopa_studies (id) on delete cascade,
  constraint prism_lopa_scenarios_project_id_fkey
    foreign key (project_id) references public.prism_projects (id) on delete cascade,
  constraint prism_lopa_scenarios_sif_ref_fkey
    foreign key (sif_ref) references public.prism_sifs (id) on delete set null
) tablespace pg_default;

create index if not exists idx_lopa_scenarios_study
  on public.prism_lopa_scenarios using btree (study_id, sort_order) tablespace pg_default;

create index if not exists idx_lopa_scenarios_project
  on public.prism_lopa_scenarios using btree (project_id) tablespace pg_default;

create trigger prism_lopa_scenarios_updated_at
  before update on public.prism_lopa_scenarios
  for each row execute function prism_set_updated_at();
