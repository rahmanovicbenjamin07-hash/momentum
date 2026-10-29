# Momentum — core rules (read every session)

Personal React web app (opened in Chrome on computer and phone) for daily routine, tasks, client outreach, self-logged metrics and goals. Personal use first, maybe public later, so all data belongs to a user from day one. I'm still learning: explain briefly in plain words and tell me exactly when I must do something myself.

**Phase details live in `docs/phase-*.md`. Read only the file for the phase I ask for.** Screenshots of the design are in `/design`; open only the ones that phase needs.

## How to work
- One phase at a time. Show a short plan first and wait for my OK.
- Small steps; run typecheck, lint and tests after each; fix failures.
- End of phase: list what was built and what I should click to test. Commit after I confirm.
- Ask before: new libraries, deleting data, destructive DB changes, deploying, anything that costs money.
- UI in English. Time zone Europe/Sarajevo, money €, dates `28 Oct 2026`, week starts Monday.

## Stack
Vite + React 19 + TypeScript (strict) · React Router v7 · TanStack Query v5 (optimistic updates) · Tailwind v4 + shadcn/ui · React Hook Form + Zod · Recharts or plain SVG · dnd-kit · date-fns(+tz) · Supabase (Postgres, Auth magic link + Google, Storage, Cron, Edge Functions) · Cloudflare Pages · Vitest + Playwright.

## Security (never break)
- RLS on every table in the same migration; policies per select/insert/update/delete: `to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)`. Index `user_id`.
- Every table: `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `created_at timestamptz default now()`.
- Frontend gets only `VITE_SUPABASE_URL` + anon/publishable key. service_role key only in Edge Functions. `.env.local` git-ignored.
- Views/functions use `security_invoker = true`. Zod on every form; `check` length limits on text.
- Migrations only in `supabase/migrations/`; regenerate `src/lib/database.types.ts` after each. Dev data in `supabase/seed.sql`.
- All maths in pure TS modules in `src/lib/` with Vitest tests.

## Design tokens
Font Inter 400–700, 14px base, tabular numbers. Page `#F4F5F7`. Cards white, border `#E5E7EB`, radius 10px, no shadows. Buttons/inputs/chips/bars radius 8px (avatars/dots round). Text `#111827`, secondary `#4B5563`, faint `#6B7280`. Accent `#4338CA` (tint `#EEF0FF`); top bar `#111827` with `#4F46E5` button. Status: good `#15803D/#DCFCE7`, warn `#B45309/#FEF3C7`, bad `#B91C1C/#FEE2E2`, info `#075985/#E0F2FE`.
Layout: dark top bar (logo, search Ctrl K, New, bell, avatar); white left sidebar (Today, Outreach, Stats, Goals, Improvements | Settings; small streak card at bottom); content max 1200px. Mobile: sidebar stacks, toolbars wrap. WCAG AA contrast; real buttons/links/labelled inputs; keyboard usable.

## Three agents at once
Prompts start with a tag: [LOGIC], [DATA], [UI] or [WIRE]. Stay in your lane:
- [LOGIC]: only src/lib/** (not database.types.ts), src/schemas/**, their tests.
- [DATA]: only supabase/**, src/lib/database.types.ts, src/api/**.
- [UI]: only src/components/**, src/mocks/**, src/pages/DevPreview.tsx. Components get data as props and send actions as callbacks. Show each new one on /dev with mock data.
- [WIRE]: src/pages/**, src/app/**, e2e/**, small fixes anywhere.
Rules: no plan, just do it, then reply in max 5 lines. Don't install packages or edit config files. Don't start the dev server; only [WIRE] runs Playwright. Run typecheck, lint and your own tests; ignore errors in other lanes' files. Don't commit. If you need a file from another lane that doesn't exist yet, stop and tell me.

## Token rules
- Read only the files the prompt lists. Don't open docs/ or design images unless listed. Don't search the whole repo.
- If something you need isn't in the listed files, read at most 2 more files and say which.
- Run only the tests the prompt names; the full suite runs only in the commit prompt.
- Reply in max 5 lines.