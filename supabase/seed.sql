-- Demo data for the Today page (matches design/today.png).
--
-- Where it can run:
--   * Supabase dashboard → SQL Editor (live project): adds demo data to YOUR account.
--   * Local stack (`supabase db reset`): there are no users there, so it just skips.
--
-- Three independent parts: Today (below), Outreach (second block, matches design/outreach.png
-- and design/contact.png) and My metrics (third block, matches design/progress.png).
-- Each part skips itself if your account already has that kind of data,
-- so you can run the whole file again after a new phase is added.
--
-- Safe by design:
--   * It never deletes anything. The Today part skips if your account already has routine items or tasks.
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
    -- Notice (not an error) so the Outreach part below still runs.
    raise notice 'Today seed skipped: this account already has routine items or tasks. Nothing was changed.';
    return;
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

-- =============================================================================
-- Outreach demo data (design/outreach.png + design/contact.png).
--
-- What you get:
--   * 5 message templates.
--   * 38 leads: LinkedIn 12 · Google Maps 14 · In person 5 · Upwork 7.
--     Stages: New 9 · Contacted 13 · Replied 6 · Meeting 4 · Proposal 3 · Won 2 · Lost 1.
--     4 follow-ups due (2 today, 2 late) and €18,400 open pipeline, as in the screenshot.
--   * Emir Kovač exactly like design/contact.png (details, notes, 4-entry timeline).
--   * Touches for every lead past "New" (last_touch_at is filled in by the trigger),
--     and a stage history for each lead (new → … → current stage).
--   * Links the Today tasks "Follow up with Emir Kovač…" and "Send proposal to Lejla Hodžić" to their contacts.
--
-- Skips itself if your account already has contacts or templates.
-- =============================================================================
do $$
declare
  -- Only needed if the project has more than one user: put your login email here.
  v_email text := null;

  v_user uuid;
  v_user_count int;
  v_tz constant text := 'Europe/Sarajevo';
  v_today date := (now() at time zone 'Europe/Sarajevo')::date;

  v_tpl_opener uuid;
  v_tpl_follow1 uuid;
  v_tpl_nosite uuid;
  v_tpl_upwork uuid;
  v_emir uuid;
