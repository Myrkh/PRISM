create table if not exists public.prism_component_templates (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.prism_projects (id) on delete cascade,
  scope text not null check (scope in ('project', 'user', 'shared', 'public')),
  name text not null,
  description text not null default '',
  subsystem_type text not null check (subsystem_type in ('sensor', 'logic', 'actuator')),
  instrument_category text not null,
  instrument_type text not null default '',
  manufacturer text not null default '',
  data_source text not null default '',
  source_reference text,
  tags text[] not null default '{}',
  review_status text not null default 'draft' check (review_status in ('draft', 'review', 'approved', 'archived')),
  import_batch_id uuid,
  template_schema_version integer not null default 1 check (template_schema_version > 0),
  template_version integer not null default 1 check (template_version > 0),
  is_archived boolean not null default false,
  archived_at timestamptz,
  component_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prism_component_templates_scope_project_check check (
    (scope = 'project' and project_id is not null)
    or (scope = 'user' and project_id is null)
    or scope in ('shared', 'public')
  ),
  constraint prism_component_templates_archive_consistency check (
    (is_archived = true and review_status = 'archived')
    or (is_archived = false and review_status <> 'archived')
  )
);

create index if not exists prism_component_templates_owner_scope_idx
  on public.prism_component_templates (owner_profile_id, scope, updated_at desc);

create index if not exists prism_component_templates_project_idx
  on public.prism_component_templates (project_id, updated_at desc);

create index if not exists prism_component_templates_subsystem_idx
  on public.prism_component_templates (subsystem_type, instrument_category);

create index if not exists prism_component_templates_tags_idx
  on public.prism_component_templates using gin (tags);

alter table public.prism_component_templates enable row level security;

create or replace function public.set_component_template_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_component_templates_updated_at on public.prism_component_templates;

create trigger set_component_templates_updated_at
before update on public.prism_component_templates
for each row
execute function public.set_component_template_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_component_templates'
      and policyname = 'authenticated users read own component templates'
  ) then
    create policy "authenticated users read own component templates"
    on public.prism_component_templates
    for select
    to authenticated
    using ((select auth.uid()) = owner_profile_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_component_templates'
      and policyname = 'authenticated users insert own component templates'
  ) then
    create policy "authenticated users insert own component templates"
    on public.prism_component_templates
    for insert
    to authenticated
    with check ((select auth.uid()) = owner_profile_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_component_templates'
      and policyname = 'authenticated users update own component templates'
  ) then
    create policy "authenticated users update own component templates"
    on public.prism_component_templates
    for update
    to authenticated
    using ((select auth.uid()) = owner_profile_id)
    with check ((select auth.uid()) = owner_profile_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_component_templates'
      and policyname = 'authenticated users delete own component templates'
  ) then
    create policy "authenticated users delete own component templates"
    on public.prism_component_templates
    for delete
    to authenticated
    using ((select auth.uid()) = owner_profile_id);
  end if;
end $$;

grant select, insert, update, delete on public.prism_component_templates to authenticated;
