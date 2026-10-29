-- Phase 5: in-app notifications, created every 15 minutes by Supabase Cron.
-- generate_notifications() looks at each user's notification settings and adds
-- bell notifications (follow-ups, routine reminders, close the day, weekly review).
-- It never sends email and never changes anything except inserting notifications.

create extension if not exists pg_cron with schema pg_catalog;

-- ===========================================================================
-- Why SECURITY DEFINER:
--   Cron runs this with no signed-in user, so auth.uid() is null and RLS would
--   hide every row. The function therefore runs with its owner's rights so it
--   can read every user's profile, settings, contacts, routine and tasks.
--   It only INSERTS into public.notifications (each row for that same user)
--   and changes nothing else. Nobody can call it from the app: execute is
--   revoked from public, anon and authenticated below; only Cron (postgres) runs it.
--
-- Rules per user:
--   * local time = now() in profiles.timezone.
--   * skip the user if 'master' is off, or local time is inside quiet hours
--     (same rule as src/lib/quietHours.ts isQuiet: start counts, end doesn't,
--     works across midnight, start = end ⇒ never quiet).
--   * a setting fires when its time is in [local time − 15 min, local time].
--     The job runs every 15 minutes, so every time gets caught; dedupe_key
--     stops the same notification being added twice.
--   * one user's bad data (e.g. an unknown time zone) is logged and skipped,
--     it doesn't stop the others.
--
-- Returns how many notifications were added.
-- ===========================================================================
create or replace function public.generate_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_local timestamp;     -- the user's wall-clock time
  v_date date;           -- the user's calendar day
  v_time time;           -- the user's time of day, to the minute
  v_isodow int;          -- 1 = Monday … 7 = Sunday (also the index into routine_items.days)
  v_master boolean;
  v_quiet record;
  v_pref record;
  v_item_id uuid;
  v_n int;
  v_rows int;
  v_user_total int;
  v_total int := 0;
