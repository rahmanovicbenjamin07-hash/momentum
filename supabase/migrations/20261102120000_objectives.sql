-- Goals become "objective + key results".
--   objectives      = the goal in words, e.g. "Become a better freelancer" (+ why it matters).
--   goals (existing) = its key results: how you'll know you got there. Each has a kind:
--     number     → a number from a starting point to a target (what every goal was until now)
--     milestones → a list of steps (goal_milestones)
--     habit      → do something N times a week: routine item ticks, or ticks saved in goal_updates (value 1)
--     done       → done or not done (completed_on)
--   objective_checkins = a weekly "how confident am I? 1–5" + note, for goals that aren't numbers.
-- Nothing is deleted: every existing goal gets its own objective with the same id and title.

-- ===========================================================================
-- objectives
-- ===========================================================================
create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  title text not null check (char_length(trim(title)) between 1 and 80),
  why text check (why is null or char_length(why) <= 300),

  -- Lets key results and check-ins point at (objective id, owner).
  constraint objectives_id_user_id_key unique (id, user_id)
);

comment on table public.objectives is 'A goal in words. Its key results (public.goals) say how progress is measured.';

create index objectives_user_id_idx on public.objectives (user_id);

alter table public.objectives enable row level security;

create policy "objectives_select_own" on public.objectives
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "objectives_insert_own" on public.objectives
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "objectives_update_own" on public.objectives
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "objectives_delete_own" on public.objectives
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- goals → key results: objective, kind, completed_on
-- ===========================================================================
alter table public.goals add column objective_id uuid;
alter table public.goals
  add constraint goals_objective_fk foreign key (objective_id, user_id)
  references public.objectives (id, user_id) on delete cascade;
create index goals_objective_id_idx on public.goals (objective_id);

-- Existing goals: one objective each, with the goal's id (so links like /goals?goal=<id> keep working).
insert into public.objectives (id, user_id, created_at, title)
select id, user_id, created_at, title from public.goals;
update public.goals set objective_id = id;
alter table public.goals alter column objective_id set not null;

-- A key result saved without an objective (old backups, seed.sql) gets its own, like the migration above.
create or replace function public.goals_default_objective()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.objective_id is null then
    insert into public.objectives (id, user_id, title)
    values (new.id, new.user_id, new.title)
    on conflict (id) do nothing;
    new.objective_id := new.id;
  end if;
  return new;
end;
$$;

create trigger goals_default_objective
  before insert on public.goals
  for each row execute function public.goals_default_objective();

alter table public.goals
  add column kind text not null default 'number'
  check (kind in ('number', 'milestones', 'habit', 'done'));

-- "done" key results: the day it was done; null = not yet.
alter table public.goals add column completed_on date;
alter table public.goals
  add constraint goals_completed_only_done check (completed_on is null or kind = 'done');

-- target means: number → the target; habit → times a week (1–7); milestones / done → always 1.
alter table public.goals
  add constraint goals_kind_fields check (
    case kind
      when 'number' then true
      when 'habit' then type = 'total' and source_kind in ('routine', 'manual') and target between 1 and 7
      else type = 'total' and source_kind = 'manual' and target = 1
    end
  );

-- Only hand-updated *number* key results need a unit.
alter table public.goals drop constraint goals_manual_has_unit;
alter table public.goals
  add constraint goals_manual_has_unit check (kind <> 'number' or source_kind <> 'manual' or unit is not null);

comment on column public.goals.objective_id is 'The objective this key result belongs to.';
comment on column public.goals.kind is 'number, milestones (goal_milestones), habit (N times a week), done (completed_on).';
comment on column public.goals.target is 'number: the target; habit: times a week (1–7); milestones / done: 1.';

-- ===========================================================================
-- goal_milestones: the steps of a "milestones" key result
-- ===========================================================================
create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  goal_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  due_date date,
  -- The day it was ticked done; null = still to do.
  done_on date,
  position integer not null default 0 check (position >= 0),

  -- Same owner as the key result; deleting it deletes its steps.
  constraint goal_milestones_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade
);

