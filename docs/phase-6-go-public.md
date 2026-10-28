# Phase 6 — Go public (only when I say so)

1. Supabase production checklist: email confirmation on, own SMTP sender (e.g. Resend) on my domain, CAPTCHA (Cloudflare Turnstile) on sign-up / sign-in / reset, OTP expiry ≤ 1 hour, SSL enforcement, Security Advisor and Performance Advisor clean, MFA on my Supabase account.
2. Security test: create a second account and prove (in the browser console and with a Playwright test) it cannot read or change any of my rows.
3. Check no secret keys are in the built JS bundle.
4. Privacy policy + terms pages (BiH law is GDPR-aligned; database in EU; export + delete account already exist). Remind me to have a lawyer check them.
5. Simple landing page (separate static page): headline, 3 screenshots, features, sign-up button.
6. Error tracking (Sentry free tier) and cookieless analytics — ask me first.
7. Remind me to upgrade Supabase to Pro (no pausing, backups) before real users arrive. Payments later via Paddle (Stripe doesn't support BiH businesses) — separate plan.
