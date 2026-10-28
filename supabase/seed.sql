-- Demo data for the Today page (matches design/today.png).
--
-- Where it can run:
--   * Supabase dashboard → SQL Editor (live project): adds demo data to YOUR account.
--   * Local stack (`supabase db reset`): there are no users there, so it just skips.
--
-- Safe by design:
--   * It never deletes anything. It stops if your account already has routine items or tasks.
--   * All dates are relative to "today" in Europe/Sarajevo, so it looks right whenever you run it.
--     The 3-of-5 routine split from the screenshot shows exactly on a Mon/Wed/Fri.
--
-- What you get:
--   * 5 repeating items (created 60 days ago) and 60 days of ticks.
--   * Streak = 12: yesterday "Read 20 pages" was missed (the week's forgiven rest day),
--     the 12 days before were complete, and 14–16 days ago had misses that end the streak.
--   * 6 tasks for today (2 done), 1 overdue task from yesterday, today's energy = 4.

do $$
declare
  -- Only needed if the project has more than one user: put your login email here.
  v_email text := null;

  v_user uuid;
  v_user_count int;
  v_today date := (now() at time zone 'Europe/Sarajevo')::date;
  v_items_since timestamptz := ((v_today - 60) + time '12:00') at time zone 'Europe/Sarajevo';

  v_wake uuid;
  v_workout uuid;
  v_plan uuid;
  v_read uuid;
  v_outreach uuid;
begin
  -- ---------------------------------------------------------------------------
  -- Whose account? (SQL Editor has no signed-in user, so auth.uid() is null here.)
  -- ---------------------------------------------------------------------------
  if v_email is not null then
    select id into v_user from auth.users where lower(email) = lower(v_email);
    if v_user is null then
      raise exception 'No user with email %. Check the spelling, or sign in to the app once first.', v_email;
    end if;
  else
    select count(*) into v_user_count from auth.users;
    if v_user_count = 0 then
      raise notice 'Seed skipped: no users yet. Sign in to the app once, then run this file again.';
      return;
    elsif v_user_count > 1 then
      raise exception 'This project has % users. Set v_email at the top of seed.sql to your login email.', v_user_count;
    end if;
    select id into v_user from auth.users;
  end if;

  if exists (select 1 from public.routine_items where user_id = v_user)
     or exists (select 1 from public.tasks where user_id = v_user) then
    raise exception 'Seed stopped: this account already has routine items or tasks. Nothing was changed.';
  end if;

  -- ---------------------------------------------------------------------------
  -- Repeating items. days = {Mon, Tue, Wed, Thu, Fri, Sat, Sun}
  -- ---------------------------------------------------------------------------
  insert into public.routine_items (user_id, created_at, title, days, time, position)
  values (v_user, v_items_since, 'Wake up', '{t,t,t,t,t,f,f}', '06:00', 0)
  returning id into v_wake;

  insert into public.routine_items (user_id, created_at, title, days, time, position)
  values (v_user, v_items_since, 'Morning workout', '{t,f,t,f,t,f,f}', '06:30', 1)
  returning id into v_workout;

  insert into public.routine_items (user_id, created_at, title, days, time, position)
  values (v_user, v_items_since, 'Plan today''s top 3 tasks', '{t,t,t,t,t,t,t}', null, 2)
  returning id into v_plan;

  insert into public.routine_items (user_id, created_at, title, days, time, position)
  values (v_user, v_items_since, 'Read 20 pages', '{t,t,t,t,t,t,t}', '21:30', 3)
  returning id into v_read;

  insert into public.routine_items (user_id, created_at, title, days, time, position)
  values (v_user, v_items_since, 'Send 10 outreach messages', '{t,t,t,t,t,f,f}', null, 4)
  returning id into v_outreach;

  -- ---------------------------------------------------------------------------
  -- 60 days of checks. "ago" = days before today. One row per scheduled item per day,
  -- except today's unfinished items (no row = not done yet).
  -- ---------------------------------------------------------------------------
  insert into public.routine_checks (user_id, routine_item_id, date, done, miss_reason)
  select v_user, item_id, day, outcome.done, outcome.reason
  from (
    select i.id as item_id, d::date as day, v_today - d::date as ago
    from public.routine_items i
    cross join generate_series(v_today - 60, v_today, interval '1 day') as d
    where i.user_id = v_user
      and i.days[extract(isodow from d)::int]          -- scheduled that weekday (isodow: Mon = 1)
  ) as grid
  cross join lateral (
    select
      case
        -- Today: wake up, workout and planning done; reading and outreach still open.
        when ago = 0 then item_id in (v_wake, v_workout, v_plan)
        -- Yesterday: reading missed (no reason yet, so the "Yesterday you missed" banner shows).
        when ago = 1 then item_id <> v_read
        -- The 12-day streak.
        when ago between 2 and 13 then true
        -- Three misses in a row end the streak (two always fall in the same Mon–Sun week).
        when ago between 14 and 16 then item_id <> v_read
        -- Older history: mostly done, a few misses for realistic stats.
        when item_id = v_read and ago % 9 = 0 then false
        when item_id = v_outreach and ago % 11 = 3 then false
        when item_id = v_workout and ago % 13 = 5 then false
        else true
      end as done,
      case
        when ago in (0, 1) then null
        when ago in (14, 15) and item_id = v_read then 'Travel'
        when ago = 16 and item_id = v_read then 'Tired'
        when ago >= 17 and item_id = v_read and ago % 9 = 0 then (array['Tired', 'Forgot', 'No time'])[ago % 3 + 1]
        when ago >= 17 and item_id = v_outreach and ago % 11 = 3 then 'No time'
        when ago >= 17 and item_id = v_workout and ago % 13 = 5 then (array['Sick', 'Tired'])[ago % 2 + 1]
        else null
      end as reason
  ) as outcome
  where not (ago = 0 and not outcome.done);

  -- ---------------------------------------------------------------------------
  -- Tasks: 6 for today (2 done) + 1 overdue from yesterday.
  -- completed_at is filled in by the trigger for done tasks.
  -- ---------------------------------------------------------------------------
  insert into public.tasks (user_id, title, due_date, time, tag, priority, status, position)
  values
    (v_user, 'Follow up with Emir Kovač (Bloom Studio)', v_today, '10:30', 'outreach',  'high',   'todo', 0),
    (v_user, 'Prepare demo for Thursday call',           v_today, '14:00', 'work',      'high',   'todo', 1),
    (v_user, 'Call accountant about October invoice',    v_today, null,    'personal',  'low',    'todo', 2),
    (v_user, 'Review Q4 goals',                          v_today, null,    'personal',  'low',    'todo', 3),
    (v_user, 'Plan weekly content calendar',             v_today, null,    'marketing', 'medium', 'done', 4),
    (v_user, 'Update portfolio case study',              v_today, null,    'work',      'medium', 'done', 5);

  insert into public.tasks (user_id, created_at, title, due_date, tag, priority, status, position)
  values (v_user, now() - interval '1 day', 'Send proposal to Lejla Hodžić', v_today - 1, 'outreach', 'high', 'todo', 0);

  -- ---------------------------------------------------------------------------
  -- Today's daily log: energy 4, empty note.
  -- ---------------------------------------------------------------------------
  insert into public.daily_logs (user_id, date, energy)
  values (v_user, v_today, 4);

  raise notice 'Demo data added for user % (today = %).', v_user, v_today;
end;
$$;
