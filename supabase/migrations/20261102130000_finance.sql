-- Finance: money you earn and spend, typed in day by day, summed up by month.
--   finance_entries  one row per income or expense (in € or KM; amount_eur is
--                    worked out by the database at the fixed rate 1 € = 1.95583 KM)
--   finance_settings one row per user: what was already saved before logging started
-- Also: backups / Reset everything (restore_user_data) now cover both tables.

-- ===========================================================================
-- finance_entries
-- ===========================================================================
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  date date not null,
  kind text not null check (kind in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0 and amount < 100000000),
  -- bam = Bosnian convertible mark (KM).
  currency text not null default 'eur' check (currency in ('eur', 'bam')),
  amount_eur numeric(14, 2) generated always as (
    case when currency = 'bam' then round(amount / 1.95583, 2) else amount end
  ) stored,
  category text not null check (char_length(trim(category)) between 1 and 40),
  note text check (note is null or char_length(note) <= 200)
);

create index finance_entries_user_id_idx on public.finance_entries (user_id);
create index finance_entries_user_date_idx on public.finance_entries (user_id, date);

alter table public.finance_entries enable row level security;

create policy "finance_entries_select_own" on public.finance_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "finance_entries_insert_own" on public.finance_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "finance_entries_update_own" on public.finance_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "finance_entries_delete_own" on public.finance_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- finance_settings: "I had €X saved on <date>" (one row per user)
-- ===========================================================================
create table public.finance_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  -- Can be below zero (a debt to pay off first).
  starting_savings numeric(14, 2) not null default 0
    check (starting_savings > -100000000 and starting_savings < 100000000),
  starting_currency text not null default 'eur' check (starting_currency in ('eur', 'bam')),
  starting_date date not null,

  unique (user_id)
);

create index finance_settings_user_id_idx on public.finance_settings (user_id);

alter table public.finance_settings enable row level security;

create policy "finance_settings_select_own" on public.finance_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "finance_settings_insert_own" on public.finance_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "finance_settings_update_own" on public.finance_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "finance_settings_delete_own" on public.finance_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ===========================================================================
-- Backups: restore_user_data now also restores finance_entries and
-- finance_settings (so Reset everything clears them too). Same function as in
-- 20261102120000_objectives.sql, with two more tables. amount_eur is a
-- generated column, so it is skipped on insert and worked out again.
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
    'reviews', 'lessons', 'experiments', 'ideas', 'notification_prefs',
    'finance_entries', 'finance_settings'
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
