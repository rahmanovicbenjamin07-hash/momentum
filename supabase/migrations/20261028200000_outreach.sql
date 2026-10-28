-- Phase 2 (Outreach): contacts (leads), touches (messages/calls/notes), stage history, message templates.
-- Every table: id / user_id / created_at, RLS with one policy per action, index on user_id.
-- Child rows use composite foreign keys (x_id, user_id) so they can only point at the same user's rows.

-- ===========================================================================
-- contacts: one lead / client, from any source.
-- ===========================================================================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  source text not null default 'other'
    check (source in ('linkedin', 'maps', 'inperson', 'upwork', 'other')),
  name text not null check (char_length(trim(name)) between 1 and 200),
  company text check (char_length(company) <= 200),
  role text check (char_length(role) <= 200),
  category text check (char_length(category) <= 100),        -- business type (Google Maps)
  city text check (char_length(city) <= 200),                -- address or city
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 254),
  website text check (char_length(website) <= 2048),
  linkedin_url text check (char_length(linkedin_url) <= 2048),
  maps_url text check (char_length(maps_url) <= 2048),
  met_where text check (char_length(met_where) <= 200),

  -- Upwork
  upwork_job_title text check (char_length(upwork_job_title) <= 300),
  upwork_job_url text check (char_length(upwork_job_url) <= 2048),
  upwork_budget numeric(12, 2) check (upwork_budget >= 0),
  connects_spent integer check (connects_spent between 0 and 10000),
  proposal_status text check (proposal_status in ('sent', 'viewed', 'interview', 'hired')),

  -- Pipeline
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost')),
  -- preferred "contact via"; same list everywhere (src/schemas/outreach.ts → CHANNELS)
  channel text check (channel in ('email', 'linkedin', 'phone', 'whatsapp', 'upwork', 'inperson', 'other')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  deal_value numeric(12, 2) check (deal_value >= 0),          -- €
  won_amount numeric(12, 2) check (won_amount >= 0),          -- €
  won_month date check (won_month = date_trunc('month', won_month)::date),  -- first day of the month paid
  next_follow_up date,
  last_touch_at timestamptz,                                  -- maintained by trigger on touches
  lost_reason text check (char_length(lost_reason) <= 500),
  -- Array of note objects, e.g. [{"id": "...", "body": "...", "created_at": "..."}]
  notes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(notes) = 'array' and pg_column_size(notes) <= 100000),
  tags text[] not null default '{}'
    check (cardinality(tags) <= 20 and array_position(tags, null) is null
           and char_length(array_to_string(tags, ',')) <= 1000),

  constraint contacts_id_user_id_key unique (id, user_id)
);

comment on table public.contacts is 'Outreach leads/clients. last_touch_at is maintained by trigger from touches.';

create index contacts_user_id_stage_idx on public.contacts (user_id, stage);
create index contacts_user_id_next_follow_up_idx on public.contacts (user_id, next_follow_up)
  where next_follow_up is not null;
-- Fast duplicate check on email (case-insensitive).
create index contacts_user_id_email_idx on public.contacts (user_id, lower(email)) where email is not null;

alter table public.contacts enable row level security;

create policy "contacts_select_own" on public.contacts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "contacts_insert_own" on public.contacts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "contacts_update_own" on public.contacts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "contacts_delete_own" on public.contacts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- templates: reusable message bodies, may contain {{first_name}}.
-- ===========================================================================
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  name text not null check (char_length(trim(name)) between 1 and 100),
  -- null = works for any channel
  channel text check (channel in ('email', 'linkedin', 'phone', 'whatsapp', 'upwork', 'inperson', 'other')),
  body text not null check (char_length(trim(body)) between 1 and 5000),

  constraint templates_id_user_id_key unique (id, user_id)
);

comment on table public.templates is 'Message templates. body supports {{first_name}}.';

create index templates_user_id_idx on public.templates (user_id);

alter table public.templates enable row level security;

