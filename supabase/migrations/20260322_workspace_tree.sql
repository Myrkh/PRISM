-- workspace_tree: stores the full workspace zustand state (nodes, childOrder, tabs, pins)
-- One row per user — JSONB blob, synced from the front-end on change.

create table if not exists public.workspace_tree (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.workspace_tree enable row level security;

-- Keep updated_at fresh on every write
create or replace function public.set_workspace_tree_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_workspace_tree_updated_at on public.workspace_tree;
create trigger set_workspace_tree_updated_at
before update on public.workspace_tree
for each row
execute function public.set_workspace_tree_updated_at();

-- RLS: each user can only read/write their own row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_tree'
      and policyname = 'workspace owner select'
  ) then
    create policy "workspace owner select"
    on public.workspace_tree for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_tree'
      and policyname = 'workspace owner insert'
  ) then
    create policy "workspace owner insert"
    on public.workspace_tree for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_tree'
      and policyname = 'workspace owner update'
  ) then
    create policy "workspace owner update"
    on public.workspace_tree for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_tree'
      and policyname = 'workspace owner delete'
  ) then
    create policy "workspace owner delete"
    on public.workspace_tree for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.workspace_tree to authenticated;
