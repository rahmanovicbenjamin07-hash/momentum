-- ===========================================================================
-- Time ranges: a task or repeating task can run "from" its time "until" end_time
-- (e.g. classes 08:00–11:00). Optional; adds columns only, no data changes.
-- end_time needs a start time and must be later on the same day.
-- RLS policies on both tables already cover new columns.
-- ===========================================================================
alter table public.tasks
  add column end_time time,
  add constraint tasks_end_time_after_time check (end_time is null or (time is not null and end_time > time));

alter table public.routine_items
  add column end_time time,
  add constraint routine_items_end_time_after_time check (end_time is null or (time is not null and end_time > time));

comment on column public.tasks.end_time is 'Optional end of a time range (time–end_time). Null = just a start time.';
comment on column public.routine_items.end_time is 'Optional end of a time range (time–end_time). Null = just a start time.';
