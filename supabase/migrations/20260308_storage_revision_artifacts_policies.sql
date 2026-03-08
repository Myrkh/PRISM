alter table storage.objects enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anon read published revision artifacts'
  ) then
    create policy "anon read published revision artifacts"
    on storage.objects
    for select
    to anon
    using (bucket_id in ('prism_report', 'prism_prooftest'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anon upload published revision artifacts'
  ) then
    create policy "anon upload published revision artifacts"
    on storage.objects
    for insert
    to anon
    with check (bucket_id in ('prism_report', 'prism_prooftest'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anon update published revision artifacts'
  ) then
    create policy "anon update published revision artifacts"
    on storage.objects
    for update
    to anon
    using (bucket_id in ('prism_report', 'prism_prooftest'))
    with check (bucket_id in ('prism_report', 'prism_prooftest'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'anon delete published revision artifacts'
  ) then
    create policy "anon delete published revision artifacts"
    on storage.objects
    for delete
    to anon
    using (bucket_id in ('prism_report', 'prism_prooftest'));
  end if;
end $$;
