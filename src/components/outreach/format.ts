import { daysBetween, DEFAULT_TIME_ZONE, formatDate, toDateKey, type DateKey } from '@/lib/dates'
import { initials, NO_WEBSITE_TAG } from '@/lib/outreach'
import { CHANNEL_LABELS, type Channel, type Contact } from '@/schemas/outreach'

/** The contact fields the list page (table and board) needs. */
export type LeadSummary = Pick<
  Contact,
  | 'id'
  | 'name'
  | 'source'
  | 'stage'
  | 'role'
  | 'company'
  | 'category'
  | 'city'
  | 'met_where'
  | 'upwork_job_title'
  | 'upwork_budget'
  | 'connects_spent'
  | 'tags'
  | 'channel'
  | 'last_touch_at'
  | 'next_follow_up'
  | 'deal_value'
  | 'won_amount'
>

const euroFormat = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

/** "€1,200", or "—" when empty. */
export function formatEuro(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : euroFormat.format(value)
}

/** What the lead is worth: the won amount once won, otherwise the deal value. */
export function leadValue(lead: Pick<LeadSummary, 'stage' | 'deal_value' | 'won_amount'>): number | null {
  return lead.stage === 'won' ? (lead.won_amount ?? lead.deal_value) : lead.deal_value
}

/** Short grey line under a lead's name, built from what we know about it. */
export function leadShortLine(lead: LeadSummary): string {
  const parts: (string | null | undefined)[] = (() => {
    switch (lead.source) {
      case 'linkedin':
        return [lead.role, lead.company]
      case 'maps':
        return [lead.category, lead.city, lead.tags.includes(NO_WEBSITE_TAG) ? 'no website' : null]
      case 'inperson':
        return [lead.company, lead.met_where ? `met at ${lead.met_where}` : null]
      case 'upwork':
        return [
          'Upwork job',
          lead.upwork_budget !== null ? `${formatEuro(lead.upwork_budget)} budget` : null,
          lead.connects_spent !== null ? `${lead.connects_spent} Connects` : null,
        ]
      case 'other':
        return [lead.role, lead.company, lead.city]
    }
  })()
  return parts.filter(Boolean).join(' · ')
}

const CONTACT_VIA: Partial<Record<Channel, string>> = {
  linkedin: 'LinkedIn message',
  upwork: 'Upwork chat',
}

/** "LinkedIn message", "Email", "Phone"… or "—". */
export function contactViaLabel(channel: Channel | null): string {
  if (!channel) return '—'
  return CONTACT_VIA[channel] ?? CHANNEL_LABELS[channel]
}

/** "Today", "Yesterday", "3 days ago", "2 weeks ago", "12 Aug 2026", or "Not yet". */
export function lastTouchLabel(lastTouchAt: string | null, today: DateKey, timeZone: string = DEFAULT_TIME_ZONE): string {
  if (!lastTouchAt) return 'Not yet'
  const day = toDateKey(new Date(lastTouchAt), timeZone)
  const ago = daysBetween(day, today)
  if (ago <= 0) return 'Today'
  if (ago === 1) return 'Yesterday'
  if (ago < 14) return `${ago} days ago`
  if (ago < 60) return `${Math.floor(ago / 7)} weeks ago`
  return formatDate(day)
}

/** Avatar letters: "UP" for an Upwork job with no client name, otherwise the name's initials. */
export function leadInitials(lead: Pick<LeadSummary, 'name' | 'source' | 'upwork_job_title'>): string {
  if (lead.source === 'upwork' && lead.name === lead.upwork_job_title) return 'UP'
  return initials(lead.name)
}

const AVATAR_TONES = [
  'bg-brand-tint text-brand',
  'bg-[#FCE7F3] text-[#BE185D]',
  'bg-info-tint text-info',
  'bg-warn-tint text-warn',
  'bg-good-tint text-good',
  'bg-muted text-ink-2',
] as const

/** A stable avatar colour for a lead id. */
export function avatarTone(id: string): string {
  let sum = 0
  for (const char of id) sum = (sum + char.charCodeAt(0)) % 997
  return AVATAR_TONES[sum % AVATAR_TONES.length] as string
}