comment on table public.goal_milestones is 'Steps of a milestones key result, in position order.';

create index goal_milestones_user_id_idx on public.goal_milestones (user_id);
create index goal_milestones_goal_id_idx on public.goal_milestones (goal_id);

alter table public.goal_milestones enable row level security;

create policy "goal_milestones_select_own" on public.goal_milestones
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "goal_milestones_insert_own" on public.goal_milestones
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "goal_milestones_update_own" on public.goal_milestones
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "goal_milestones_delete_own" on public.goal_milestones
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- objective_checkins: "how confident am I?" 1–5 + note, at most one per day
-- ===========================================================================
create table public.objective_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  objective_id uuid not null,
  date date not null default ((now() at time zone 'Europe/Sarajevo')::date),
  confidence smallint not null check (confidence between 1 and 5),
  note text check (note is null or char_length(note) <= 300),

  constraint objective_checkins_objective_fk foreign key (objective_id, user_id)
    references public.objectives (id, user_id) on delete cascade,
  constraint objective_checkins_one_per_day unique (objective_id, date)
);

comment on table public.objective_checkins is 'Weekly check-ins on an objective: confidence 1–5 and a note.';

create index objective_checkins_user_id_idx on public.objective_checkins (user_id);

alter table public.objective_checkins enable row level security;

create policy "objective_checkins_select_own" on public.objective_checkins
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "objective_checkins_insert_own" on public.objective_checkins
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "objective_checkins_update_own" on public.objective_checkins
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "objective_checkins_delete_own" on public.objective_checkins
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- Backups: restore_user_data now also restores objectives (before goals),
-- goal_milestones and objective_checkins. Same function as in
-- 20261029140000_manual_goals.sql, with three more tables.
-- Old backups without objectives still restore: the trigger above adds them.
-- ===========================================================================
create or replace function public.restore_user_data(p_tables jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_order text[] := array[
    'routine_items', 'routine_checks', 'contacts', 'templates', 'touches', 'stage_history',
    'tasks', 'daily_logs', 'metrics', 'metric_entries',
    'objectives', 'goals', 'goal_updates', 'goal_milestones', 'objective_checkins',
    'reviews', 'lessons', 'experiments', 'ideas', 'notification_prefs'
  ];
  v_table text;
  v_rows jsonb;
  v_cols text;
  v_count int;
  v_tables int := 0;
  v_total int := 0;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  if jsonb_typeof(p_tables) is distinct from 'object' then
    raise exception 'Backup has no tables';
  end if;

  -- 1. Delete the user's current rows, children first.
  for i in reverse array_length(v_order, 1) .. 1 loop
    execute format('delete from public.%I where user_id = $1', v_order[i]) using v_uid;
  end loop;

  -- 2. Insert the backup's rows, parents first.
  foreach v_table in array v_order loop
    if v_table = 'stage_history' then
      -- Drop the rows the contacts trigger just added.
      delete from public.stage_history where user_id = v_uid;
    end if;

    v_rows := p_tables -> v_table;
    if v_rows is null or jsonb_typeof(v_rows) <> 'array' or jsonb_array_length(v_rows) = 0 then
      continue;
    end if;

    -- Columns that exist in the table and appear in at least one row (user_id is always ours).
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into v_cols
      from pg_catalog.pg_attribute as a
     where a.attrelid = format('public.%I', v_table)::regclass
       and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
       and a.attname <> 'user_id'
       and exists (select 1 from jsonb_array_elements(v_rows) as r where r ? a.attname);

    if v_cols is null then
      continue;
    end if;

    execute format(
      'insert into public.%1$I (user_id, %2$s) select $2, %2$s from jsonb_populate_recordset(null::public.%1$I, $1)',
      v_table, v_cols
    ) using v_rows, v_uid;
    get diagnostics v_count = row_count;

    v_tables := v_tables + 1;
    v_total := v_total + v_count;
  end loop;

  return jsonb_build_object('restoredTables', v_tables, 'rows', v_total);
end;
$$;

revoke execute on function public.restore_user_data(jsonb) from public, anon;
grant execute on function public.restore_user_data(jsonb) to authenticated;
