# Phase 0 — Setup

Goal: an empty but working app online, with login.

1. Create the Vite + React + TypeScript project in this folder. Add Tailwind v4 and run `shadcn init`; add button, input, dialog, checkbox, select, sonner.
2. Set up React Router with empty pages: `/` Today, `/outreach`, `/outreach/:id`, `/stats` (tabs: overview, metrics, routine, reports), `/goals`, `/improve`, `/settings`, `/login`.
3. Build the app shell from the design (`design/today.png` only): dark top bar + white sidebar + content area, responsive.
4. Walk me step by step through creating a Supabase project (EU region) and where to paste the URL and anon key into `.env.local`.
5. Supabase client (`src/lib/supabase.ts`), TanStack Query provider, central query keys file.
6. Email magic-link login (+ "Continue with Google" if easy); protected routes; sign out in the avatar menu.
7. First migration: `profiles` (id = auth user id, display_name, timezone default 'Europe/Sarajevo', week_start default 1, day_end_hour default 0, theme default 'light', language default 'en') + RLS + trigger that creates a profile on sign-up.
8. Set up Vitest and one Playwright smoke test (login page loads).
9. Walk me through deploying to Cloudflare Pages from GitHub (`main` branch), with env variables.

Done when: I can log in on the live URL and click through the empty pages.
