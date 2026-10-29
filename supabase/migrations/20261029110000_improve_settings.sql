-- Phase 5 (Improvements + Settings): weekly reviews, lessons, experiments, ideas,
-- notification settings, the bell's notifications, and two new profile settings.
-- Every table: id / user_id / created_at, RLS with one policy per action, index on user_id.

-- ===========================================================================
-- reviews: one weekly review per week (week_start = that week's Monday).
--   stats_snapshot = the week's numbers when it was saved, so old reviews never change:
--   { task_completion, outreach_sent, replies, meetings }.
-- ===========================================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  week_start date not null check (extract(isodow from week_start) = 1),
  wins text not null default '' check (char_length(wins) <= 1000),
  misses text not null default '' check (char_length(misses) <= 1000),
  lesson text not null default '' check (char_length(lesson) <= 1000),
  focus text not null default '' check (char_length(focus) <= 1000),
  status text not null default 'draft' check (status in ('draft', 'saved')),
  stats_snapshot jsonb not null check (jsonb_typeof(stats_snapshot) = 'object'),

  constraint reviews_user_week_key unique (user_id, week_start)
);

comment on table public.reviews is 'Weekly reviews. week_start is a Monday; one review per user per week.';

-- unique (user_id, week_start) above already gives an index that starts with user_id.

alter table public.reviews enable row level security;

create policy "reviews_select_own" on public.reviews
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "reviews_delete_own" on public.reviews
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- lessons: short things learned, grouped by area.
-- ===========================================================================
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  area text not null default 'Other' check (area in ('Outreach', 'Routine', 'Work', 'Health', 'Other')),
  text text not null check (char_length(trim(text)) between 1 and 500)
);

create index lessons_user_id_idx on public.lessons (user_id);

alter table public.lessons enable row level security;

create policy "lessons_select_own" on public.lessons
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "lessons_insert_own" on public.lessons
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "lessons_update_own" on public.lessons
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "lessons_delete_own" on public.lessons
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- experiments: try one change for a while and compare a metric before / during.
-- ===========================================================================
create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  title text not null check (char_length(trim(title)) between 1 and 120),
  hypothesis text not null default '' check (char_length(hypothesis) <= 500),
  metric text not null default 'reply_rate'
    check (metric in ('reply_rate', 'task_completion', 'outreach_sent', 'routine_rate')),
  start_date date not null default ((now() at time zone 'Europe/Sarajevo')::date),
  end_date date not null,
  status text not null default 'running' check (status in ('running', 'kept', 'dropped')),
  before_value numeric,
  during_value numeric,
  result text not null default '' check (char_length(result) <= 500),

  constraint experiments_end_after_start check (end_date > start_date)
);

create index experiments_user_id_idx on public.experiments (user_id);

alter table public.experiments enable row level security;

create policy "experiments_select_own" on public.experiments
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "experiments_insert_own" on public.experiments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "experiments_update_own" on public.experiments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "experiments_delete_own" on public.experiments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- ideas: things to maybe try later.
-- ===========================================================================
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  text text not null check (char_length(trim(text)) between 1 and 300),
  status text not null default 'new' check (status in ('new', 'testing', 'done', 'dropped'))
);

create index ideas_user_id_idx on public.ideas (user_id);

alter table public.ideas enable row level security;

create policy "ideas_select_own" on public.ideas
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ideas_insert_own" on public.ideas
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "ideas_update_own" on public.ideas
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "ideas_delete_own" on public.ideas
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- notification_prefs: one row per setting (Settings → Notifications).
--   key = a fixed setting, or 'routine:<routine item id>' for a routine reminder
--   (the app creates those itself the first time, with the item's time).
--   time = when it fires; for quiet_hours, when quiet time starts. time_end = quiet_hours only.
-- ===========================================================================
create table public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  key text not null check (
    key in ('master', 'anytime', 'followups', 'close_day', 'weekly_review', 'email_summary', 'quiet_hours')
    or key ~ '^routine:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  enabled boolean not null default true,
  time time,
  time_end time,

  constraint notification_prefs_user_key_key unique (user_id, key),
  constraint notification_prefs_end_only_quiet check (time_end is null or key = 'quiet_hours')
);

comment on table public.notification_prefs is 'Notification settings. key is a fixed setting or routine:<routine_items.id>.';

-- unique (user_id, key) above already gives an index that starts with user_id.

alter table public.notification_prefs enable row level security;

create policy "notification_prefs_select_own" on public.notification_prefs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notification_prefs_insert_own" on public.notification_prefs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notification_prefs_update_own" on public.notification_prefs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notification_prefs_delete_own" on public.notification_prefs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- notifications: what shows under the bell.
--   dedupe_key stops the same reminder being created twice,
--   e.g. 'followup_due:<contact id>:2026-10-28'.
-- ===========================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  kind text not null
    check (kind in ('followup_due', 'followup_late', 'routine', 'anytime', 'close_day', 'weekly_review')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 300),
  link text check (char_length(link) between 1 and 500),
  read_at timestamptz,
  dedupe_key text not null check (char_length(dedupe_key) between 1 and 200),

  constraint notifications_user_dedupe_key unique (user_id, dedupe_key)
);

-- Newest first for the bell; also serves as the user_id index.
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_insert_own" on public.notifications
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- profiles: two new settings.
-- ===========================================================================
alter table public.profiles
  add column backup_enabled boolean not null default true,
  add column weekly_targets jsonb not null
    default '{"outreaches":20,"task_completion":80,"meetings":2}'::jsonb
    check (jsonb_typeof(weekly_targets) = 'object');

-- ===========================================================================
-- Default notification settings. One function used by the sign-up trigger and
-- the backfill below. Skips any setting the user already has.
-- Same security notes as handle_new_user (security definer, empty search_path,
-- nobody can call it directly).
-- ===========================================================================
create function public.create_default_notification_prefs(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_prefs (user_id, key, enabled, time, time_end)
  values
    (p_user_id, 'master',        true,  null,           null),
    (p_user_id, 'anytime',       true,  time '09:00',   null),
    (p_user_id, 'followups',     true,  time '09:00',   null),
    (p_user_id, 'close_day',     true,  time '21:00',   null),
    (p_user_id, 'weekly_review', true,  time '18:00',   null),
    (p_user_id, 'email_summary', false, time '07:00',   null),
    (p_user_id, 'quiet_hours',   true,  time '22:00',   time '06:00')
  on conflict (user_id, key) do nothing;
$$;

revoke execute on function public.create_default_notification_prefs(uuid) from public, anon, authenticated;

-- Sign-up trigger: profile + built-in metrics (as before) + default notification settings.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, user_id, display_name)
  values (
    new.id,
    new.id,
    nullif(
      left(
        trim(coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          split_part(new.email, '@', 1)
        )),
        80
      ),
      ''
    )
  )
  on conflict (id) do nothing;

  insert into public.metrics (user_id, name, unit, log_every, builtin, position)
  values
    (new.id, 'Money earned', 'eur', 'monthly', 'money_earned', 0),
    (new.id, 'Trainings', 'count', 'monthly', 'trainings', 1),
    (new.id, 'Hours worked', 'hours', 'monthly', 'hours_worked', 2)
  on conflict do nothing;

  perform public.create_default_notification_prefs(new.id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Existing users (one-time backfill).
select public.create_default_notification_prefs(u.id) from auth.users as u;
