-- Phase 1 (Today page): routine items, their daily checks, one-off tasks and daily logs.
-- Every table: id / user_id / created_at, RLS with one policy per action, index on user_id.

-- ===========================================================================
-- routine_items: repeating things ("Gym", "Read 20 min") and the days they happen.
-- ===========================================================================
create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  title text not null check (char_length(trim(title)) between 1 and 200),
  -- 7 flags, Monday first: {Mon, Tue, Wed, Thu, Fri, Sat, Sun}
  days boolean[] not null default '{t,t,t,t,t,t,t}'
    check (cardinality(days) = 7 and array_position(days, null) is null),
  time time,                                   -- null = "Anytime"
  position integer not null default 0,
  active boolean not null default true,

  -- Lets routine_checks reference (id, user_id) so a check can only point at your own item.
  constraint routine_items_id_user_id_key unique (id, user_id)
);

comment on table public.routine_items is 'Repeating routine items. days = Mon..Sun flags.';

create index routine_items_user_id_position_idx on public.routine_items (user_id, position);

alter table public.routine_items enable row level security;

create policy "routine_items_select_own" on public.routine_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "routine_items_insert_own" on public.routine_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "routine_items_update_own" on public.routine_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "routine_items_delete_own" on public.routine_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- routine_checks: one row per routine item per day (done, or why it was missed).
-- ===========================================================================
create table public.routine_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  routine_item_id uuid not null,
  date date not null,
  done boolean not null default false,
  miss_reason text check (miss_reason in ('Tired', 'No time', 'Travel', 'Sick', 'Forgot', 'Other')),

  constraint routine_checks_item_date_key unique (routine_item_id, date),
  -- Composite FK: the item must exist AND belong to the same user. Deleting the item deletes its checks.
  constraint routine_checks_routine_item_fkey foreign key (routine_item_id, user_id)
    references public.routine_items (id, user_id) on delete cascade
);

comment on table public.routine_checks is 'Daily tick (or miss reason) for a routine item.';

-- (routine_item_id, date) unique above also serves the foreign key lookups.
create index routine_checks_user_id_date_idx on public.routine_checks (user_id, date);

alter table public.routine_checks enable row level security;

create policy "routine_checks_select_own" on public.routine_checks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "routine_checks_insert_own" on public.routine_checks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "routine_checks_update_own" on public.routine_checks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "routine_checks_delete_own" on public.routine_checks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- tasks: one-off tasks for a given day.
-- ===========================================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  title text not null check (char_length(trim(title)) between 1 and 200),
  notes text check (char_length(notes) <= 2000),
  due_date date not null default ((now() at time zone 'Europe/Sarajevo')::date),
  time time,                                   -- null = "Anytime"
  tag text check (char_length(tag) between 1 and 32),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'done', 'dropped')),
  completed_at timestamptz,                    -- filled in automatically, see trigger below
  position integer not null default 0,
  -- Links to a contact from Phase 2. The foreign key is added when the contacts table exists.
  contact_id uuid
);

comment on table public.tasks is 'One-off tasks. completed_at is maintained by trigger from status.';

create index tasks_user_id_due_date_idx on public.tasks (user_id, due_date);

alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "tasks_insert_own" on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "tasks_delete_own" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Keep completed_at in step with status: set when a task becomes done, cleared otherwise.
-- Runs with the caller's rights (security invoker, the default) and only touches NEW.
create function public.tasks_set_completed_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.tasks_set_completed_at() from public, anon, authenticated;

create trigger tasks_set_completed_at
  before insert or update of status, completed_at on public.tasks
  for each row execute function public.tasks_set_completed_at();

-- ===========================================================================
-- daily_logs: one note + energy level per user per day.
-- ===========================================================================
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  date date not null,
  note text check (char_length(note) <= 5000),
  energy smallint check (energy between 1 and 5),

  -- Also the user_id index (user_id is the leading column).
  constraint daily_logs_user_id_date_key unique (user_id, date)
);

comment on table public.daily_logs is 'Daily note and energy (1-5). One row per user per day.';

alter table public.daily_logs enable row level security;

create policy "daily_logs_select_own" on public.daily_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "daily_logs_insert_own" on public.daily_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "daily_logs_update_own" on public.daily_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "daily_logs_delete_own" on public.daily_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);
