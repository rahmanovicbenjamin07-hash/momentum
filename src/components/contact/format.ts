import { addDays, DEFAULT_TIME_ZONE, toDateKey, type DateKey } from '@/lib/dates'
import { followUpState, NO_WEBSITE_TAG } from '@/lib/outreach'
import type { Contact } from '@/schemas/outreach'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function parts(key: DateKey) {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return { y, m, d }
}

/** "25 Oct" in the same year as today, otherwise "25 Oct 2025". */
export function shortDay(key: DateKey, today: DateKey): string {
  const { y, m, d } = parts(key)
  const base = `${d} ${MONTHS[m - 1]}`
  return y === parts(today).y ? base : `${base} ${y}`
}

/** "16:42" in the user's time zone. */
export function clockTime(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(
    new Date(iso),
  )
}

/** "25 Oct, 16:42" for a touch. */
export function touchWhen(iso: string, today: DateKey, timeZone: string = DEFAULT_TIME_ZONE): string {
  return `${shortDay(toDateKey(new Date(iso), timeZone), today)}, ${clockTime(iso, timeZone)}`
}

/** "Today, 28 Oct" / "2 days late · 26 Oct" / "Tomorrow, 29 Oct" / "Fri, 30 Oct" / "—". */
export function followUpLabel(
  date: DateKey | null,
  today: DateKey,
): { text: string; tone: 'warn' | 'bad' | 'normal' | 'none' } {
  const state = followUpState(date, today)
  if (state.kind === 'none' || !date) return { text: '—', tone: 'none' }
  const day = shortDay(date, today)
  if (state.kind === 'today') return { text: `Today, ${day}`, tone: 'warn' }
  if (state.kind === 'late') return { text: `${state.days} ${state.days === 1 ? 'day' : 'days'} late · ${day}`, tone: 'bad' }
  if (date === addDays(today, 1)) return { text: `Tomorrow, ${day}`, tone: 'normal' }
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]
  return { text: `${weekday}, ${day}`, tone: 'normal' }
}

export type SummaryLineFields = Pick<
  Contact,
  'name' | 'source' | 'role' | 'company' | 'category' | 'city' | 'upwork_job_title'
>

/** "Founder · Bloom Studio · Sarajevo" (business type for Maps leads, job title for Upwork). */
export function summaryLine(contact: SummaryLineFields): string {
  const bits =
    contact.source === 'upwork'
      ? ['Upwork job', contact.name !== contact.upwork_job_title ? contact.upwork_job_title : null]
      : [contact.role ?? contact.category, contact.company, contact.city]
  return bits.filter(Boolean).join(' · ')
}

/** "https://www.bloom-studio.example/" → "bloom-studio.example". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
}

/** "agency" → "Agency", "no-website" → "No website". */
export function tagLabel(tag: string): string {
  if (tag === NO_WEBSITE_TAG) return 'No website'
  const spaced = tag.replace(/[-_]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** "yyyy-MM" of a day. */
export function monthOf(key: DateKey): string {
  return key.slice(0, 7)
}

/** "2026-10" (or "2026-10-01") → "October" in today's year, otherwise "December 2025". */
export function monthLabel(month: string, today: DateKey): string {
  const [year, m] = month.split('-').map(Number) as [number, number]
  const name = LONG_MONTHS[m - 1]!
  return year === parts(today).y ? name : `${name} ${year}`
}

/** Months to pick "Paid in" from: 11 months back to 2 ahead, newest first. */
export function paidMonthOptions(today: DateKey): { value: string; label: string }[] {
  const { y, m } = parts(today)
  const options: { value: string; label: string }[] = []
  for (let offset = 2; offset >= -11; offset--) {
    const index = y * 12 + (m - 1) + offset
    const value = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
    options.push({ value, label: monthLabel(value, today) })
  }
  return options
}

// ---------------------------------------------------------------------------
// Notes: plain text with two small conventions
//   "Pain: booking page is slow"  → "Pain:" shown bold
//   "[ ] Prepare a mini audit"    → checklist item ("[x]" when done)
// ---------------------------------------------------------------------------

export type NoteLine =
  | { kind: 'check'; done: boolean; text: string }
  | { kind: 'text'; label: string | null; text: string }

const CHECK_RE = /^\[( |x|X)\]\s+(.*)$/s
const LABEL_RE = /^([^:\n]{1,24}):\s+(.*)$/s

/** How one note entry should be shown. */
export function parseNote(body: string): NoteLine {
  const trimmed = body.trim()
  const check = CHECK_RE.exec(trimmed)
  if (check) return { kind: 'check', done: check[1] !== ' ', text: check[2]!.trim() }
  const label = LABEL_RE.exec(trimmed)
  if (label && !/^https?$/i.test(label[1]!)) return { kind: 'text', label: label[1]!.trim(), text: label[2]!.trim() }
  return { kind: 'text', label: null, text: trimmed }
}

/** The same checklist note, ticked or not. Non-checklist notes come back unchanged. */
export function setNoteChecked(body: string, done: boolean): string {
  const line = parseNote(body)
  if (line.kind !== 'check') return body
  return `[${done ? 'x' : ' '}] ${line.text}`
}

/** Notes textarea → one entry per paragraph (blank line between entries; checklist lines may stack). */
export function splitNotes(text: string): string[] {
  const entries: string[] = []
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    let current: string[] = []
    for (const line of lines) {
      if (CHECK_RE.test(line)) {
        if (current.length) entries.push(current.join('\n'))
        entries.push(line)
        current = []
      } else {
        current.push(line)
      }
    }
    if (current.length) entries.push(current.join('\n'))
  }
  return entries
}

/** Entries → the text shown in the notes textarea. */
export function joinNotes(bodies: readonly string[]): string {
  return bodies.join('\n\n')
}
