-- Manual goals: any goal you like ("Have €10,000 saved by 3 May 2027"), with a
-- starting point, its own unit (€, KM, count…), and updates you type in yourself.
-- Existing goals (linked to a metric or routine item) keep working unchanged.

-- ===========================================================================
-- goals: new columns and a third source kind
-- ===========================================================================

-- What a goal is measured on: 'manual' = numbers you enter yourself (goal_updates).
alter table public.goals drop constraint goals_source_kind_check;
alter table public.goals
  add constraint goals_source_kind_check check (source_kind in ('metric', 'routine', 'manual'));

-- Manual goals have no metric or routine item behind them.
alter table public.goals alter column source_id drop not null;
alter table public.goals
  add constraint goals_source_id_matches_kind check ((source_kind = 'manual') = (source_id is null));

-- Unit of a manual goal (linked goals take the unit of their metric). bam = Bosnian convertible mark (KM).
alter table public.goals
  add column unit text check (unit in ('eur', 'bam', 'count', 'hours', 'km', 'days'));
alter table public.goals
  add constraint goals_manual_has_unit check (source_kind <> 'manual' or unit is not null);

-- Where the goal starts, e.g. €3,000 already saved. 0 for existing goals.
alter table public.goals
  add column start_value numeric(14, 2) not null default 0
  check (start_value >= 0 and start_value < 100000000);

-- Lets goal_updates point at (goal id, owner) so an update can only belong to its goal's owner.
alter table public.goals add constraint goals_id_user_id_key unique (id, user_id);

comment on column public.goals.unit is 'Manual goals only: eur, bam (KM), count, hours, km, days.';
comment on column public.goals.start_value is 'Value at start_date, e.g. money already saved.';

-- ===========================================================================
-- goal_updates: "on this day the goal stood at <value>" (one per goal per day)
-- ===========================================================================
create table public.goal_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  goal_id uuid not null,
  date date not null default ((now() at time zone 'Europe/Sarajevo')::date),
  value numeric(14, 2) not null check (value >= 0 and value < 100000000),
  note text check (note is null or char_length(note) <= 200),

  -- Same owner as the goal; deleting the goal deletes its updates.
  constraint goal_updates_goal_fk foreign key (goal_id, user_id)
    references public.goals (id, user_id) on delete cascade,
  constraint goal_updates_one_per_day unique (goal_id, date)
);

comment on table public.goal_updates is 'Values typed in by hand for manual goals, at most one per goal per day.';

create index goal_updates_user_id_idx on public.goal_updates (user_id);

alter table public.goal_updates enable row level security;

create policy "goal_updates_select_own" on public.goal_updates
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "goal_updates_insert_own" on public.goal_updates
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "goal_updates_update_own" on public.goal_updates
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "goal_updates_delete_own" on public.goal_updates
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- Backups: restore_user_data now also restores goal_updates (after goals).
-- Same function as in 20261029130000_backups.sql, with one more table.
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
    'tasks', 'daily_logs', 'metrics', 'metric_entries', 'goals', 'goal_updates',
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
