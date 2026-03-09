create schema if not exists private;

create table if not exists public.prism_project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prism_projects (id) on delete cascade,
  role_key text not null,
  name text not null,
  description text not null default '',
  color text not null default '#009BA4',
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prism_project_roles_project_role_key_key unique (project_id, role_key),
  constraint prism_project_roles_project_name_key unique (project_id, name)
);

create table if not exists public.prism_project_role_permissions (
  role_id uuid not null references public.prism_project_roles (id) on delete cascade,
  permission text not null check (
    permission in (
      'project.view',
      'project.edit',
      'project.delete',
      'sif.create',
      'sif.edit',
      'sif.delete',
      'library.project.manage',
      'prooftest.manage',
      'revision.publish',
      'report.export',
      'team.manage'
    )
  ),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (role_id, permission)
);

create table if not exists public.prism_project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.prism_projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.prism_project_roles (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'disabled')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prism_project_memberships_project_profile_key unique (project_id, profile_id)
);

create index if not exists prism_project_roles_project_idx
  on public.prism_project_roles (project_id, sort_order, created_at);

create index if not exists prism_project_role_permissions_role_idx
  on public.prism_project_role_permissions (role_id, permission);

create index if not exists prism_project_memberships_project_idx
  on public.prism_project_memberships (project_id, profile_id, status);

create index if not exists prism_project_memberships_profile_idx
  on public.prism_project_memberships (profile_id, project_id, status);

create or replace function public.set_project_access_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_project_roles_updated_at on public.prism_project_roles;
create trigger set_project_roles_updated_at
before update on public.prism_project_roles
for each row
execute function public.set_project_access_updated_at();

drop trigger if exists set_project_memberships_updated_at on public.prism_project_memberships;
create trigger set_project_memberships_updated_at
before update on public.prism_project_memberships
for each row
execute function public.set_project_access_updated_at();

create or replace function private.project_id_for_role(target_role_id uuid)
returns uuid
language sql
security definer
set search_path = public, private
stable
as $$
  select role.project_id
  from public.prism_project_roles as role
  where role.id = target_role_id
$$;

