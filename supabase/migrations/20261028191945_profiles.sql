-- Phase 0: one profile row per user, created automatically on sign-up.
--
-- id is the auth user id (as the phase spec asks). user_id is kept as well so
-- this table follows the same rules and RLS policy shape as every other table;
-- a check constraint keeps the two equal.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),

  display_name text check (char_length(display_name) between 1 and 80),
  timezone text not null default 'Europe/Sarajevo' check (char_length(timezone) between 1 and 64),
  -- 0 = Sunday … 6 = Saturday (1 = Monday)
  week_start smallint not null default 1 check (week_start between 0 and 6),
  -- Hour (0–23) at which "today" ends, e.g. 3 means 01:30 still counts as yesterday.
  day_end_hour smallint not null default 0 check (day_end_hour between 0 and 23),
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  language text not null default 'en' check (language ~ '^[a-z]{2}$'),

  constraint profiles_user_id_key unique (user_id),
  constraint profiles_id_is_user_id check (id = user_id)
);

comment on table public.profiles is 'Per-user settings. One row per auth user, created by trigger on sign-up.';

-- unique (user_id) above already creates the index on user_id.

-- ---------------------------------------------------------------------------
-- Row Level Security: each user can only see and change their own profile.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Create a profile when a new user signs up.
--
-- Exception to the security_invoker rule: this trigger runs as Supabase's auth
-- service, which has no rights on public.profiles, so it must be
-- security definer. It is locked down: empty search_path, fully qualified names,
-- and nobody can call it directly.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, user_id, display_name)
  values (
    new.id,
    new.id,
    nullif(
      left(
        trim(coalesce(
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          split_part(new.email, '@', 1)
        )),
        80
      ),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
