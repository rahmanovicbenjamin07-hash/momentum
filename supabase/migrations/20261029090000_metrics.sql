-- Phase 3 (Stats): self-logged metrics ("Money earned", "Trainings", ...) and their values.
-- Every table: id / user_id / created_at, RLS with one policy per action, index on user_id.
-- Every user gets 3 built-in metrics: new users via the sign-up trigger, existing users via the backfill below.

-- ===========================================================================
-- metrics: what the user tracks.
-- ===========================================================================
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  name text not null check (char_length(trim(name)) between 1 and 100),
  unit text not null default 'count' check (unit in ('eur', 'count', 'hours', 'km', 'days')),
  log_every text not null default 'monthly' check (log_every in ('daily', 'weekly', 'monthly')),
  yearly_goal numeric(14, 2) check (yearly_goal > 0),          -- null = no goal
  -- Set only on the built-in metrics so code can find them by key
  -- (e.g. a won deal adds its amount to 'money_earned'). null = metric the user made.
  builtin text check (builtin in ('money_earned', 'trainings', 'hours_worked')),
  position integer not null default 0,

  -- Lets metric_entries reference (id, user_id) so an entry can only point at your own metric.
  constraint metrics_id_user_id_key unique (id, user_id),
  -- One of each built-in per user. Also the user_id index (user_id is the leading column).
  constraint metrics_user_id_builtin_key unique (user_id, builtin)
);

comment on table public.metrics is 'Self-logged metrics. builtin marks the 3 default metrics every user gets.';

-- No two metrics with the same name (ignoring case and spaces) for one user.
create unique index metrics_user_id_name_key on public.metrics (user_id, lower(trim(name)));

alter table public.metrics enable row level security;

create policy "metrics_select_own" on public.metrics
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "metrics_insert_own" on public.metrics
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "metrics_update_own" on public.metrics
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "metrics_delete_own" on public.metrics
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- metric_entries: one logged value (a day, week or month total) for a metric.
-- ===========================================================================
create table public.metric_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  metric_id uuid not null,
  -- Monthly values use the first day of the month; weekly/daily values their own day.
  entry_date date not null default ((now() at time zone 'Europe/Sarajevo')::date),
  value numeric(14, 2) not null check (value >= 0),
  note text check (char_length(note) <= 500),
  -- Set when the value came from a won deal (Phase 2). null = logged by hand.
  contact_id uuid,

  -- Deleting the metric deletes its entries.
  constraint metric_entries_metric_fkey foreign key (metric_id, user_id)
    references public.metrics (id, user_id) on delete cascade,
  -- Deleting the contact keeps the money, only clears the link.
  constraint metric_entries_contact_fkey foreign key (contact_id, user_id)
    references public.contacts (id, user_id) on delete set null (contact_id),
  -- A won deal adds at most one entry per metric (upsert on metric_id,contact_id).
  -- Hand-logged entries have contact_id null, and nulls never clash.
  constraint metric_entries_metric_id_contact_id_key unique (metric_id, contact_id)
);

comment on table public.metric_entries is 'Logged values per metric. contact_id is set when the value came from a won deal.';

-- Also the user_id index; serves "this year / last year" ranges.
create index metric_entries_user_id_entry_date_idx on public.metric_entries (user_id, entry_date);
create index metric_entries_metric_id_entry_date_idx on public.metric_entries (metric_id, entry_date);
create index metric_entries_contact_id_idx on public.metric_entries (contact_id) where contact_id is not null;

alter table public.metric_entries enable row level security;

create policy "metric_entries_select_own" on public.metric_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "metric_entries_insert_own" on public.metric_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "metric_entries_update_own" on public.metric_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "metric_entries_delete_own" on public.metric_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- Built-in metrics for NEW users: the sign-up trigger from the profiles migration
-- now also creates them. Same function, same security notes (security definer,
-- empty search_path, nobody can call it directly).
-- ===========================================================================
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

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ===========================================================================
-- Built-in metrics for EXISTING users (one-time backfill). Skips any the user already has.
-- ===========================================================================
insert into public.metrics (user_id, name, unit, log_every, builtin, position)
select u.id, d.name, d.unit, 'monthly', d.builtin, d.position
from auth.users u
cross join (values
  ('Money earned', 'eur', 'money_earned', 0),
  ('Trainings', 'count', 'trainings', 1),
  ('Hours worked', 'hours', 'hours_worked', 2)
) as d (name, unit, builtin, position)
on conflict do nothing;