begin
  for v_profile in select p.user_id, p.timezone from public.profiles as p loop
    begin
      v_user_total := 0;
      v_local := now() at time zone v_profile.timezone;
      v_date := v_local::date;
      v_time := date_trunc('minute', v_local)::time;
      v_isodow := extract(isodow from v_date)::int;

      -- Master switch (no row = on).
      v_master := null;
      select np.enabled into v_master
        from public.notification_prefs as np
       where np.user_id = v_profile.user_id and np.key = 'master';
      if v_master is false then
        continue;
      end if;

      -- Quiet hours.
      select np.time, np.time_end into v_quiet
        from public.notification_prefs as np
       where np.user_id = v_profile.user_id and np.key = 'quiet_hours'
         and np.enabled and np.time is not null and np.time_end is not null;
      if found and v_quiet.time <> v_quiet.time_end and (
           case when v_quiet.time < v_quiet.time_end
                then v_time >= v_quiet.time and v_time < v_quiet.time_end
                else v_time >= v_quiet.time or v_time < v_quiet.time_end
           end) then
        continue;
      end if;

      -- Settings whose time falls in the last 15 minutes (wrapping past midnight).
      for v_pref in
        select np.key
          from public.notification_prefs as np
         where np.user_id = v_profile.user_id
           and np.enabled
           and np.time is not null
           and np.key not in ('master', 'quiet_hours', 'email_summary')
           and ((extract(epoch from (v_time - np.time))::int / 60 % 1440) + 1440) % 1440
               between 0 and 15
      loop
        v_rows := 0;

        if v_pref.key = 'followups' then
          -- Due today, and overdue (one "late" notification per contact per day).
          insert into public.notifications (user_id, kind, title, body, link, dedupe_key)
          select c.user_id,
                 f.kind,
                 left(case when f.kind = 'followup_due'
                           then 'Follow up with ' || left(trim(c.name), 90)
                           else left(trim(c.name), 90) || ' is ' || f.days_late
                                || case when f.days_late = 1 then ' day late' else ' days late' end
                      end, 120),
                 case when f.kind = 'followup_due' then 'Due today' else 'Follow-up overdue' end
                   || coalesce(' · ' || case c.channel
                        when 'email' then 'Email'
                        when 'linkedin' then 'LinkedIn'
                        when 'phone' then 'Phone'
                        when 'whatsapp' then 'WhatsApp'
                        when 'upwork' then 'Upwork'
                        when 'inperson' then 'In person'
                        when 'other' then 'Other'
                      end, ''),
                 '/outreach/' || c.id,
                 f.kind || ':' || c.id || ':' || v_date
            from public.contacts as c
            cross join lateral (
              select case when c.next_follow_up = v_date then 'followup_due' else 'followup_late' end as kind,
                     v_date - c.next_follow_up as days_late
            ) as f
           where c.user_id = v_profile.user_id
             and c.next_follow_up <= v_date
             and c.stage not in ('won', 'lost')
          on conflict (user_id, dedupe_key) do nothing;
          get diagnostics v_rows = row_count;

        elsif v_pref.key like 'routine:%' then
          -- One routine item: only if it's on today's schedule and not ticked yet.
          v_item_id := substring(v_pref.key from 9)::uuid;
          insert into public.notifications (user_id, kind, title, body, link, dedupe_key)
          select ri.user_id, 'routine', left(trim(ri.title), 120), 'Routine reminder', '/',
                 'routine:' || ri.id || ':' || v_date
            from public.routine_items as ri
           where ri.id = v_item_id
             and ri.user_id = v_profile.user_id
             and ri.active
             and ri.days[v_isodow]
             and not exists (
               select 1 from public.routine_checks as rc
                where rc.routine_item_id = ri.id and rc.date = v_date and rc.done
             )
          on conflict (user_id, dedupe_key) do nothing;
          get diagnostics v_rows = row_count;

        elsif v_pref.key = 'anytime' then
          -- Routine items with no time that are on today's schedule and not ticked yet.
          select count(*) into v_n
            from public.routine_items as ri
           where ri.user_id = v_profile.user_id
             and ri.active
             and ri.time is null
             and ri.days[v_isodow]
             and not exists (
               select 1 from public.routine_checks as rc
                where rc.routine_item_id = ri.id and rc.date = v_date and rc.done
             );
          if v_n > 0 then
            insert into public.notifications (user_id, kind, title, body, link, dedupe_key)
            values (v_profile.user_id, 'anytime', 'Anytime routine items', v_n || ' still to do today', '/',
                    'anytime:' || v_date)
            on conflict (user_id, dedupe_key) do nothing;
            get diagnostics v_rows = row_count;
          end if;

        elsif v_pref.key = 'close_day' then
          -- Open tasks for today (overdue ones count too: they roll over as well).
          select count(*) into v_n
            from public.tasks as t
           where t.user_id = v_profile.user_id and t.status = 'todo' and t.due_date <= v_date;
          insert into public.notifications (user_id, kind, title, body, link, dedupe_key)
          values (v_profile.user_id, 'close_day', 'Close the day',
                  case when v_n = 0 then 'All tasks done — add your daily note'
                       when v_n = 1 then '1 task left — it moves to tomorrow'
                       else v_n || ' tasks left — they move to tomorrow' end,
                  '/', 'close_day:' || v_date)
          on conflict (user_id, dedupe_key) do nothing;
          get diagnostics v_rows = row_count;

        elsif v_pref.key = 'weekly_review' and v_isodow = 7 then
          -- Sundays only. "Week 43" = ISO week number.
          insert into public.notifications (user_id, kind, title, body, link, dedupe_key)
          values (v_profile.user_id, 'weekly_review', 'Weekly review is ready',
                  'Week ' || to_char(v_date, 'IW')::int || ' numbers are filled in',
                  '/improve', 'weekly_review:' || v_date)
          on conflict (user_id, dedupe_key) do nothing;
          get diagnostics v_rows = row_count;
        end if;

        v_user_total := v_user_total + v_rows;
      end loop;

      v_total := v_total + v_user_total;
    exception when others then
      -- This user's inserts are undone; carry on with the next user.
      raise warning 'generate_notifications: skipped user % (%)', v_profile.user_id, sqlerrm;
    end;
  end loop;

  return v_total;
end;
$$;

revoke execute on function public.generate_notifications() from public, anon, authenticated;

-- Every 15 minutes. Running this again just updates the existing job.
select cron.schedule('momentum-notifications', '*/15 * * * *', 'select public.generate_notifications()');
