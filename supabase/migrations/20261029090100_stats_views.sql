-- Phase 3 (Stats): read-only views and functions behind the Stats page.
--
-- All of them run with the CALLER's rights (security_invoker / security invoker),
-- so Row Level Security still applies: you only ever count your own rows.
-- Functions are callable by signed-in users only (anon is revoked at the bottom).
--
-- Ranges: p_from / p_to are calendar days, both included, in the user's time zone
-- (profiles.timezone, default Europe/Sarajevo). Where they are optional, null = no limit.
-- The API returns at most 1000 rows per call (config.toml max_rows).

-- ===========================================================================
-- my_time_zone(): the signed-in user's time zone, used to turn timestamps into calendar days.
-- ===========================================================================
create function public.my_time_zone()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select p.timezone from public.profiles p where p.user_id = (select auth.uid())),
    'Europe/Sarajevo'
  );
$$;

-- ===========================================================================
-- contact_outreach_facts (view): one row per contact with what the stats need:
-- where it came from, how it was first reached, how far it got and what it was worth.
--   channel / template_id = of the FIRST sent message (channel falls back to the contact's).
--   furthest_step: 0 new, 1 contacted, 2 replied, 3 meeting, 4 proposal, 5 won
--   (highest stage ever reached, so a lead that was lost after a meeting still counts as 3).
--   won_on / won_amount are only set while the contact is in stage 'won'.
-- ===========================================================================
create view public.contact_outreach_facts
with (security_invoker = true)
as
with tz as (
  select public.my_time_zone() as name
),
first_sent as (
  select distinct on (t.contact_id)
         t.contact_id, t.occurred_at, t.channel, t.template_id
    from public.touches t
   where t.direction = 'sent'
   order by t.contact_id, t.occurred_at, t.created_at
),
replies as (
  select t.contact_id
    from public.touches t
   where t.direction = 'received' or (t.direction = 'sent' and t.got_reply)
   group by t.contact_id
),
history as (
  select h.contact_id,
         max(case h.to_stage
               when 'contacted' then 1
               when 'replied' then 2
               when 'meeting' then 3
               when 'proposal' then 4
               when 'won' then 5
               else 0
             end) as max_step,
         min(h.changed_at) filter (
           where h.to_stage in ('contacted', 'replied', 'meeting', 'proposal', 'won')
         ) as first_contacted_at,
         max(h.changed_at) filter (where h.to_stage = 'won') as won_at
    from public.stage_history h
   group by h.contact_id
)
select
  c.id as contact_id,
  c.user_id,
  c.source,
  coalesce(fs.channel, c.channel, 'other') as channel,
  fs.template_id,
  c.stage,
  -- least() skips nulls: first sent message or first move past 'new', whichever came first.
  (least(fs.occurred_at, h.first_contacted_at) at time zone tz.name)::date as first_contacted_on,
  greatest(
    coalesce(h.max_step, 0),
    case when r.contact_id is not null then 2 else 0 end,
    case when fs.contact_id is not null then 1 else 0 end
  ) as furthest_step,
  case when c.stage = 'won'
       then coalesce((h.won_at at time zone tz.name)::date, c.won_month)
  end as won_on,
  case when c.stage = 'won' then c.won_amount end as won_amount
from public.contacts c
cross join tz
left join first_sent fs on fs.contact_id = c.id
left join replies r on r.contact_id = c.id
left join history h on h.contact_id = c.id;

comment on view public.contact_outreach_facts is
  'Per contact: source, first channel/template, first contacted day, furthest stage step (0-5), won day and amount.';

-- ===========================================================================
-- stats_daily_completion(from, to): one row per day with tasks + routine done / total and %.
-- Same rules as the Today page: tasks due that day (dropped ones left out), routine items
-- that are active, scheduled on that weekday and already existed. percent is null when
-- there was nothing to do. Range is capped at 1001 days.
-- ===========================================================================
create function public.stats_daily_completion(p_from date, p_to date)
returns table (
  day date,
  tasks_done integer,
  tasks_total integer,
  routine_done integer,
  routine_total integer,
  done integer,
  total integer,
  percent integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with tz as (
    select public.my_time_zone() as name
  ),
  days as (
    select p_from + i as day
      from generate_series(0, least(p_to - p_from, 1000)) as i
  ),
  task_counts as (
    select t.due_date as day,
           count(*) filter (where t.status = 'done') as done,
           count(*) filter (where t.status <> 'dropped') as total
      from public.tasks t
     where t.due_date between p_from and p_to
     group by t.due_date
  ),
  routine_counts as (
    select d.day,
           count(*) filter (where rc.done) as done,
           count(*) as total
      from days d
      cross join tz
      join public.routine_items ri
        on ri.active
       and ri.days[extract(isodow from d.day)::int]          -- days[1] = Monday … days[7] = Sunday
       and (ri.created_at at time zone tz.name)::date <= d.day
      left join public.routine_checks rc
        on rc.routine_item_id = ri.id and rc.date = d.day
     group by d.day
  )
  select d.day,
         coalesce(tc.done, 0)::int,
         coalesce(tc.total, 0)::int,
         coalesce(rcn.done, 0)::int,
         coalesce(rcn.total, 0)::int,
         (coalesce(tc.done, 0) + coalesce(rcn.done, 0))::int,
         (coalesce(tc.total, 0) + coalesce(rcn.total, 0))::int,
         round(
           100.0 * (coalesce(tc.done, 0) + coalesce(rcn.done, 0))
           / nullif(coalesce(tc.total, 0) + coalesce(rcn.total, 0), 0)
         )::int
    from days d
    left join task_counts tc on tc.day = d.day
    left join routine_counts rcn on rcn.day = d.day
   order by d.day;
$$;

-- ===========================================================================
-- stats_outreach_funnel(from?, to?): 5 rows contacted → replied → meeting → proposal → won.
-- Takes the contacts first reached in the range and counts how many got at least that far.
-- pct_of_previous = % of the step before (null for the first step or when the step before is 0).
-- ===========================================================================
create function public.stats_outreach_funnel(p_from date default null, p_to date default null)
returns table (
  stage text,
  step integer,
  contacts integer,
  pct_of_previous numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with cohort as (
    select f.furthest_step
      from public.contact_outreach_facts f
     where f.first_contacted_on is not null
       and (p_from is null or f.first_contacted_on >= p_from)
       and (p_to is null or f.first_contacted_on <= p_to)
  ),
  steps as (
    select s.stage, s.step,
           (select count(*) from cohort c where c.furthest_step >= s.step) as contacts
      from (values ('contacted', 1), ('replied', 2), ('meeting', 3), ('proposal', 4), ('won', 5))
           as s (stage, step)
  )
  select st.stage,
         st.step,
         st.contacts::int,
         round(100.0 * st.contacts / nullif(lag(st.contacts) over (order by st.step), 0), 1)
    from steps st
   order by st.step;
$$;

-- ===========================================================================
-- stats_reply_rates(from?, to?): sent messages, replies and reply % grouped three ways.
-- dimension = 'source' | 'channel' | 'template'. key = the source / channel value or the
-- template id (null key = sent without a template). label = template name (null otherwise).
-- A reply = a sent message marked "got reply". Sorted by most sent first.
-- ===========================================================================
create function public.stats_reply_rates(p_from date default null, p_to date default null)
returns table (
  dimension text,
  key text,
  label text,
  sent integer,
  replies integer,
  rate numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with tz as (
    select public.my_time_zone() as name
  ),
  sent as (
    select c.source, t.channel, t.template_id, tp.name as template_name, t.got_reply
      from public.touches t
      cross join tz
      join public.contacts c on c.id = t.contact_id
      left join public.templates tp on tp.id = t.template_id
     where t.direction = 'sent'
       and (p_from is null or t.occurred_at >= (p_from::timestamp at time zone tz.name))
       and (p_to is null or t.occurred_at < ((p_to + 1)::timestamp at time zone tz.name))
  ),
  grouped as (
    select 'source' as dimension, s.source as key, null::text as label,
           count(*) as sent, count(*) filter (where s.got_reply) as replies
      from sent s group by s.source
    union all
    select 'channel', s.channel, null,
           count(*), count(*) filter (where s.got_reply)
      from sent s group by s.channel
    union all
    select 'template', s.template_id::text, s.template_name,
           count(*), count(*) filter (where s.got_reply)
      from sent s group by s.template_id, s.template_name
  )
  select g.dimension, g.key, g.label, g.sent::int, g.replies::int,
         round(100.0 * g.replies / g.sent, 1)
    from grouped g
   order by g.dimension, g.sent desc, g.key;
$$;

-- ===========================================================================
-- stats_revenue(from?, to?): won deals and € won grouped three ways (same shape as reply rates).
-- Uses contacts in stage 'won' with an amount, by the day they were moved to won.
-- Channel / template = of the first sent message to that contact.
-- ===========================================================================
create function public.stats_revenue(p_from date default null, p_to date default null)
returns table (
  dimension text,
  key text,
  label text,
  deals integer,
  amount numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with won as (
    select f.source, f.channel, f.template_id, tp.name as template_name, f.won_amount
      from public.contact_outreach_facts f
      left join public.templates tp on tp.id = f.template_id
     where f.won_amount is not null
       and (p_from is null or f.won_on >= p_from)
       and (p_to is null or f.won_on <= p_to)
  ),
  grouped as (
    select 'source' as dimension, w.source as key, null::text as label,
           count(*) as deals, sum(w.won_amount) as amount
      from won w group by w.source
    union all
    select 'channel', w.channel, null, count(*), sum(w.won_amount)
      from won w group by w.channel
    union all
    select 'template', w.template_id::text, w.template_name, count(*), sum(w.won_amount)
      from won w group by w.template_id, w.template_name
  )
  select g.dimension, g.key, g.label, g.deals::int, g.amount
    from grouped g
   order by g.dimension, g.amount desc, g.key;
$$;

-- ===========================================================================
-- stats_tasks_by_tag(from?, to?): number of tasks completed per tag, by the day they were
-- ticked off. tag null = tasks without a tag. Most done first.
-- ===========================================================================
create function public.stats_tasks_by_tag(p_from date default null, p_to date default null)
returns table (
  tag text,
  done integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with tz as (
    select public.my_time_zone() as name
  )
  select t.tag, count(*)::int
    from public.tasks t
    cross join tz
   where t.status = 'done'
     and t.completed_at is not null
     and (p_from is null or t.completed_at >= (p_from::timestamp at time zone tz.name))
     and (p_to is null or t.completed_at < ((p_to + 1)::timestamp at time zone tz.name))
   group by t.tag
   order by count(*) desc, t.tag nulls last;
$$;

-- ===========================================================================
-- stats_routine_days(from, to): one row per routine item per day that was scheduled
-- (or has a tick anyway). done + miss_reason come from routine_checks;
-- scheduled and not done with no reason = "Not answered".
-- A full year of 5+ items is over 1000 rows: fetch it in parts (e.g. per quarter).
-- Range is capped at 1001 days.
-- ===========================================================================
create function public.stats_routine_days(p_from date, p_to date)
returns table (
  routine_item_id uuid,
  title text,
  day date,
  scheduled boolean,
  done boolean,
  miss_reason text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with tz as (
    select public.my_time_zone() as name
  ),
  days as (
    select p_from + i as day
      from generate_series(0, least(p_to - p_from, 1000)) as i
  ),
  grid as (
    select ri.id, ri.title, ri.position, d.day,
           (ri.active
             and ri.days[extract(isodow from d.day)::int]
             and (ri.created_at at time zone tz.name)::date <= d.day) as scheduled
      from days d
      cross join tz
      cross join public.routine_items ri
  )
  select g.id, g.title, g.day, g.scheduled, coalesce(rc.done, false), rc.miss_reason
    from grid g
    left join public.routine_checks rc
      on rc.routine_item_id = g.id and rc.date = g.day
   where g.scheduled or rc.id is not null
   order by g.day, g.position, g.id;
$$;

-- ===========================================================================
-- Access: signed-in users only. (RLS already returns nothing to anon; this makes it explicit.)
-- ===========================================================================
revoke all on public.contact_outreach_facts from anon;
grant select on public.contact_outreach_facts to authenticated;

revoke execute on function public.my_time_zone() from public, anon;
revoke execute on function public.stats_daily_completion(date, date) from public, anon;
revoke execute on function public.stats_outreach_funnel(date, date) from public, anon;
revoke execute on function public.stats_reply_rates(date, date) from public, anon;
revoke execute on function public.stats_revenue(date, date) from public, anon;
revoke execute on function public.stats_tasks_by_tag(date, date) from public, anon;
revoke execute on function public.stats_routine_days(date, date) from public, anon;

grant execute on function public.my_time_zone() to authenticated;
grant execute on function public.stats_daily_completion(date, date) to authenticated;
grant execute on function public.stats_outreach_funnel(date, date) to authenticated;
grant execute on function public.stats_reply_rates(date, date) to authenticated;
grant execute on function public.stats_revenue(date, date) to authenticated;
grant execute on function public.stats_tasks_by_tag(date, date) to authenticated;
grant execute on function public.stats_routine_days(date, date) to authenticated;
