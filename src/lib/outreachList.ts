import { SOURCES, STAGES, type Contact, type Source, type Stage, type Touch } from '@/schemas/outreach'
import { addDays, DEFAULT_TIME_ZONE, toDateKey, weekStart, type DateKey } from './dates'
import { followUpState } from './outreach'

/** Today's "Outreaches this week" target. */
export const WEEKLY_OUTREACH_GOAL = 20

// ---------------------------------------------------------------------------
// Counts for the chips and the stage row
// ---------------------------------------------------------------------------

export type SourceCounts = Record<Source | 'all', number>

/** Leads per source, plus "all". Every source is present, even with 0. */
export function countsBySource(contacts: readonly Pick<Contact, 'source'>[]): SourceCounts {
  const counts = Object.fromEntries([['all', contacts.length], ...SOURCES.map((s) => [s, 0])]) as SourceCounts
  for (const c of contacts) counts[c.source] += 1
  return counts
}

/** Leads per stage. Every stage is present, even with 0. */
export function countsByStage(contacts: readonly Pick<Contact, 'stage'>[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>
  for (const c of contacts) counts[c.stage] += 1
  return counts
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export type ContactFilters = {
  /** "all" or undefined = every source. */
  source?: Source | 'all'
  /** "all", null or undefined = every stage. */
  stage?: Stage | 'all' | null
  /** Words to look for in name, company, role, email, phone, city, tags… */
  search?: string
  /** Only leads whose follow-up is today or late (won/lost never count). */
  dueOnly?: boolean
}

type FilterableContact = Pick<Contact, 'source' | 'stage' | 'name' | 'next_follow_up'> &
  Partial<
    Pick<
      Contact,
      | 'company'
      | 'role'
      | 'category'
      | 'city'
      | 'email'
      | 'phone'
      | 'website'
      | 'met_where'
      | 'upwork_job_title'
      | 'tags'
    >
  >

/** Lowercase, no accents: "Hodžić" → "hodzic", "Đulić" → "dulic". */
export function foldText(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

const SEARCH_FIELDS = [
  'name',
  'company',
  'role',
  'category',
  'city',
  'email',
  'phone',
  'website',
  'met_where',
  'upwork_job_title',
] as const

function searchText(contact: FilterableContact): string {
  const parts: string[] = []
  for (const f of SEARCH_FIELDS) {
    const v = contact[f]
    if (v) parts.push(v)
  }
  if (contact.tags) parts.push(...contact.tags)
  return foldText(parts.join(' '))
}

/** True when the lead's follow-up is today or overdue and it's still open. */
export function isFollowUpDue(contact: Pick<Contact, 'stage' | 'next_follow_up'>, today: DateKey): boolean {
  if (contact.stage === 'won' || contact.stage === 'lost') return false
  const kind = followUpState(contact.next_follow_up, today).kind
  return kind === 'today' || kind === 'late'
}

/**
 * Applies the list page filters. Search ignores case and accents, and every
 * word must match somewhere ("smile sarajevo" finds Smile in Sarajevo).
 * Keeps the original order.
 */
export function filterContacts<C extends FilterableContact>(
  contacts: readonly C[],
  { source, stage, search, dueOnly }: ContactFilters,
  today: DateKey,
): C[] {
  const words = foldText(search ?? '')
    .split(/\s+/)
    .filter(Boolean)

  return contacts.filter((c) => {
    if (source && source !== 'all' && c.source !== source) return false
    if (stage && stage !== 'all' && c.stage !== stage) return false
    if (dueOnly && !isFollowUpDue(c, today)) return false
    if (words.length) {
      const text = searchText(c)
      if (!words.every((w) => text.includes(w))) return false
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// This week's outreach
// ---------------------------------------------------------------------------

/**
 * Sent touches in the week (Mon–Sun) that contains `today`, by the user's
 * local calendar day. Received messages and notes don't count.
 */
export function weekOutreachCount(
  touches: readonly Pick<Touch, 'direction' | 'occurred_at'>[],
  today: DateKey,
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  const monday = weekStart(today)
  const sunday = addDays(monday, 6)
  let count = 0
  for (const t of touches) {
    if (t.direction !== 'sent') continue
    const day = toDateKey(new Date(t.occurred_at), timeZone)
    if (day >= monday && day <= sunday) count += 1
  }
  return count
}
