import type { AddLeadFormValues, Contact, ProposalStatus, Stage } from '@/schemas/outreach'
import { addDays, daysBetween, type DateKey } from './dates'
import { getInitials } from './initials'

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

/** Days until the next follow-up after a lead moves into a stage (docs → Rules). */
export const FOLLOW_UP_DAYS: Partial<Record<Stage, number>> = {
  contacted: 3,
  replied: 2,
  meeting: 1,
  proposal: 3,
}

/** Logging a sent touch pushes the follow-up this many days out. */
export const SENT_TOUCH_FOLLOW_UP_DAYS = 3

/**
 * Suggested next follow-up when a lead enters `stage`, counted from `from`.
 * new / won / lost have no automatic follow-up, so they return null.
 */
export function nextFollowUp(stage: Stage, from: DateKey): DateKey | null {
  const days = FOLLOW_UP_DAYS[stage]
  return days === undefined ? null : addDays(from, days)
}

export type FollowUpState =
  | { kind: 'none' }
  | { kind: 'upcoming'; days: number }
  | { kind: 'today' }
  | { kind: 'late'; days: number }

/**
 * How a follow-up date looks from `today`:
 * none (no date), upcoming (in n days), today (amber), late by n days (red).
 */
export function followUpState(date: DateKey | null | undefined, today: DateKey): FollowUpState {
  if (!date) return { kind: 'none' }
  const diff = daysBetween(today, date)
  if (diff === 0) return { kind: 'today' }
  return diff > 0 ? { kind: 'upcoming', days: diff } : { kind: 'late', days: -diff }
}

// ---------------------------------------------------------------------------
// Upwork proposal status → pipeline stage
// ---------------------------------------------------------------------------

const PROPOSAL_STAGE: Record<ProposalStatus, Stage> = {
  sent: 'contacted',
  viewed: 'contacted',
  interview: 'meeting',
  hired: 'won',
}

export function proposalToStage(status: ProposalStatus): Stage {
  return PROPOSAL_STAGE[status]
}

// ---------------------------------------------------------------------------
// Small display helpers
// ---------------------------------------------------------------------------

/** Avatar initials for a lead, e.g. "Lejla Hodžić" → "LH". */
export function initials(name: string | null | undefined): string {
  return getInitials(name)
}

/** First word of a name, e.g. "Lejla Hodžić" → "Lejla". Empty string if no name. */
export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

const FIRST_NAME_RE = /\{\{\s*first_name\s*\}\}/gi

/**
 * Fills `{{first_name}}` in a template. Without a name it falls back to "there"
 * ("Hi {{first_name}}," → "Hi there,"). Other placeholders are left as they are.
 */
export function fillTemplate(body: string, contact: Pick<Contact, 'name'> | { name?: string | null }): string {
  const name = firstName(contact.name) || 'there'
  return body.replace(FIRST_NAME_RE, () => name)
}

// ---------------------------------------------------------------------------
// URLs and duplicates
// ---------------------------------------------------------------------------

/**
 * Turns what the user typed into a full http(s) link, or null if it isn't one.
 * "linkedin.com/in/lejla" → "https://linkedin.com/in/lejla".
 */
export function toHttpUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value || /\s/.test(value)) return null
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  // Needs a dot in the host ("localhost" or "abc" is not a real site).
  if (!/^[^.]+(\.[^.]+)+$/.test(url.hostname)) return null
  return url.toString()
}

/** True when a link's host is `domain` or a subdomain of it. */
export function hostIs(link: string, domains: readonly string[]): boolean {
  const url = toHttpUrl(link)
  if (!url) return false
  const host = new URL(url).hostname.toLowerCase()
  return domains.some((d) => host === d || host.endsWith(`.${d}`))
}

const TRACKING_PARAMS = /^(utm_.*|fbclid|gclid|trk|trkinfo|originalsubdomain|lipi|ref|refid|src|si)$/i

/**
 * A comparable form of a link, so the same page typed two ways matches:
 * no scheme, no "www.", lowercase host, no tracking params, hash or trailing "/".
 * LinkedIn country hosts (ba.linkedin.com) and paths are folded to lowercase;
 * Upwork job links reduce to their job id (~0123…).
 * Returns null for anything that isn't a link.
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  const full = toHttpUrl(raw ?? '')
  if (!full) return null
  const url = new URL(full)
  let host = url.hostname.toLowerCase().replace(/^www\./, '')
  let path = url.pathname.replace(/\/+$/, '')

  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    host = 'linkedin.com'
    path = decodeURIComponent(path).toLowerCase()
    return `${host}${path}`
  }

  if (host === 'upwork.com' || host.endsWith('.upwork.com')) {
    const jobId = /~[0-9a-z]+/i.exec(path)?.[0]
    if (jobId) return `upwork.com/jobs/${jobId.toLowerCase()}`
  }

  const params = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a], [b]) => a.localeCompare(b))
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : ''
  return `${host}${path}${query}`
}

function normalizeEmail(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim().toLowerCase()
  return value.includes('@') ? value : null
}

const URL_FIELDS = ['website', 'linkedin_url', 'maps_url', 'upwork_job_url'] as const

/** The fields duplicate checks look at. All optional, so a form value or a row both fit. */
export type LeadKeys = { id?: string } & Partial<
  Record<'email' | (typeof URL_FIELDS)[number], string | null | undefined>
