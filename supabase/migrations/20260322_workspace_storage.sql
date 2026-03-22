-- Supabase Storage bucket for workspace binary files (PDF, images, etc.)
-- Files stored at: {user_id}/{node_id}/{filename}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-files',
  'workspace-files',
  false,
  52428800,  -- 50 MB per file
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
)
on conflict (id) do nothing;

-- RLS policies for storage objects
-- Users can only access files under their own user_id prefix

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'workspace files select own'
  ) then
    create policy "workspace files select own"
    on storage.objects for select
    to authenticated
    using (
      bucket_id = 'workspace-files'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'workspace files insert own'
  ) then
    create policy "workspace files insert own"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'workspace-files'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'workspace files delete own'
  ) then
    create policy "workspace files delete own"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'workspace-files'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;