create policy "templates_select_own" on public.templates
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "templates_insert_own" on public.templates
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "templates_update_own" on public.templates
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "templates_delete_own" on public.templates
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- touches: every message sent/received or note logged for a contact.
-- ===========================================================================
create table public.touches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  contact_id uuid not null,
  occurred_at timestamptz not null default now(),
  channel text not null default 'other'
    check (channel in ('email', 'linkedin', 'phone', 'whatsapp', 'upwork', 'inperson', 'other')),
  direction text not null default 'sent' check (direction in ('sent', 'received', 'note')),
  template_id uuid,
  body text check (char_length(body) <= 10000),
  got_reply boolean not null default false,

  -- Deleting the contact deletes its touches.
  constraint touches_contact_fkey foreign key (contact_id, user_id)
    references public.contacts (id, user_id) on delete cascade,
  -- Deleting a template keeps the touch, only clears template_id.
  constraint touches_template_fkey foreign key (template_id, user_id)
    references public.templates (id, user_id) on delete set null (template_id)
);

comment on table public.touches is 'Outreach timeline: sent/received messages and notes per contact.';

create index touches_contact_id_occurred_at_idx on public.touches (contact_id, occurred_at desc);
-- Also the user_id index; serves "sent touches this week".
create index touches_user_id_occurred_at_idx on public.touches (user_id, occurred_at);
create index touches_template_id_idx on public.touches (template_id) where template_id is not null;

alter table public.touches enable row level security;

create policy "touches_select_own" on public.touches
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "touches_insert_own" on public.touches
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "touches_update_own" on public.touches
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "touches_delete_own" on public.touches
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- stage_history: one row each time a contact's stage changes (filled by trigger).
-- ===========================================================================
create table public.stage_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  contact_id uuid not null,
  from_stage text check (from_stage in ('new', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost')),
  to_stage text not null check (to_stage in ('new', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost')),
  changed_at timestamptz not null default now(),

  constraint stage_history_contact_fkey foreign key (contact_id, user_id)
    references public.contacts (id, user_id) on delete cascade
);

comment on table public.stage_history is 'Stage changes per contact. from_stage is null for the first row (contact created).';

create index stage_history_contact_id_changed_at_idx on public.stage_history (contact_id, changed_at);
create index stage_history_user_id_changed_at_idx on public.stage_history (user_id, changed_at);

alter table public.stage_history enable row level security;

create policy "stage_history_select_own" on public.stage_history
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "stage_history_insert_own" on public.stage_history
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "stage_history_update_own" on public.stage_history
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "stage_history_delete_own" on public.stage_history
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- Trigger: contact created or stage changed -> stage_history row.
-- Security invoker: runs as the caller, so RLS still applies to the insert.
-- ===========================================================================
create function public.contacts_log_stage_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    insert into public.stage_history (user_id, contact_id, from_stage, to_stage)
    values (new.user_id, new.id, case when tg_op = 'UPDATE' then old.stage end, new.stage);
  end if;
  return null;
end;
$$;

revoke execute on function public.contacts_log_stage_change() from public, anon, authenticated;

create trigger contacts_log_stage_change
  after insert or update of stage on public.contacts
  for each row execute function public.contacts_log_stage_change();

-- ===========================================================================
-- Trigger: touch added/changed/removed -> recompute contacts.last_touch_at
-- (latest sent or received touch; notes don't count as contact with the client).
-- ===========================================================================
create function public.touches_refresh_last_touch()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.contacts c
       set last_touch_at = (
         select max(t.occurred_at) from public.touches t
          where t.contact_id = old.contact_id and t.direction <> 'note')
     where c.id = old.contact_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    update public.contacts c
       set last_touch_at = (
         select max(t.occurred_at) from public.touches t
          where t.contact_id = new.contact_id and t.direction <> 'note')
     where c.id = new.contact_id
       and (tg_op = 'UPDATE' or new.direction <> 'note');
  end if;

  return null;
end;
$$;

revoke execute on function public.touches_refresh_last_touch() from public, anon, authenticated;

create trigger touches_refresh_last_touch
  after insert or delete or update of occurred_at, direction, contact_id on public.touches
  for each row execute function public.touches_refresh_last_touch();

-- ===========================================================================
-- tasks.contact_id -> contacts. Deleting a contact keeps the task, clears the link.
-- Composite key so a task can only link to the same user's contact.
-- ===========================================================================
alter table public.tasks
  add constraint tasks_contact_fkey foreign key (contact_id, user_id)
    references public.contacts (id, user_id) on delete set null (contact_id);

create index tasks_contact_id_idx on public.tasks (contact_id) where contact_id is not null;
