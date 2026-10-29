-- Phase 5: nightly backups to Storage, restore, delete account.
-- The Edge Functions in supabase/functions/{backup,restore,delete-account} do the work;
-- this migration adds the bucket, who may read it, the nightly Cron job and the
-- restore function the "restore" Edge Function calls.

-- ===========================================================================
-- Storage bucket 'backups' (private). Files: backups/<user id>/<YYYY-MM-DD>.json
-- and backups/<user id>/before-restore-<timestamp>.json.
-- Users may only LIST / DOWNLOAD files in their own folder. There are no
-- insert / update / delete policies: only the Edge Functions (service role) write.
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/json'])
on conflict (id) do nothing;

create policy "backups_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'backups' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ===========================================================================
-- Nightly backup: Cron calls the 'backup' Edge Function over HTTP (pg_net).
-- '0 2 * * *' is 02:00 UTC = 03:00 Sarajevo in winter (CET), 04:00 in summer (CEST).
-- The x-cron-secret header comes from Vault (secret 'cron_secret'); the function
-- compares it with its CRON_SECRET env var, so nobody else can trigger it.
-- ===========================================================================
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'momentum-backup',
  '0 2 * * *',
  $job$
  select net.http_post(
    url := 'https://esnaegxkcmlyzawakojr.supabase.co/functions/v1/backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);

-- ===========================================================================
-- restore_user_data(tables): replaces the signed-in user's data with a backup's
-- rows, all in ONE transaction: if any row fails, nothing changes.
--
--   * security invoker: runs as the user, so RLS applies on top of the
--     explicit "where user_id = auth.uid()" on every delete, and every inserted
--     row gets user_id = auth.uid() whatever the file says.
--   * Order: parents before children (contacts and templates before tasks and
--     touches, because of their foreign keys). Deletes run in reverse.
--   * Columns missing from an older backup get their default value.
--   * Inserting contacts makes the stage-change trigger add history rows; those
--     are removed so only the backup's own stage_history is kept.
--
-- Returns { "restoredTables": <tables with rows>, "rows": <rows inserted> }.
-- ===========================================================================
create function public.restore_user_data(p_tables jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_order text[] := array[
    'routine_items', 'routine_checks', 'contacts', 'templates', 'touches', 'stage_history',
    'tasks', 'daily_logs', 'metrics', 'metric_entries', 'goals',
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
