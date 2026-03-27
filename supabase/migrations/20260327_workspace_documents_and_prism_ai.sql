-- Normalized workspace persistence and PRISM AI conversations
-- Replaces the single-row workspace snapshot approach with row-per-document tables
-- and moves PRISM AI conversations/settings out of localStorage when authenticated.

create or replace function public.set_prism_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.workspace_nodes (
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id text not null,
  node_type text not null check (node_type = any (array['folder'::text, 'note'::text, 'pdf'::text, 'image'::text, 'json'::text])),
  parent_id text null,
  sort_index integer not null default 0,
  name text not null,
  content text null,
  storage_key text null,
  collapsed boolean not null default false,
  json_schema text null,
  binding jsonb null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspace_nodes_pkey primary key (user_id, node_id)
);

create index if not exists idx_workspace_nodes_parent
  on public.workspace_nodes (user_id, parent_id, sort_index);

create index if not exists idx_workspace_nodes_type
  on public.workspace_nodes (user_id, node_type);

alter table public.workspace_nodes enable row level security;

drop trigger if exists set_workspace_nodes_updated_at on public.workspace_nodes;
create trigger set_workspace_nodes_updated_at
before update on public.workspace_nodes
for each row
execute function public.set_prism_workspace_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_nodes'
      and policyname = 'workspace_nodes owner select'
  ) then
    create policy "workspace_nodes owner select"
      on public.workspace_nodes for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_nodes'
      and policyname = 'workspace_nodes owner insert'
  ) then
    create policy "workspace_nodes owner insert"
      on public.workspace_nodes for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_nodes'
      and policyname = 'workspace_nodes owner update'
  ) then
    create policy "workspace_nodes owner update"
      on public.workspace_nodes for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_nodes'
      and policyname = 'workspace_nodes owner delete'
  ) then
    create policy "workspace_nodes owner delete"
      on public.workspace_nodes for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.workspace_prism_files (
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null check (file_name = any (array['context.md'::text, 'conventions.md'::text, 'standards.md'::text])),
  content text not null default ''::text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspace_prism_files_pkey primary key (user_id, file_name)
);

alter table public.workspace_prism_files enable row level security;

drop trigger if exists set_workspace_prism_files_updated_at on public.workspace_prism_files;
create trigger set_workspace_prism_files_updated_at
before update on public.workspace_prism_files
for each row
execute function public.set_prism_workspace_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_prism_files'
      and policyname = 'workspace_prism_files owner select'
  ) then
    create policy "workspace_prism_files owner select"
      on public.workspace_prism_files for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_prism_files'
      and policyname = 'workspace_prism_files owner insert'
  ) then
    create policy "workspace_prism_files owner insert"
      on public.workspace_prism_files for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_prism_files'
      and policyname = 'workspace_prism_files owner update'
  ) then
    create policy "workspace_prism_files owner update"
      on public.workspace_prism_files for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_prism_files'
      and policyname = 'workspace_prism_files owner delete'
  ) then
    create policy "workspace_prism_files owner delete"
      on public.workspace_prism_files for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.workspace_user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  section_collapsed boolean not null default false,
  pinned_node_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.workspace_user_state enable row level security;

drop trigger if exists set_workspace_user_state_updated_at on public.workspace_user_state;
create trigger set_workspace_user_state_updated_at
before update on public.workspace_user_state
for each row
execute function public.set_prism_workspace_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_user_state'
      and policyname = 'workspace_user_state owner select'
  ) then
    create policy "workspace_user_state owner select"
      on public.workspace_user_state for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_user_state'
      and policyname = 'workspace_user_state owner insert'
  ) then
    create policy "workspace_user_state owner insert"
      on public.workspace_user_state for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_user_state'
      and policyname = 'workspace_user_state owner update'
  ) then
    create policy "workspace_user_state owner update"
      on public.workspace_user_state for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_user_state'
      and policyname = 'workspace_user_state owner delete'
  ) then
    create policy "workspace_user_state owner delete"
      on public.workspace_user_state for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.prism_ai_conversations (
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id text not null,
  title text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  context_sif_id text null,
  context_sif_name text null,
  attached_workspace_items jsonb not null default '[]'::jsonb,
  assistant_note_ids jsonb not null default '{}'::jsonb,
  strict_mode boolean not null default false,
  constraint prism_ai_conversations_pkey primary key (user_id, conversation_id)
);

create index if not exists idx_prism_ai_conversations_updated
  on public.prism_ai_conversations (user_id, updated_at desc);

alter table public.prism_ai_conversations enable row level security;

