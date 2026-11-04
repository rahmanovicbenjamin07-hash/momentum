-- ===========================================================================
-- Description for repeating tasks (one-off tasks already have tasks.notes).
-- Optional; same 2000-character limit as tasks.notes. Adds a column only, no data changes.
-- RLS policies on routine_items already cover new columns.
-- ===========================================================================
alter table public.routine_items
  add column notes text check (char_length(notes) <= 2000);

comment on column public.routine_items.notes is 'Optional description, shown in the task pop-up.';
