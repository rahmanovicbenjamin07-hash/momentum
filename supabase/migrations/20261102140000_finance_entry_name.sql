-- Finance logs get a name ("Groceries", "November salary"); note stays the
-- optional short description. Logs saved before this get their category as name.

alter table public.finance_entries add column name text;

update public.finance_entries set name = category where name is null;

alter table public.finance_entries
  alter column name set not null,
  add constraint finance_entries_name_check check (char_length(trim(name)) between 1 and 60);
