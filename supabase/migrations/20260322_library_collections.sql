-- ─── prism_library_collections ───────────────────────────────────────────────
-- Stores named collections (folders) used to organise component templates in
-- the personal and project libraries.
--
-- Template membership is tracked via the `tags` column on
-- prism_component_templates using the prefix `library:{collection.name}`.
-- When a collection is renamed the application performs a bulk tag update.
--
-- Scopes:
--   'user'    → personal collection, project_id must be NULL
--   'project' → project-scoped collection, project_id must reference a project

create table if not exists public.prism_library_collections (
  id               uuid        not null default gen_random_uuid(),
  owner_profile_id uuid        not null,
  project_id       uuid,
  scope            text        not null default 'user',
  name             text        not null,
  color            text        not null default '#0284C7',
  position         integer     not null default 0,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),

  constraint prism_library_collections_pkey
    primary key (id),

  constraint prism_library_collections_owner_fkey
    foreign key (owner_profile_id) references public.profiles (id)
    on delete cascade,

  constraint prism_library_collections_project_fkey
    foreign key (project_id) references public.prism_projects (id)
    on delete cascade,

  constraint prism_library_collections_scope_check
    check (scope in ('user', 'project')),

  -- project_id coherence: user scope → no project, project scope → requires project
  constraint prism_library_collections_scope_project_check
    check (
      (scope = 'user'    and project_id is null)
      or (scope = 'project' and project_id is not null)
    ),

  constraint prism_library_collections_name_length_check
    check (char_length(name) between 1 and 100),

  -- loose hex color validation (#rrggbb)
  constraint prism_library_collections_color_format_check
    check (color ~* '^#[0-9a-f]{6}$')
);

-- ─── Unique name per owner (user scope) ──────────────────────────────────────
create unique index if not exists prism_library_collections_owner_name_idx
  on public.prism_library_collections (owner_profile_id, lower(name))
  where scope = 'user';

-- ─── Unique name per project (project scope) ─────────────────────────────────
create unique index if not exists prism_library_collections_project_name_idx
  on public.prism_library_collections (project_id, lower(name))
  where scope = 'project';

-- ─── Fast lookup by owner ─────────────────────────────────────────────────────
create index if not exists prism_library_collections_owner_idx
  on public.prism_library_collections (owner_profile_id, updated_at desc);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function public.set_library_collections_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_library_collections_updated_at
  on public.prism_library_collections;

create trigger set_library_collections_updated_at
  before update on public.prism_library_collections
  for each row execute function public.set_library_collections_updated_at();

-- ─── Row-level security ───────────────────────────────────────────────────────
alter table public.prism_library_collections enable row level security;

-- Users can only see and manage their own collections
create policy "library_collections_owner_all"
  on public.prism_library_collections
  for all
  using  (auth.uid() = owner_profile_id)
  with check (auth.uid() = owner_profile_id);

-- ─── Comments ─────────────────────────────────────────────────────────────────
comment on table  public.prism_library_collections                 is 'Named collections used to organise component templates in the PRISM library.';
comment on column public.prism_library_collections.scope           is 'user = personal, project = tied to a specific project.';
comment on column public.prism_library_collections.color           is 'Hex color (#rrggbb) chosen by the user for visual identification in the sidebar.';
comment on column public.prism_library_collections.position        is 'Display order within a scope; managed client-side for now.';
comment on column public.prism_library_collections.name            is 'Human-readable label; also used as the library: tag value on component templates.';
