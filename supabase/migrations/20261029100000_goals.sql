-- Phase 4 (Goals): long-term goals measured on a metric or a routine item.
-- Every table: id / user_id / created_at, RLS with one policy per action, index on user_id.

-- ===========================================================================
-- goals: e.g. "Earn €18,000 in 2026" (total) or "€3,000 in a single month" (level).
--   type total = add up from start_date; level = reach the target in one month.
--   source_kind + source_id = what it's measured on:
--     'metric'  → public.metrics.id (sum of its entries)
--     'routine' → public.routine_items.id (number of days it was ticked)
--   source_id points at one of two tables, so there is no foreign key; the app
--   only reads it through RLS, so a goal can never show someone else's data.
-- ===========================================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  title text not null check (char_length(trim(title)) between 1 and 80),
  short_label text not null check (char_length(trim(short_label)) between 1 and 24),
  type text not null default 'total' check (type in ('total', 'level')),
  source_kind text not null default 'metric' check (source_kind in ('metric', 'routine')),
  source_id uuid not null,
  target numeric(14, 2) not null check (target > 0),
  start_date date not null default ((now() at time zone 'Europe/Sarajevo')::date),
  deadline date not null,
  -- Money goals: also count open deals in the pipeline towards the goal.
  include_pipeline boolean not null default false,

  constraint goals_deadline_after_start check (deadline > start_date)
);

comment on table public.goals is 'Long-term goals. source_id is a metrics.id or routine_items.id depending on source_kind.';

create index goals_user_id_idx on public.goals (user_id);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "goals_insert_own" on public.goals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "goals_update_own" on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "goals_delete_own" on public.goals
  for delete to authenticated
  using ((select auth.uid()) = user_id);
