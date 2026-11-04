-- ===========================================================================
-- "Not done" tasks count as not done.
-- A task marked ✗ (or dropped from the Overdue block) has status 'dropped'. It used to be
-- left out of the day's total; now it stays in the total, so it lowers that day's %
-- (and the 90% streak). Same rule as the Today page.
-- Only the task_counts part changes; grants are kept by `create or replace`.
-- ===========================================================================
create or replace function public.stats_daily_completion(p_from date, p_to date)
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
           count(*) as total
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

comment on function public.stats_daily_completion(date, date) is
  'One row per day: tasks + routine done / total and %. Not-done (dropped) tasks count in the total.';