begin
  -- ---------------------------------------------------------------------------
  -- Whose account? (same rules as the Today part)
  -- ---------------------------------------------------------------------------
  if v_email is not null then
    select id into v_user from auth.users where lower(email) = lower(v_email);
    if v_user is null then
      raise exception 'No user with email %. Check the spelling, or sign in to the app once first.', v_email;
    end if;
  else
    select count(*) into v_user_count from auth.users;
    if v_user_count = 0 then
      raise notice 'Outreach seed skipped: no users yet. Sign in to the app once, then run this file again.';
      return;
    elsif v_user_count > 1 then
      raise exception 'This project has % users. Set v_email at the top of both seed blocks to your login email.', v_user_count;
    end if;
    select id into v_user from auth.users;
  end if;

  if exists (select 1 from public.contacts where user_id = v_user)
     or exists (select 1 from public.templates where user_id = v_user) then
    raise notice 'Outreach seed skipped: this account already has contacts or templates. Nothing was changed.';
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- Templates
  -- ---------------------------------------------------------------------------
  insert into public.templates (user_id, created_at, name, channel, body)
  values (v_user, now() - interval '30 days', 'Opener A', 'linkedin',
    'Hi {{first_name}}, congrats on the launch. I noticed your booking page is slow on mobile. I help small studios fix exactly that. Open to a 15-minute call?')
  returning id into v_tpl_opener;

  insert into public.templates (user_id, created_at, name, channel, body)
  values (v_user, now() - interval '30 days', 'Follow-up #1', 'linkedin',
    'Hi {{first_name}}, following up on my note from last week. Happy to share a quick audit of your booking page on mobile, no strings attached.')
  returning id into v_tpl_follow1;

  insert into public.templates (user_id, created_at, name, channel, body)
  values (v_user, now() - interval '30 days', 'Follow-up #2', null,
    'Hi {{first_name}}, last nudge from me. If now isn''t the right time, no problem. Just let me know and I''ll check back in a few months.');

  insert into public.templates (user_id, created_at, name, channel, body)
  values (v_user, now() - interval '30 days', 'No website intro', 'email',
    'Hi {{first_name}}, I found your business on Google Maps but couldn''t find a website. I build simple, fast sites for local businesses, usually live in two weeks. Want me to send a free mock-up?')
  returning id into v_tpl_nosite;

  insert into public.templates (user_id, created_at, name, channel, body)
  values (v_user, now() - interval '30 days', 'Upwork proposal', 'upwork',
    'Hi {{first_name}}, I''ve shipped several projects like this one. Here''s how I''d approach it: a short call to agree the scope, a first version within a week, then two rounds of changes. Happy to share examples.')
  returning id into v_tpl_upwork;

  -- ---------------------------------------------------------------------------
  -- Leads. One row per lead in a temporary table (gone when this script ends),
  -- then copied into contacts.
  --   fu_in     = next follow-up in N days (negative = late, null = none)
  --   added_ago = created N days ago
  --   touch_ago = last sent/received touch N days ago (null = never contacted)
  -- ---------------------------------------------------------------------------
  create temp table seed_leads (
    id uuid primary key default gen_random_uuid(),
    source text not null,
    name text not null,
    company text, role text, category text, city text,
    phone text, email text, website text, linkedin text, met_where text,
    budget numeric, connects int, proposal_status text,
    stage text not null, channel text, priority text not null default 'medium',
    deal_value numeric, won_amount numeric,
    fu_in int, added_ago int not null, touch_ago int,
    tags text[] not null default '{}'
  ) on commit drop;

  -- LinkedIn (12)
  insert into seed_leads (source, name, company, role, city, linkedin, email, phone, website, stage, channel, priority, deal_value, fu_in, added_ago, touch_ago, tags)
  values
    ('linkedin', 'Emir Kovač',   'Bloom Studio',        'Founder',            'Sarajevo',  'example-emir-kovac',   'emir.kovac@example.com', '+387 61 000 000', 'https://bloom-studio.example', 'replied', 'linkedin', 'high', 1200, 0, 14, 3, '{agency,warm}'),
    ('linkedin', 'Daniel Weber', 'Kraft & Co',          'Marketing lead',     'Berlin',    'example-daniel-weber', null, null, null, 'new',       'linkedin', 'medium', null, 6,    0,  null, '{}'),
    ('linkedin', 'Lejla Hodžić', 'Hodžić Consulting',   'Owner',              'Sarajevo',  'example-lejla-hodzic', 'lejla@hodzic-consulting.example', null, null, 'proposal', 'email', 'high', 1800, 2, 30, 1, '{warm}'),
    ('linkedin', 'Amar Delić',   'Pixel Forge',         'CEO',                'Sarajevo',  'example-amar-delic',   null, null, null, 'replied',   'linkedin', 'medium', 900,  1,    12, 2,    '{agency}'),
    ('linkedin', 'Lana Marić',   'Brightside Agency',   'Head of Marketing',  'Zagreb',    'example-lana-maric',   null, null, null, 'contacted', 'linkedin', 'medium', null, 3,    8,  0,    '{agency}'),
    ('linkedin', 'Tarik Mehić',  'Codeworks',           'CTO',                'Tuzla',     'example-tarik-mehic',  null, null, null, 'contacted', 'linkedin', 'low',    null, 2,    9,  1,    '{}'),
    ('linkedin', 'Ivana Perić',  'Atelier North',       'Founder',            'Split',     'example-ivana-peric',  null, null, null, 'new',       'linkedin', 'medium', null, 1,    1,  null, '{}'),
    ('linkedin', 'Haris Jusić',  'Greenline Logistics', 'Operations manager', 'Sarajevo',  'example-haris-jusic',  null, null, null, 'new',       'linkedin', 'medium', null, 3,    2,  null, '{}'),
    ('linkedin', 'Mia Novak',    'Studio Oblik',        'Designer',           'Ljubljana', 'example-mia-novak',    null, null, null, 'contacted', 'linkedin', 'low',    null, 4,    10, 0,    '{}'),
    ('linkedin', 'Kenan Hadžić', 'Urban Coffee',        'Owner',              'Mostar',    'example-kenan-hadzic', null, null, null, 'lost',      'linkedin', 'low',    800,  null, 40, 20,   '{}'),
    ('linkedin', 'Jasmina Kurt', 'Kurt Legal',          'Partner',            'Sarajevo',  'example-jasmina-kurt', 'jasmina@kurt-legal.example', null, null, 'replied', 'email', 'medium', 1100, 2, 15, 1, '{}'),
    ('linkedin', 'Petra Horvat', 'Nordic Wood',         'Marketing lead',     'Zagreb',    'example-petra-horvat', null, null, null, 'new',       'linkedin', 'medium', null, 6,    0,  null, '{}');

  -- Google Maps (14). No website => "no-website" tag, like the Add lead form does.
  insert into seed_leads (source, name, category, city, phone, email, website, stage, channel, priority, deal_value, won_amount, fu_in, added_ago, touch_ago, tags)
  values
    ('maps', 'Nova Dental',         'Dentist',            'Sarajevo',   '+387 33 100 200', 'info@nova-dental.example',      'https://nova-dental.example',     'proposal',  'email',    'high',   2400, null, -1,   20, 1,    '{}'),
    ('maps', 'Mostar Tours',        'Travel agency',      'Mostar',     '+387 36 100 300', null,                            null,                              'contacted', 'phone',    'medium', 700,  null, -2,   9,  4,    '{no-website}'),
    ('maps', 'Fitbox Gym',          'Gym',                'Sarajevo',   '+387 33 100 400', 'hello@fitbox.example',          'https://fitbox.example',          'won',       'inperson', 'high',   3000, 3000, null, 45, 14,   '{}'),
    ('maps', 'Dental Smile',        'Dentist',            'Tuzla',      '+387 35 100 500', null,                            'https://dental-smile.example',    'contacted', 'phone',    'medium', null, null, 3,    7,  1,    '{}'),
    ('maps', 'Bistro Lipa',         'Restaurant',         'Sarajevo',   '+387 33 100 600', null,                            null,                              'new',       'phone',    'medium', null, null, 1,    1,  null, '{no-website}'),
    ('maps', 'AutoServis Begić',    'Car repair',         'Zenica',     '+387 32 100 700', null,                            null,                              'contacted', 'phone',    'low',    null, null, 2,    6,  2,    '{no-website}'),
    ('maps', 'Hotel Neretva',       'Hotel',              'Mostar',     '+387 36 100 800', 'booking@hotel-neretva.example', 'https://hotel-neretva.example',   'replied',   'email',    'high',   1500, null, 1,    16, 1,    '{}'),
    ('maps', 'Pekara Zlatno Zrno',  'Bakery',             'Sarajevo',   '+387 33 100 900', null,                            null,                              'new',       'phone',    'medium', null, null, 2,    2,  null, '{no-website}'),
    ('maps', 'Yoga Space',          'Yoga studio',        'Sarajevo',   '+387 61 100 100', 'hi@yoga-space.example',         'https://yoga-space.example',      'replied',   'email',    'medium', 360,  null, 2,    11, 2,    '{}'),
    ('maps', 'Frizerski salon Ena', 'Hair salon',         'Sarajevo',   '+387 62 100 200', null,                            null,                              'contacted', 'phone',    'low',    null, null, 3,    5,  1,    '{no-website}'),
    ('maps', 'Vet Klinika Šapa',    'Veterinary clinic',  'Banja Luka', '+387 51 100 300', 'info@sapa-vet.example',         'https://sapa-vet.example',        'meeting',   'phone',    'medium', 1200, null, 2,    18, 2,    '{}'),
    ('maps', 'Cvjećara Ruža',       'Florist',            'Mostar',     '+387 36 100 400', null,                            null,                              'new',       'phone',    'medium', null, null, 4,    3,  null, '{no-website}'),
    ('maps', 'Apartmani Sunce',     'Holiday apartments', 'Neum',       '+387 36 100 500', 'sunce@apartmani.example',       'https://apartmani-sunce.example', 'contacted', 'email',    'low',    null, null, 5,    8,  2,    '{}'),
    ('maps', 'Fitness Pro',         'Gym',                'Zenica',     '+387 32 100 600', 'info@fitness-pro.example',      'https://fitness-pro.example',     'won',       'inperson', 'medium', 2000, 2000, null, 50, 21,   '{}');

  -- In person (5)
  insert into seed_leads (source, name, company, role, city, met_where, phone, email, stage, channel, priority, deal_value, fu_in, added_ago, touch_ago, tags)
  values
    ('inperson', 'Sara Begić',      'Atelier Sara',       'Owner',      'Sarajevo', 'Startup Meetup',              '+387 61 200 100', null,                        'meeting',   'phone', 'high',   1500, 0, 12, 0,    '{warm}'),
    ('inperson', 'Adnan Selimović', 'Selimović & Sons',   'Director',   'Sarajevo', 'Chamber of Commerce evening', null,              'adnan@selimovic.example',   'contacted', 'email', 'medium', null, 3, 6,  1,    '{}'),
    ('inperson', 'Nina Babić',      'Babić Photo',        'Owner',      'Sarajevo', 'Startup Meetup',              '+387 61 200 300', null,                        'new',       'phone', 'medium', null, 2, 1,  null, '{}'),
    ('inperson', 'Edin Mujić',      'Mujić Construction', 'Owner',      'Tuzla',    'a friend''s wedding',         '+387 61 200 400', null,                        'replied',   'phone', 'medium', 1000, 3, 13, 2,    '{}'),
    ('inperson', 'Selma Hasić',     'Craft Bakery Co',    'Co-founder', 'Sarajevo', 'Sarajevo Business Fair',      null,              'selma@craftbakery.example', 'new',       'email', 'medium', null, 5, 2,  null, '{}');

  -- Upwork (7). The lead name is the job title (no client name yet). Budget is the number from the job post.
  insert into seed_leads (source, name, budget, connects, proposal_status, stage, channel, priority, deal_value, fu_in, added_ago, touch_ago)
  values
    ('upwork', 'Shopify store redesign',                  800,  12, 'sent',      'contacted', 'upwork', 'medium', 740,  2, 5,  2),
    ('upwork', 'React dashboard for a logistics startup', 35,   16, 'interview', 'meeting',   'upwork', 'high',   2100, 1, 10, 1),
    ('upwork', 'Landing page for SaaS launch',            600,  10, 'sent',      'contacted', 'upwork', 'medium', null, 2, 3,  3),
    ('upwork', 'Webflow site migration',                  1200, 14, 'viewed',    'contacted', 'upwork', 'medium', null, 3, 6,  2),
    ('upwork', 'Fix React Native login bug',              45,   8,  'interview', 'meeting',   'upwork', 'medium', 900,  2, 8,  1),
    ('upwork', 'E-commerce product filters',              500,  6,  'sent',      'contacted', 'upwork', 'low',    null, 4, 4,  1),
    ('upwork', 'Booking widget for a clinic',             1000, 12, 'interview', 'proposal',  'upwork', 'medium', 1000, 3, 14, 2);

  insert into public.contacts (
    id, user_id, created_at, source, name, company, role, category, city, phone, email, website,
    linkedin_url, maps_url, met_where, upwork_job_title, upwork_job_url, upwork_budget, connects_spent,
    proposal_status, stage, channel, priority, deal_value, won_amount, won_month, next_follow_up, tags)
  select
    l.id, v_user,
    least(((v_today - l.added_ago) + time '09:00') at time zone v_tz, now()),
    l.source, l.name, l.company, l.role, l.category, l.city, l.phone, l.email, l.website,
    case when l.linkedin is not null then 'https://www.linkedin.com/in/' || l.linkedin end,
    case when l.source = 'maps' then 'https://www.google.com/maps/search/?api=1&query=' || replace(l.name || ' ' || l.city, ' ', '+') end,
    l.met_where,
    case when l.source = 'upwork' then l.name end,
    case when l.source = 'upwork' then 'https://www.upwork.com/jobs/~01' || left(md5(l.name), 16) end,
    l.budget, l.connects, l.proposal_status, l.stage, l.channel, l.priority, l.deal_value, l.won_amount,
    case when l.stage = 'won' then date_trunc('month', v_today)::date end,
    v_today + l.fu_in,
    l.tags
  from seed_leads l;

  select id into v_emir from seed_leads where name = 'Emir Kovač';

  -- Emir's notes (design/contact.png → Notes card).
  update public.contacts
     set notes = (
       select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'body', n.body,
                        'created_at', ((v_today - n.ago) + time '18:00') at time zone v_tz) order by n.ord)
       from (values
         (1, 14, 'Pain: booking page is slow on mobile; customers drop off at the payment step.'),
         (2, 14, 'Angle: show the Atelier Sara booking rebuild as a case study.'),
         (3, 3,  'Decision: Emir decides; co-founder Nina owns the budget.'),
         (4, 3,  'Done: send 2–3 examples.'),
         (5, 3,  'To do: prepare a mini audit of the booking page.')
       ) as n(ord, ago, body)
     )
   where id = v_emir;

  -- ---------------------------------------------------------------------------
  -- Touches. Emir: exactly the timeline from design/contact.png.
  -- ---------------------------------------------------------------------------
  insert into public.touches (user_id, contact_id, occurred_at, channel, direction, template_id, body, got_reply)
  values
    (v_user, v_emir, ((v_today - 14) + time '11:20') at time zone v_tz, 'linkedin', 'note', null,
      'Found via LinkedIn search for design studios in Sarajevo. Small team. Booking site slow on mobile.', false),
    (v_user, v_emir, ((v_today - 13) + time '10:03') at time zone v_tz, 'linkedin', 'sent', v_tpl_opener,
      'Hi Emir, congrats on the new studio launch. I noticed the booking page is slow on mobile. I help studios fix exactly that. Open to a 15-minute call?', false),
    (v_user, v_emir, ((v_today - 6) + time '09:15') at time zone v_tz, 'linkedin', 'sent', v_tpl_follow1,
      'Hi Emir, following up on my note from last week. Happy to share a quick audit of your booking page on mobile, no strings attached.', false),
    (v_user, v_emir, ((v_today - 3) + time '16:42') at time zone v_tz, 'linkedin', 'received', null,
      'Thanks for reaching out, interesting timing. We are rebuilding our booking flow this winter. Could you send two or three examples of similar work?', true);

  -- Everyone else past "New": one sent message, plus a reply for Replied and later stages.
  -- (A time later today is pulled back to "now", so nothing is in the future.)
  insert into public.touches (user_id, contact_id, occurred_at, channel, direction, template_id, body, got_reply)
  select
    v_user, l.id,
    least(((v_today - least(l.touch_ago + case when l.stage = 'contacted' then 0 else 3 end, l.added_ago)) + time '10:15') at time zone v_tz,
          now() - interval '5 minutes'),
    coalesce(l.channel, 'other'), 'sent', t.id,
    coalesce(
      replace(t.body, '{{first_name}}', case when l.source in ('linkedin', 'inperson') then split_part(l.name, ' ', 1) else 'there' end),
      'Hi, following up on our chat. Would a short call this week work?'),
    false
  from seed_leads l
  left join public.templates t on t.id = case
      when l.source = 'linkedin' then v_tpl_opener
      when l.source = 'upwork' then v_tpl_upwork
      when 'no-website' = any (l.tags) then v_tpl_nosite
    end
  where l.id <> v_emir and l.stage <> 'new'
  union all
  select
    v_user, l.id,
    least(((v_today - l.touch_ago) + time '15:40') at time zone v_tz, now() - interval '1 minute'),
    coalesce(l.channel, 'other'), 'received', null,
    case l.stage
      when 'replied'  then 'Thanks, sounds interesting. Can you send a few examples of similar work?'
      when 'meeting'  then 'Sure, let''s talk. Does Thursday at 11 work for a call?'
      when 'proposal' then 'Thanks for the call. Please send over a proposal with a rough timeline and price.'
      when 'won'      then 'Let''s do it. Send the contract and the first invoice.'
      when 'lost'     then 'Thanks, but we''re going with someone else for now.'
    end,
    true
  from seed_leads l
  where l.id <> v_emir and l.stage not in ('new', 'contacted');

  -- ---------------------------------------------------------------------------
  -- Stage history. The trigger already wrote one row per lead ("created at its
  -- current stage"); turn that into "created as New" and add the steps after it,
  -- spread evenly between created_at and the last touch.
  -- ---------------------------------------------------------------------------
  update public.stage_history h
     set from_stage = null, to_stage = 'new', changed_at = c.created_at
    from public.contacts c
   where h.contact_id = c.id and c.user_id = v_user;

  insert into public.stage_history (user_id, contact_id, from_stage, to_stage, changed_at)
  select v_user, c.id, p.path[i - 1], p.path[i],
         c.created_at + (coalesce(c.last_touch_at, now()) - c.created_at) * ((i - 1)::float8 / (cardinality(p.path) - 1))
  from public.contacts c
  cross join lateral (
    select case
      when c.stage = 'lost' then array['new', 'contacted', 'replied', 'lost']
      else (array['new', 'contacted', 'replied', 'meeting', 'proposal', 'won'])
             [1:array_position(array['new', 'contacted', 'replied', 'meeting', 'proposal', 'won'], c.stage)]
    end as path
  ) as p
  cross join lateral generate_series(2, cardinality(p.path)) as i
  where c.user_id = v_user;

  -- ---------------------------------------------------------------------------
  -- Link the Today seed tasks to their contacts (only if they exist and aren't linked yet).
  -- ---------------------------------------------------------------------------
  update public.tasks t
     set contact_id = l.id
    from seed_leads l
   where t.user_id = v_user and t.contact_id is null
     and ((t.title = 'Follow up with Emir Kovač (Bloom Studio)' and l.name = 'Emir Kovač')
       or (t.title = 'Send proposal to Lejla Hodžić' and l.name = 'Lejla Hodžić'));

  raise notice 'Outreach demo data added for user %: % contacts, % touches.', v_user,
    (select count(*) from public.contacts where user_id = v_user),
    (select count(*) from public.touches where user_id = v_user);
end;
$$;

-- =============================================================================
-- Stats → My metrics demo data (design/progress.png).
--
-- What you get (fixed dates: all of 2025, and 2026 up to the end of October):
--   * The 3 built-in metrics set up as in the screenshot:
--     Money earned monthly, goal €18,000 · Trainings weekly, goal 150 · Hours worked weekly, goal 1,700 h.
--   * Money earned: one value per month (dated the 1st).
--     2026 Jan–Oct = €13,950 (Oct €2,200 "2 new clients"); 2025 = €10,400, of which €8,150 by end of Oct (+71%).
--   * Trainings: one value per week (Mondays). 2026 up to 26 Oct = 117; 2025 same time = 78 (+50%), full year 96.
--   * Hours worked: one value per week (Mondays). 2026 up to 26 Oct = 1,371 h; 2025 same time = 1,124 h (+22%).
--
-- Skips itself if your account already has metric entries.
-- Needs the metrics migration (20261029090000_metrics.sql) pushed first.
-- =============================================================================
do $$
declare
  -- Only needed if the project has more than one user: put your login email here.
  v_email text := null;

  v_user uuid;
  v_user_count int;
  v_money uuid;
  v_trainings uuid;
  v_hours uuid;
  v_monday_2025 constant date := date '2025-01-06';  -- first Monday of 2025
  v_monday_2026 constant date := date '2026-01-05';  -- first Monday of 2026
begin
  -- ---------------------------------------------------------------------------
  -- Whose account? (same rules as the other parts)
  -- ---------------------------------------------------------------------------
  if v_email is not null then
    select id into v_user from auth.users where lower(email) = lower(v_email);
    if v_user is null then
      raise exception 'No user with email %. Check the spelling, or sign in to the app once first.', v_email;
    end if;
  else
    select count(*) into v_user_count from auth.users;
    if v_user_count = 0 then
      raise notice 'Metrics seed skipped: no users yet. Sign in to the app once, then run this file again.';
      return;
    elsif v_user_count > 1 then
      raise exception 'This project has % users. Set v_email at the top of every seed block to your login email.', v_user_count;
    end if;
    select id into v_user from auth.users;
  end if;

  if exists (select 1 from public.metric_entries where user_id = v_user) then
    raise notice 'Metrics seed skipped: this account already has metric entries. Nothing was changed.';
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- The 3 built-in metrics (the migration already made them; this only re-adds a deleted one),
  -- then "how often" and yearly goals as in the screenshot.
  -- ---------------------------------------------------------------------------
  insert into public.metrics (user_id, name, unit, log_every, builtin, position)
  values
    (v_user, 'Money earned', 'eur', 'monthly', 'money_earned', 0),
    (v_user, 'Trainings', 'count', 'weekly', 'trainings', 1),
    (v_user, 'Hours worked', 'hours', 'weekly', 'hours_worked', 2)
  on conflict do nothing;

  update public.metrics m
     set log_every = d.log_every, yearly_goal = d.goal
    from (values
      ('money_earned', 'monthly', 18000),
      ('trainings',    'weekly',  150),
      ('hours_worked', 'weekly',  1700)
    ) as d (builtin, log_every, goal)
   where m.user_id = v_user and m.builtin = d.builtin;

  select id into v_money     from public.metrics where user_id = v_user and builtin = 'money_earned';
  select id into v_trainings from public.metrics where user_id = v_user and builtin = 'trainings';
  select id into v_hours     from public.metrics where user_id = v_user and builtin = 'hours_worked';

  if v_money is null or v_trainings is null or v_hours is null then
    raise exception 'A built-in metric is missing (is there already a metric with the same name?). Nothing was changed.';
  end if;

  -- ---------------------------------------------------------------------------
  -- Money earned: monthly totals.
  -- ---------------------------------------------------------------------------
  insert into public.metric_entries (user_id, metric_id, entry_date, value, note)
  select v_user, v_money, make_date(m.y, m.mon, 1), m.value, m.note
  from (values
    (2025,  1,  650, null),
    (2025,  2,  700, null),
    (2025,  3,  720, null),
    (2025,  4,  760, null),
    (2025,  5,  780, null),
    (2025,  6,  800, null),
    (2025,  7,  820, null),
    (2025,  8,  880, null),
    (2025,  9,  990, null),
    (2025, 10, 1050, null),
    (2025, 11, 1100, null),
    (2025, 12, 1150, null),
    (2026,  1,  850, null),
    (2026,  2,  920, null),
    (2026,  3, 1100, null),
    (2026,  4,  980, null),
    (2026,  5, 1350, 'Raised hourly rate'),
    (2026,  6, 1500, null),
    (2026,  7, 1420, null),
    (2026,  8, 1680, 'Fitbox Gym project'),
    (2026,  9, 1950, null),
    (2026, 10, 2200, '2 new clients')
  ) as m (y, mon, value, note);

  -- ---------------------------------------------------------------------------
  -- Trainings: weekly counts.
  --   2025, 52 weeks: mostly 2 a week, 8 lighter weeks of 1 before November.
  --   2026, 43 weeks (5 Jan – 26 Oct): 2 or 3 a week early on, then 3 a week.
  -- ---------------------------------------------------------------------------
  insert into public.metric_entries (user_id, metric_id, entry_date, value)
  select v_user, v_trainings, v_monday_2025 + 7 * i,
         case when i < 40 and i % 5 = 0 then 1 else 2 end
  from generate_series(0, 51) as i;

  insert into public.metric_entries (user_id, metric_id, entry_date, value)
  select v_user, v_trainings, v_monday_2026 + 7 * i,
         case when i < 24 and i % 2 = 0 then 2 else 3 end
  from generate_series(0, 42) as i;

  -- ---------------------------------------------------------------------------
  -- Hours worked: weekly hours.
  --   2025: 24–28 h a week up to October (a bit more from late August), 26 h in Nov–Dec.
  --   2026: 30–34 h a week (28 h in the first week).
  -- ---------------------------------------------------------------------------
  insert into public.metric_entries (user_id, metric_id, entry_date, value)
  select v_user, v_hours, v_monday_2025 + 7 * i,
         case when i <= 42 then 24 + i % 5 + case when i >= 34 then 1 else 0 end
              else 26 end
  from generate_series(0, 51) as i;

  insert into public.metric_entries (user_id, metric_id, entry_date, value)
  select v_user, v_hours, v_monday_2026 + 7 * i,
         30 + i % 5 - case when i = 0 then 2 else 0 end
  from generate_series(0, 42) as i;

  raise notice 'Metrics demo data added for user %: % entries.', v_user,
    (select count(*) from public.metric_entries where user_id = v_user);
end;
$$;

-- =============================================================================
-- Goals demo data (Phase 4).
--
-- What you get: 5 goals on the built-in metrics and the "Wake up" routine item:
--   €18k in 2026 (counts open deals too) · 150 trainings · 1,650 hours ·
--   200 early mornings · one €3k month.
--
-- Skips itself if your account already has goals.
-- Needs the goals migration (20261029100000_goals.sql) pushed first, and the
-- metrics / routine item it points at (the Today and metrics parts above make them).
-- =============================================================================
do $$
declare
  -- Only needed if the project has more than one user: put your login email here.
  v_email text := null;

  v_user uuid;
  v_user_count int;
  v_money uuid;
  v_trainings uuid;
  v_hours uuid;
  v_wake uuid;
begin
  -- ---------------------------------------------------------------------------
  -- Whose account? (same rules as the other parts)
  -- ---------------------------------------------------------------------------
  if v_email is not null then
    select id into v_user from auth.users where lower(email) = lower(v_email);
    if v_user is null then
      raise exception 'No user with email %. Check the spelling, or sign in to the app once first.', v_email;
    end if;
  else
    select count(*) into v_user_count from auth.users;
    if v_user_count = 0 then
      raise notice 'Goals seed skipped: no users yet. Sign in to the app once, then run this file again.';
      return;
    elsif v_user_count > 1 then
      raise exception 'This project has % users. Set v_email at the top of every seed block to your login email.', v_user_count;
    end if;
    select id into v_user from auth.users;
  end if;

  if exists (select 1 from public.goals where user_id = v_user) then
    raise notice 'Goals seed skipped: this account already has goals. Nothing was changed.';
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- What the goals are measured on (by name, ignoring case and spaces).
  -- ---------------------------------------------------------------------------
  select id into v_money     from public.metrics where user_id = v_user and lower(trim(name)) = 'money earned';
  select id into v_trainings from public.metrics where user_id = v_user and lower(trim(name)) = 'trainings';
  select id into v_hours     from public.metrics where user_id = v_user and lower(trim(name)) = 'hours worked';
  select id into v_wake      from public.routine_items
   where user_id = v_user and lower(trim(title)) = 'wake up'
   order by created_at limit 1;

  if v_money is null or v_trainings is null or v_hours is null or v_wake is null then
    raise notice 'Goals seed skipped: missing the Money earned / Trainings / Hours worked metric or the "Wake up" routine item. Nothing was changed.';
    return;
  end if;

  insert into public.goals
    (user_id, title, short_label, type, source_kind, source_id, target, start_date, deadline, include_pipeline)
  values
    (v_user, 'Earn €18,000 in 2026',     '€18k in 2026',       'total', 'metric',  v_money,     18000, date '2026-01-01', date '2027-01-01', true),
    (v_user, '150 trainings in 2026',    '150 trainings',      'total', 'metric',  v_trainings,   150, date '2026-01-01', date '2026-12-31', false),
    (v_user, '1,650 hours in 2026',      '1,650 hours',        'total', 'metric',  v_hours,      1650, date '2026-01-01', date '2026-12-31', false),
    (v_user, 'Wake up on 200 days',      '200 early mornings', 'total', 'routine', v_wake,        200, date '2026-01-01', date '2026-12-31', false),
    (v_user, '€3,000 in a single month', '€3k month',          'level', 'metric',  v_money,      3000, date '2026-01-01', date '2027-06-30', false);

  raise notice 'Goals demo data added for user %: % goals.', v_user,
    (select count(*) from public.goals where user_id = v_user);
end;
$$;

-- =============================================================================
-- Improvements + notifications demo data (Phase 5; design/improve.png and
-- design/today-notifications.png).
--
-- What you get:
--   * 3 saved weekly reviews: weeks 40–42 (28 Sep, 5 Oct, 12 Oct 2026) with
--     task completion 69 / 72 / 76 % and the focus texts from the design.
--   * 5 lessons, 3 experiments (one running: "Follow up on day 3 instead of day 7"),
--     4 ideas.
--   * 5 bell notifications (2 unread), dated relative to today.
--
-- Skips itself if your account already has reviews.
-- Needs the migration 20261029110000_improve_settings.sql pushed first.
-- =============================================================================
do $$
declare
  -- Only needed if the project has more than one user: put your login email here.
  v_email text := null;

  v_user uuid;
  v_user_count int;
  v_today date := (now() at time zone 'Europe/Sarajevo')::date;
  -- Most recent Sunday before today.
  v_sunday date := v_today - extract(isodow from v_today)::int;
  v_emir uuid;
begin
  -- ---------------------------------------------------------------------------
  -- Whose account? (same rules as the other parts)
  -- ---------------------------------------------------------------------------
  if v_email is not null then
    select id into v_user from auth.users where lower(email) = lower(v_email);
    if v_user is null then
      raise exception 'No user with email %. Check the spelling, or sign in to the app once first.', v_email;
    end if;
  else
    select count(*) into v_user_count from auth.users;
    if v_user_count = 0 then
      raise notice 'Improvements seed skipped: no users yet. Sign in to the app once, then run this file again.';
      return;
    elsif v_user_count > 1 then
      raise exception 'This project has % users. Set v_email at the top of every seed block to your login email.', v_user_count;
    end if;
    select id into v_user from auth.users;
  end if;

  if exists (select 1 from public.reviews where user_id = v_user) then
    raise notice 'Improvements seed skipped: this account already has reviews. Nothing was changed.';
    return;
  end if;

  -- ---------------------------------------------------------------------------
  -- Weekly reviews (weeks 40–42).
  -- ---------------------------------------------------------------------------
  insert into public.reviews (user_id, week_start, wins, misses, lesson, focus, status, stats_snapshot, created_at)
  values
    (v_user, date '2026-09-28',
     'Woke up on time every weekday. Finished the portfolio case study.',
     'Scrolled my phone until lunch most days; outreach started late.',
     'The first hour decides the day.',
     'no phone before 11:00', 'saved',
     '{"task_completion":69,"outreach_sent":14,"replies":2,"meetings":0}',
     (date '2026-10-04' + time '18:30') at time zone 'Europe/Sarajevo'),
    (v_user, date '2026-10-05',
     'Phone stayed off until 11:00 on 4 of 5 days. First reply from a Google Maps lead.',
     'Only 16 outreaches; Friday got lost to admin.',
     'Batching messages in one block is faster than sending them between tasks.',
     '20 outreaches', 'saved',
     '{"task_completion":72,"outreach_sent":16,"replies":3,"meetings":1}',
     (date '2026-10-11' + time '18:15') at time zone 'Europe/Sarajevo'),
    (v_user, date '2026-10-12',
     'Hit 20 outreaches. Booked a meeting with Bloom Studio.',
     'Mornings started slowly because I was deciding what to do first.',
     'Deciding the top 3 the evening before saves the first 30 minutes.',
     'plan top 3 the night before', 'saved',
     '{"task_completion":76,"outreach_sent":20,"replies":4,"meetings":1}',
     (date '2026-10-18' + time '18:40') at time zone 'Europe/Sarajevo');

  -- ---------------------------------------------------------------------------
  -- Lessons.
  -- ---------------------------------------------------------------------------
  insert into public.lessons (user_id, area, text, created_at)
  values
    (v_user, 'Outreach', 'Naming one specific thing from their website beats a generic compliment.', now() - interval '3 days'),
    (v_user, 'Outreach', 'Batching messages in one block is faster than sending them between tasks.', now() - interval '18 days'),
    (v_user, 'Routine',  'Deciding the top 3 the evening before saves the first 30 minutes.', now() - interval '11 days'),
    (v_user, 'Work',     'The first hour decides the day.', now() - interval '25 days'),
    (v_user, 'Health',   'A short walk after lunch beats a third coffee.', now() - interval '32 days');

  -- ---------------------------------------------------------------------------
  -- Experiments.
  -- ---------------------------------------------------------------------------
  insert into public.experiments
    (user_id, title, hypothesis, metric, start_date, end_date, status, before_value, during_value, result, created_at)
  values
    (v_user, 'Follow up on day 3 instead of day 7',
     'An earlier follow-up catches people while they still remember the first message.',
     'reply_rate', date '2026-10-19', date '2026-11-01', 'running', 14.2, 21.0, '',
     (date '2026-10-19' + time '09:00') at time zone 'Europe/Sarajevo'),
    (v_user, 'Plan top 3 the night before',
     'Knowing the first task removes the slow start in the morning.',
     'task_completion', date '2026-10-12', date '2026-10-19', 'kept', 72, 76,
     'Completion went up and mornings felt calmer. Keeping it.',
     (date '2026-10-12' + time '09:00') at time zone 'Europe/Sarajevo'),
    (v_user, 'Email openers to logistics companies',
     'Logistics firms read email more than LinkedIn.',
     'reply_rate', date '2026-09-28', date '2026-10-12', 'dropped', 12.5, 0,
     'No replies (0 of 9). Dropped.',
     (date '2026-09-28' + time '09:00') at time zone 'Europe/Sarajevo');

  -- ---------------------------------------------------------------------------
  -- Ideas.
  -- ---------------------------------------------------------------------------
  insert into public.ideas (user_id, text, status, created_at)
  values
    (v_user, 'Send a short Loom video instead of a text pitch', 'new', now() - interval '2 days'),
    (v_user, 'Ask happy clients for one referral each', 'new', now() - interval '6 days'),
    (v_user, 'Do outreach right after the morning workout', 'testing', now() - interval '12 days'),
    (v_user, 'Keep a swipe file of replies that worked', 'done', now() - interval '20 days');

  -- ---------------------------------------------------------------------------
  -- Notifications (newest two unread). Links to Emir's contact page if that lead exists.
  -- ---------------------------------------------------------------------------
  select id into v_emir from public.contacts
   where user_id = v_user and name ilike 'Emir Kova%'
   order by created_at limit 1;

  insert into public.notifications (user_id, kind, title, body, link, read_at, dedupe_key, created_at)
  values
    (v_user, 'followup_due', 'Follow up with Emir Kovač', 'Due today · LinkedIn',
     case when v_emir is null then '/outreach' else '/outreach/' || v_emir end, null,
     'seed:followup_due:' || v_today, (v_today + time '09:00') at time zone 'Europe/Sarajevo'),
    (v_user, 'followup_late', 'Marko Petrović is 2 days late', 'Follow-up overdue · Email',
     '/outreach', null,
     'seed:followup_late:' || v_today, (v_today + time '09:00') at time zone 'Europe/Sarajevo'),
    (v_user, 'routine', 'Wake up', 'Routine reminder · done',
     '/', (v_today + time '06:05') at time zone 'Europe/Sarajevo',
     'seed:routine:' || v_today, (v_today + time '06:00') at time zone 'Europe/Sarajevo'),
    (v_user, 'close_day', 'Close the day', '2 tasks left — moved to today',
     '/', (v_today + time '07:30') at time zone 'Europe/Sarajevo',
     'seed:close_day:' || (v_today - 1), ((v_today - 1) + time '21:00') at time zone 'Europe/Sarajevo'),
    (v_user, 'weekly_review', 'Weekly review is ready', 'Week 43 numbers are filled in',
     '/improve', ((v_sunday + 1) + time '08:00') at time zone 'Europe/Sarajevo',
     'seed:weekly_review:' || v_sunday, (v_sunday + time '18:00') at time zone 'Europe/Sarajevo')
  on conflict (user_id, dedupe_key) do nothing;

  raise notice 'Improvements demo data added for user %: 3 reviews, 5 lessons, 3 experiments, 4 ideas, 5 notifications.', v_user;
end;
$$;