create or replace function private.is_project_member(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
stable
as $$
  select exists (
    select 1
    from public.prism_project_memberships as membership
    where membership.project_id = target_project_id
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
  )
$$;

create or replace function private.has_project_permission(target_project_id uuid, requested_permission text)
returns boolean
language sql
security definer
set search_path = public, private
stable
as $$
  select exists (
    select 1
    from public.prism_project_memberships as membership
    join public.prism_project_role_permissions as permission
      on permission.role_id = membership.role_id
    where membership.project_id = target_project_id
      and membership.profile_id = (select auth.uid())
      and membership.status = 'active'
      and permission.permission = requested_permission
  )
$$;

create or replace function public.prism_initialize_project_access(target_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  caller_id uuid := auth.uid();
  current_members integer := 0;
  current_roles integer := 0;
  owner_role_id uuid;
  lead_role_id uuid;
  engineer_role_id uuid;
  reviewer_role_id uuid;
  viewer_role_id uuid;
begin
  if caller_id is null then
    raise exception 'Authenticated user required';
  end if;

  if not exists (
    select 1 from public.prism_projects where id = target_project_id
  ) then
    raise exception 'Unknown project %', target_project_id;
  end if;

  select count(*) into current_roles
  from public.prism_project_roles
  where project_id = target_project_id;

  if current_roles = 0 then
    insert into public.prism_project_roles (project_id, role_key, name, description, color, is_system, sort_order)
    values
      (target_project_id, 'owner', 'Owner', 'Full control over the project and access matrix.', '#F97316', true, 10),
      (target_project_id, 'lead', 'Lead', 'Leads the study and manages engineering decisions.', '#009BA4', true, 20),
      (target_project_id, 'engineer', 'Engineer', 'Edits SIF data, proof tests, and project library.', '#2563EB', true, 30),
      (target_project_id, 'reviewer', 'Reviewer', 'Reviews revisions and exports reports.', '#8B5CF6', true, 40),
      (target_project_id, 'viewer', 'Viewer', 'Read-only access to project content.', '#6B7280', true, 50);

    select id into owner_role_id from public.prism_project_roles where project_id = target_project_id and role_key = 'owner';
    select id into lead_role_id from public.prism_project_roles where project_id = target_project_id and role_key = 'lead';
    select id into engineer_role_id from public.prism_project_roles where project_id = target_project_id and role_key = 'engineer';
    select id into reviewer_role_id from public.prism_project_roles where project_id = target_project_id and role_key = 'reviewer';
    select id into viewer_role_id from public.prism_project_roles where project_id = target_project_id and role_key = 'viewer';

    insert into public.prism_project_role_permissions (role_id, permission)
    values
      (owner_role_id, 'project.view'),
      (owner_role_id, 'project.edit'),
      (owner_role_id, 'project.delete'),
      (owner_role_id, 'sif.create'),
      (owner_role_id, 'sif.edit'),
      (owner_role_id, 'sif.delete'),
      (owner_role_id, 'library.project.manage'),
      (owner_role_id, 'prooftest.manage'),
      (owner_role_id, 'revision.publish'),
      (owner_role_id, 'report.export'),
      (owner_role_id, 'team.manage'),
      (lead_role_id, 'project.view'),
      (lead_role_id, 'project.edit'),
      (lead_role_id, 'sif.create'),
      (lead_role_id, 'sif.edit'),
      (lead_role_id, 'library.project.manage'),
      (lead_role_id, 'prooftest.manage'),
      (lead_role_id, 'revision.publish'),
      (lead_role_id, 'report.export'),
      (lead_role_id, 'team.manage'),
      (engineer_role_id, 'project.view'),
      (engineer_role_id, 'sif.create'),
      (engineer_role_id, 'sif.edit'),
      (engineer_role_id, 'library.project.manage'),
      (engineer_role_id, 'prooftest.manage'),
      (engineer_role_id, 'report.export'),
      (reviewer_role_id, 'project.view'),
      (reviewer_role_id, 'revision.publish'),
      (reviewer_role_id, 'report.export'),
      (viewer_role_id, 'project.view')
    on conflict do nothing;
  end if;

  select count(*) into current_members
  from public.prism_project_memberships
  where project_id = target_project_id;

  if current_members = 0 then
    select id into owner_role_id
    from public.prism_project_roles
    where project_id = target_project_id
      and role_key = 'owner';

    insert into public.prism_project_memberships (project_id, profile_id, role_id, status, invited_by)
    values (target_project_id, caller_id, owner_role_id, 'active', caller_id)
    on conflict (project_id, profile_id) do update
    set role_id = excluded.role_id,
        status = excluded.status,
        invited_by = excluded.invited_by,
        updated_at = timezone('utc', now());
  end if;

  return jsonb_build_object(
    'project_id', target_project_id,
    'initialized', true,
    'role_count', (select count(*) from public.prism_project_roles where project_id = target_project_id),
    'member_count', (select count(*) from public.prism_project_memberships where project_id = target_project_id)
  );
end;
$$;

create or replace function public.prism_add_project_member_by_email(
  target_project_id uuid,
  member_email text,
  target_role_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  caller_id uuid := auth.uid();
  target_profile_id uuid;
  membership_id uuid;
begin
  if caller_id is null then
    raise exception 'Authenticated user required';
  end if;

  if not private.has_project_permission(target_project_id, 'team.manage') then
    raise exception 'Missing team.manage permission on project %', target_project_id;
  end if;

  if private.project_id_for_role(target_role_id) is distinct from target_project_id then
    raise exception 'Role % does not belong to project %', target_role_id, target_project_id;
  end if;

  select profile.id
  into target_profile_id
  from public.profiles as profile
  where lower(profile.email) = lower(member_email)
  limit 1;

  if target_profile_id is null then
    raise exception 'No profile found for %', member_email;
  end if;

  insert into public.prism_project_memberships (project_id, profile_id, role_id, status, invited_by)
  values (target_project_id, target_profile_id, target_role_id, 'active', caller_id)
  on conflict (project_id, profile_id) do update
  set role_id = excluded.role_id,
      status = 'active',
      invited_by = excluded.invited_by,
      updated_at = timezone('utc', now())
  returning id into membership_id;

  return jsonb_build_object(
    'membership_id', membership_id,
    'project_id', target_project_id,
    'profile_id', target_profile_id
  );
end;
$$;

create or replace function public.prism_get_project_access(target_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  caller_id uuid := auth.uid();
  initialized boolean;
  roles_json jsonb;
  members_json jsonb;
begin
  if caller_id is null then
    raise exception 'Authenticated user required';
  end if;

  if not exists (
    select 1 from public.prism_projects where id = target_project_id
  ) then
    raise exception 'Unknown project %', target_project_id;
  end if;

  initialized := exists (
    select 1
    from public.prism_project_roles
    where project_id = target_project_id
  ) or exists (
    select 1
    from public.prism_project_memberships
    where project_id = target_project_id
  );

  if initialized and not private.is_project_member(target_project_id) then
    raise exception 'Not a project member for %', target_project_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', role.id,
        'projectId', role.project_id,
        'roleKey', role.role_key,
        'name', role.name,
        'description', role.description,
        'color', role.color,
        'isSystem', role.is_system,
        'sortOrder', role.sort_order,
        'permissions', coalesce((
          select jsonb_agg(permission.permission order by permission.permission)
          from public.prism_project_role_permissions as permission
          where permission.role_id = role.id
        ), '[]'::jsonb),
        'createdAt', role.created_at,
        'updatedAt', role.updated_at
      )
      order by role.sort_order, role.name
    ),
    '[]'::jsonb
  )
  into roles_json
  from public.prism_project_roles as role
  where role.project_id = target_project_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', membership.id,
        'projectId', membership.project_id,
        'profileId', membership.profile_id,
        'roleId', membership.role_id,
        'status', membership.status,
        'invitedBy', membership.invited_by,
        'createdAt', membership.created_at,
        'updatedAt', membership.updated_at,
        'profile', jsonb_build_object(
          'id', profile.id,
          'email', profile.email,
          'fullName', profile.full_name,
          'avatarUrl', profile.avatar_url
        )
      )
      order by profile.full_name nulls last, profile.email
    ),
    '[]'::jsonb
  )
  into members_json
  from public.prism_project_memberships as membership
  join public.profiles as profile
    on profile.id = membership.profile_id
  where membership.project_id = target_project_id;

  return jsonb_build_object(
    'projectId', target_project_id,
    'roles', roles_json,
    'members', members_json,
    'currentProfileId', caller_id,
    'canManageTeam', private.has_project_permission(target_project_id, 'team.manage'),
    'initialized', initialized
  );
