# Phase 2 — Outreach (`/outreach`, `/outreach/:id`)

Design: `design/outreach.png`, `design/outreach-board.png`, `design/outreach-add-lead.png`, `design/contact.png`, `design/contact-won.png`.

## Tables (+ RLS)
- `contacts`: source (linkedin|maps|inperson|upwork|other), name, company, role, category, city, phone, email, website, linkedin_url, maps_url, met_where, upwork_job_title, upwork_job_url, upwork_budget, connects_spent, proposal_status, stage (new|contacted|replied|meeting|proposal|won|lost), channel, priority, deal_value, won_amount, won_month, next_follow_up, last_touch_at, lost_reason, notes jsonb, tags text[].
- `touches`: contact_id, occurred_at, channel, direction (sent|received|note), template_id, body, got_reply.
- `stage_history`: contact_id, from_stage, to_stage, changed_at — filled by trigger, which also updates `contacts.last_touch_at` on new touches.
- `templates`: name, channel, body (supports `{{first_name}}`).

## List page
- Source chips with counts: All, LinkedIn, Google Maps, In person, Upwork.
- Stage counts row (clickable filter). Search. "Follow-up due" checkbox. Table / Board toggle (board: drag between stages with dnd-kit).
- Table columns: Lead (initials avatar, name, short description), Found on (coloured chip), Stage, Contact via, Last touch, Next follow-up (amber today, red late), Value.
- **Add lead:** choose source first, then fields:
  - LinkedIn: name, company, role, profile link.
  - Google Maps: business name, type, address/city, phone, website (empty ⇒ tag "no website"), Maps link.
  - In person: name, company, where we met, phone/email.
  - Upwork: job title, client name, budget, Connects spent, job link, proposal status (sent/viewed ⇒ contacted, interview ⇒ meeting, hired ⇒ won).
  - First follow-up: tomorrow / 3 days / a week.
- Duplicate warning on same email or URL. CSV import/export.

## Contact page
Summary (avatar, name, role/company, stage pill, tags), clickable stage stepper, details list, notes, linked tasks, **Log a touch** (channel, Sent/Received, template, message), timeline (newest first, "Reply received" badge).

## Rules
- Smart follow-ups when stage changes: contacted +3 days, replied +2, meeting +1, proposal +3 (user can edit). Logging a sent touch sets next follow-up +3 days.
- Overdue follow-ups appear on Today and (Phase 5) in notifications.
- **Won:** ask for amount and month paid; "Add to Money earned" creates a `metric_entries` row in Phase 3 (until then store `won_amount`, `won_month`).
- Today's "Outreaches this week" = sent touches this week vs 20.

Done when: I can add leads from each source, move them through stages, log touches, and see follow-ups due.