drop trigger if exists set_prism_ai_conversations_updated_at on public.prism_ai_conversations;
create trigger set_prism_ai_conversations_updated_at
before update on public.prism_ai_conversations
for each row
execute function public.set_prism_workspace_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_conversations'
      and policyname = 'prism_ai_conversations owner select'
  ) then
    create policy "prism_ai_conversations owner select"
      on public.prism_ai_conversations for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_conversations'
      and policyname = 'prism_ai_conversations owner insert'
  ) then
    create policy "prism_ai_conversations owner insert"
      on public.prism_ai_conversations for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_conversations'
      and policyname = 'prism_ai_conversations owner update'
  ) then
    create policy "prism_ai_conversations owner update"
      on public.prism_ai_conversations for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_conversations'
      and policyname = 'prism_ai_conversations owner delete'
  ) then
    create policy "prism_ai_conversations owner delete"
      on public.prism_ai_conversations for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.prism_ai_messages (
  user_id uuid not null,
  conversation_id text not null,
  message_id text not null,
  sequence_index integer not null default 0,
  role text not null check (role = any (array['user'::text, 'assistant'::text])),
  content text not null,
  proposal jsonb null,
  timestamp timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prism_ai_messages_pkey primary key (user_id, conversation_id, message_id),
  constraint prism_ai_messages_conversation_fk foreign key (user_id, conversation_id)
    references public.prism_ai_conversations (user_id, conversation_id)
    on delete cascade
);

create index if not exists idx_prism_ai_messages_sequence
  on public.prism_ai_messages (user_id, conversation_id, sequence_index);

alter table public.prism_ai_messages enable row level security;

drop trigger if exists set_prism_ai_messages_updated_at on public.prism_ai_messages;
create trigger set_prism_ai_messages_updated_at
before update on public.prism_ai_messages
for each row
execute function public.set_prism_workspace_updated_at();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prism_ai_conversations'
      and column_name = 'messages'
  ) then
    insert into public.prism_ai_messages (
      user_id,
      conversation_id,
      message_id,
      sequence_index,
      role,
      content,
      proposal,
      timestamp
    )
    select
      conv.user_id,
      conv.conversation_id,
      coalesce(msg.value ->> 'id', conv.conversation_id || '-message-' || (msg.ordinality - 1)::text),
      greatest(msg.ordinality - 1, 0),
      case
        when msg.value ->> 'role' in ('user', 'assistant') then msg.value ->> 'role'
        else 'assistant'
      end,
      coalesce(msg.value ->> 'content', ''),
      case
        when jsonb_typeof(msg.value -> 'proposal') = 'object' then msg.value -> 'proposal'
        else null
      end,
      case
        when jsonb_typeof(msg.value -> 'timestamp') = 'number'
          then to_timestamp(((msg.value ->> 'timestamp')::double precision) / 1000.0)
        else conv.updated_at
      end
    from public.prism_ai_conversations conv
    cross join lateral jsonb_array_elements(coalesce(conv.messages, '[]'::jsonb)) with ordinality as msg(value, ordinality)
    on conflict (user_id, conversation_id, message_id) do nothing;

    alter table public.prism_ai_conversations drop column messages;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_messages'
      and policyname = 'prism_ai_messages owner select'
  ) then
    create policy "prism_ai_messages owner select"
      on public.prism_ai_messages for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_messages'
      and policyname = 'prism_ai_messages owner insert'
  ) then
    create policy "prism_ai_messages owner insert"
      on public.prism_ai_messages for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_messages'
      and policyname = 'prism_ai_messages owner update'
  ) then
    create policy "prism_ai_messages owner update"
      on public.prism_ai_messages for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_messages'
      and policyname = 'prism_ai_messages owner delete'
  ) then
    create policy "prism_ai_messages owner delete"
      on public.prism_ai_messages for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.prism_ai_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_conversation_id text null,
  model text not null default 'claude-sonnet-4-6'::text,
  system_prompt text not null default 'Tu es PRISM AI, un assistant expert en sécurité fonctionnelle IEC 61511. Tu aides les ingénieurs à analyser les SIF, calculer les niveaux SIL, et structurer les dossiers de preuve.'::text,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.prism_ai_settings enable row level security;

drop trigger if exists set_prism_ai_settings_updated_at on public.prism_ai_settings;
create trigger set_prism_ai_settings_updated_at
before update on public.prism_ai_settings
for each row
execute function public.set_prism_workspace_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_settings'
      and policyname = 'prism_ai_settings owner select'
  ) then
    create policy "prism_ai_settings owner select"
      on public.prism_ai_settings for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_settings'
      and policyname = 'prism_ai_settings owner insert'
  ) then
    create policy "prism_ai_settings owner insert"
      on public.prism_ai_settings for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_settings'
      and policyname = 'prism_ai_settings owner update'
  ) then
    create policy "prism_ai_settings owner update"
      on public.prism_ai_settings for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prism_ai_settings'
      and policyname = 'prism_ai_settings owner delete'
  ) then
    create policy "prism_ai_settings owner delete"
      on public.prism_ai_settings for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.workspace_nodes to authenticated;
grant select, insert, update, delete on public.workspace_prism_files to authenticated;
grant select, insert, update, delete on public.workspace_user_state to authenticated;
grant select, insert, update, delete on public.prism_ai_conversations to authenticated;
grant select, insert, update, delete on public.prism_ai_messages to authenticated;
grant select, insert, update, delete on public.prism_ai_settings to authenticated;
