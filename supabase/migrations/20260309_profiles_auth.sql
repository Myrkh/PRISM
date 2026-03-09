 create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_sign_in_at timestamptz
);

alter table public.profiles enable row level security;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_email text;
  profile_full_name text;
  profile_avatar_url text;
  profile_provider text;
  profile_last_sign_in timestamptz;
begin
  profile_email := new.email;
  profile_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name',
    split_part(coalesce(new.email, ''), '@', 1)
  );
  profile_avatar_url := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );
  profile_provider := coalesce(
    new.raw_app_meta_data ->> 'provider',
    new.raw_user_meta_data ->> 'provider'
  );
  profile_last_sign_in := coalesce(new.last_sign_in_at, timezone('utc', now()));

  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    provider,
    last_sign_in_at
  )
  values (
    new.id,
    profile_email,
    profile_full_name,
    profile_avatar_url,
    profile_provider,
    profile_last_sign_in
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    provider = excluded.provider,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_synced_to_profile on auth.users;

create trigger on_auth_user_synced_to_profile
after insert or update on auth.users
for each row
execute function public.sync_profile_from_auth_user();

insert into public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  provider,
  created_at,
  updated_at,
  last_sign_in_at
)
select
  users.id,
  users.email,
  coalesce(
    users.raw_user_meta_data ->> 'full_name',
    users.raw_user_meta_data ->> 'name',
    users.raw_user_meta_data ->> 'user_name',
    split_part(coalesce(users.email, ''), '@', 1)
  ),
  coalesce(
    users.raw_user_meta_data ->> 'avatar_url',
    users.raw_user_meta_data ->> 'picture'
  ),
  coalesce(
    users.raw_app_meta_data ->> 'provider',
    users.raw_user_meta_data ->> 'provider'
  ),
  coalesce(users.created_at, timezone('utc', now())),
  timezone('utc', now()),
  users.last_sign_in_at
from auth.users as users
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  provider = excluded.provider,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'authenticated users read own profile'
  ) then
    create policy "authenticated users read own profile"
    on public.profiles
    for select
    to authenticated
    using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'authenticated users insert own profile'
  ) then
    create policy "authenticated users insert own profile"
    on public.profiles
    for insert
    to authenticated
    with check (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'authenticated users update own profile'
  ) then
    create policy "authenticated users update own profile"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);
  end if;
end $$;

grant select, insert, update on public.profiles to authenticated;