end;
$$;

alter table public.prism_project_roles enable row level security;
alter table public.prism_project_role_permissions enable row level security;
alter table public.prism_project_memberships enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_project_roles'
      and policyname = 'project members read roles'
  ) then
    create policy "project members read roles"
    on public.prism_project_roles
    for select
    to authenticated
    using (private.is_project_member(project_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_project_roles'
      and policyname = 'team managers mutate roles'
  ) then
    create policy "team managers mutate roles"
    on public.prism_project_roles
    for all
    to authenticated
    using (private.has_project_permission(project_id, 'team.manage'))
    with check (private.has_project_permission(project_id, 'team.manage'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_project_role_permissions'
      and policyname = 'project members read role permissions'
  ) then
    create policy "project members read role permissions"
    on public.prism_project_role_permissions
    for select
    to authenticated
    using (private.is_project_member(private.project_id_for_role(role_id)));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_project_role_permissions'
      and policyname = 'team managers mutate role permissions'
  ) then
    create policy "team managers mutate role permissions"
    on public.prism_project_role_permissions
    for all
    to authenticated
    using (private.has_project_permission(private.project_id_for_role(role_id), 'team.manage'))
    with check (private.has_project_permission(private.project_id_for_role(role_id), 'team.manage'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_project_memberships'
      and policyname = 'project members read memberships'
  ) then
    create policy "project members read memberships"
    on public.prism_project_memberships
    for select
    to authenticated
    using (private.is_project_member(project_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prism_project_memberships'
      and policyname = 'team managers mutate memberships'
  ) then
    create policy "team managers mutate memberships"
    on public.prism_project_memberships
    for all
    to authenticated
    using (private.has_project_permission(project_id, 'team.manage'))
    with check (private.has_project_permission(project_id, 'team.manage'));
  end if;
end $$;

grant select, insert, update, delete on public.prism_project_roles to authenticated;
grant select, insert, update, delete on public.prism_project_role_permissions to authenticated;
grant select, insert, update, delete on public.prism_project_memberships to authenticated;
grant execute on function public.prism_initialize_project_access(uuid) to authenticated;
grant execute on function public.prism_add_project_member_by_email(uuid, text, uuid) to authenticated;
grant execute on function public.prism_get_project_access(uuid) to authenticated;
