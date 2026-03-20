create table if not exists public.prism_engine_run_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prism_projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  label text not null default '',
  scope text not null check (scope in ('project', 'under_target', 'published', 'selection')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error', 'cancelled')),
  total_runs integer not null default 0 check (total_runs >= 0),
  done_runs integer not null default 0 check (done_runs >= 0),
  failed_runs integer not null default 0 check (failed_runs >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prism_engine_run_batches_progress_check check (done_runs + failed_runs <= total_runs)
);

create table if not exists public.prism_engine_runs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.prism_engine_run_batches (id) on delete set null,
  project_id uuid not null references public.prism_projects (id) on delete cascade,
  sif_id uuid not null references public.prism_sifs (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  trigger_kind text not null check (trigger_kind in ('manual', 'compare', 'batch')),
  requested_mode text not null check (requested_mode in ('AUTO', 'MARKOV')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error', 'cancelled')),
  backend_version text,
  payload_hash text,
  input_digest jsonb not null default '{}'::jsonb,
  runtime_ms numeric(12, 3) check (runtime_ms is null or runtime_ms >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  warning_count integer not null default 0 check (warning_count >= 0),
  error_message text,
  result_summary jsonb not null default '{}'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists prism_engine_run_batches_project_idx
  on public.prism_engine_run_batches (project_id, created_at desc);

create index if not exists prism_engine_run_batches_status_idx
  on public.prism_engine_run_batches (status, created_at desc);

create index if not exists prism_engine_run_batches_created_by_idx
  on public.prism_engine_run_batches (created_by, created_at desc);

create index if not exists prism_engine_runs_project_idx
  on public.prism_engine_runs (project_id, created_at desc);

create index if not exists prism_engine_runs_sif_idx
  on public.prism_engine_runs (sif_id, created_at desc);

create index if not exists prism_engine_runs_batch_idx
  on public.prism_engine_runs (batch_id, created_at desc);

create index if not exists prism_engine_runs_status_idx
  on public.prism_engine_runs (status, created_at desc);

create index if not exists prism_engine_runs_trigger_idx
  on public.prism_engine_runs (trigger_kind, created_at desc);

create or replace function public.set_engine_run_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_engine_run_batches_updated_at on public.prism_engine_run_batches;
create trigger set_engine_run_batches_updated_at
before update on public.prism_engine_run_batches
for each row
execute function public.set_engine_run_updated_at();

drop trigger if exists set_engine_runs_updated_at on public.prism_engine_runs;
create trigger set_engine_runs_updated_at
before update on public.prism_engine_runs
for each row
execute function public.set_engine_run_updated_at();

alter table public.prism_engine_run_batches enable row level security;
alter table public.prism_engine_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_engine_run_batches'
      and policyname = 'authenticated users read project engine run batches'
  ) then
    create policy "authenticated users read project engine run batches"
    on public.prism_engine_run_batches
    for select
    to authenticated
    using (private.is_project_member(project_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_engine_run_batches'
      and policyname = 'authenticated users insert own project engine run batches'
  ) then
    create policy "authenticated users insert own project engine run batches"
    on public.prism_engine_run_batches
    for insert
    to authenticated
    with check (private.is_project_member(project_id) and created_by = (select auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_engine_run_batches'
      and policyname = 'authenticated users update own project engine run batches'
  ) then
    create policy "authenticated users update own project engine run batches"
    on public.prism_engine_run_batches
    for update
    to authenticated
    using (private.is_project_member(project_id) and created_by = (select auth.uid()))
    with check (private.is_project_member(project_id) and created_by = (select auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_engine_run_batches'
      and policyname = 'authenticated users delete own project engine run batches'
  ) then
    create policy "authenticated users delete own project engine run batches"
    on public.prism_engine_run_batches
    for delete
    to authenticated
    using (private.is_project_member(project_id) and created_by = (select auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_engine_runs'
      and policyname = 'authenticated users read project engine runs'
  ) then
    create policy "authenticated users read project engine runs"
    on public.prism_engine_runs
    for select
    to authenticated
    using (private.is_project_member(project_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_engine_runs'
      and policyname = 'authenticated users insert own project engine runs'
  ) then
    create policy "authenticated users insert own project engine runs"
    on public.prism_engine_runs
    for insert
    to authenticated
    with check (private.is_project_member(project_id) and created_by = (select auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_engine_runs'
      and policyname = 'authenticated users update own project engine runs'
  ) then
    create policy "authenticated users update own project engine runs"
    on public.prism_engine_runs
    for update
    to authenticated
    using (private.is_project_member(project_id) and created_by = (select auth.uid()))
    with check (private.is_project_member(project_id) and created_by = (select auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_engine_runs'
      and policyname = 'authenticated users delete own project engine runs'
  ) then
    create policy "authenticated users delete own project engine runs"
    on public.prism_engine_runs
    for delete
    to authenticated
    using (private.is_project_member(project_id) and created_by = (select auth.uid()));
  end if;
end $$;

grant select, insert, update, delete on public.prism_engine_run_batches to authenticated;
grant select, insert, update, delete on public.prism_engine_runs to authenticated;