>

export type Duplicate<C> = { contact: C; field: 'email' | 'url' }

/**
 * First existing contact with the same email or the same (normalised) link.
 * Any link field is compared with any other, so a website saved as
 * `maps_url` still matches. A contact with the lead's own `id` is skipped (edits).
 */
export function findDuplicate<C extends LeadKeys>(lead: LeadKeys, contacts: readonly C[]): Duplicate<C> | null {
  const email = normalizeEmail(lead.email)
  const urls = new Set(URL_FIELDS.map((f) => normalizeUrl(lead[f])).filter((u): u is string => u !== null))
  if (!email && urls.size === 0) return null

  for (const contact of contacts) {
    if (lead.id && contact.id === lead.id) continue
    if (email && normalizeEmail(contact.email) === email) return { contact, field: 'email' }
    for (const f of URL_FIELDS) {
      const url = normalizeUrl(contact[f])
      if (url && urls.has(url)) return { contact, field: 'url' }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Add-lead form → new contact row
// ---------------------------------------------------------------------------

export const FOLLOW_UP_CHOICE_DAYS = { tomorrow: 1, '3_days': 3, week: 7 } as const

export const NO_WEBSITE_TAG = 'no-website'

/** Columns a new contact gets from the Add lead form (the rest use DB defaults). */
export type NewContact = Pick<Contact, 'source' | 'name' | 'stage' | 'next_follow_up' | 'tags'> &
  Partial<
    Pick<
      Contact,
      | 'company'
      | 'role'
      | 'category'
      | 'city'
      | 'phone'
      | 'email'
      | 'website'
      | 'linkedin_url'
      | 'maps_url'
      | 'met_where'
      | 'upwork_job_title'
      | 'upwork_job_url'
      | 'upwork_budget'
      | 'connects_spent'
      | 'proposal_status'
      | 'channel'
    >
  >

/**
 * Maps a parsed Add lead form to the row to insert.
 * Google Maps leads without a website get the "no-website" tag; Upwork leads
 * start at the stage their proposal status implies. Won leads get no follow-up.
 */
export function leadToContact(lead: AddLeadFormValues, today: DateKey): NewContact {
  const followUp = addDays(today, FOLLOW_UP_CHOICE_DAYS[lead.follow_up])
  const base = { source: lead.source, stage: 'new' as Stage, next_follow_up: followUp as DateKey | null, tags: [] as string[] }

  switch (lead.source) {
    case 'linkedin':
      return {
        ...base,
        name: lead.name,
        company: lead.company ?? null,
        role: lead.role ?? null,
        linkedin_url: lead.linkedin_url,
        channel: 'linkedin',
      }
    case 'maps':
      return {
        ...base,
        name: lead.name,
        category: lead.category ?? null,
        city: lead.city ?? null,
        phone: lead.phone ?? null,
        website: lead.website ?? null,
        maps_url: lead.maps_url ?? null,
        channel: lead.phone ? 'phone' : null,
        tags: lead.website ? [] : [NO_WEBSITE_TAG],
      }
    case 'inperson':
      return {
        ...base,
        name: lead.name,
        company: lead.company ?? null,
        met_where: lead.met_where ?? null,
        phone: lead.phone ?? null,
        email: lead.email ?? null,
        channel: lead.email ? 'email' : 'phone',
      }
    case 'upwork': {
      const stage = proposalToStage(lead.proposal_status)
      return {
        ...base,
        name: lead.client_name ?? lead.upwork_job_title,
        upwork_job_title: lead.upwork_job_title,
        upwork_job_url: lead.upwork_job_url,
        upwork_budget: lead.upwork_budget ?? null,
        connects_spent: lead.connects_spent ?? null,
        proposal_status: lead.proposal_status,
        channel: 'upwork',
        stage,
        next_follow_up: stage === 'won' ? null : followUp,
      }
    }
    case 'other':
      return {
        ...base,
        name: lead.name,
        company: lead.company ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        website: lead.website ?? null,
      }
  }
}
