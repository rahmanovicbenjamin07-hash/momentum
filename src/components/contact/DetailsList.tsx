import { useId, type ReactNode } from 'react'
import { cn } from 'cn'
import { formatEuro } from '@/components/outreach/format'
import { DEFAULT_TIME_ZONE, formatDate, toDateKey, type DateKey } from '@/lib/dates'
import { NO_WEBSITE_TAG } from '@/lib/outreach'
import { CHANNEL_LABELS, SOURCE_LABELS, type Contact, type Touch } from '@/schemas/outreach'
import { displayUrl, followUpLabel, monthLabel, shortDay } from './format'

export type ContactDetails = Pick<
  Contact,
  | 'source'
  | 'stage'
  | 'email'
  | 'phone'
  | 'website'
  | 'linkedin_url'
  | 'maps_url'
  | 'met_where'
  | 'upwork_job_url'
  | 'upwork_budget'
  | 'connects_spent'
  | 'proposal_status'
  | 'channel'
  | 'deal_value'
  | 'won_amount'
  | 'won_month'
  | 'lost_reason'
  | 'last_touch_at'
  | 'next_follow_up'
  | 'created_at'
  | 'tags'
>

type DetailsListProps = {
  contact: ContactDetails
  /** Newest touch, to show "25 Oct · received". Falls back to `contact.last_touch_at`. */
  lastTouch?: Pick<Touch, 'occurred_at' | 'direction'> | null
  today: DateKey
  timeZone?: string
}

const PROPOSAL_LABELS = { sent: 'Sent', viewed: 'Viewed', interview: 'Interview', hired: 'Hired' } as const
const DIRECTION_LABELS = { sent: 'sent', received: 'received', note: 'note' } as const

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium break-all text-brand hover:underline">
      {children}
    </a>
  )
}

/** Label / value rows about a lead. Empty fields are left out. */
export function DetailsList({ contact, lastTouch, today, timeZone = DEFAULT_TIME_ZONE }: DetailsListProps) {
  const id = useId()
  const rows: { label: string; value: ReactNode }[] = []
  const add = (label: string, value: ReactNode) => rows.push({ label, value })

  if (contact.email)
    add(
      'Email',
      <a href={`mailto:${contact.email}`} className="font-medium break-all text-brand hover:underline">
        {contact.email}
      </a>,
    )
  if (contact.phone)
    add(
      'Phone',
      <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">
        {contact.phone}
      </a>,
    )
  if (contact.website) add('Website', <ExternalLink href={contact.website}>{displayUrl(contact.website)}</ExternalLink>)
  else if (contact.tags.includes(NO_WEBSITE_TAG)) add('Website', <span className="text-warn">None yet</span>)
  if (contact.linkedin_url) add('LinkedIn', <ExternalLink href={contact.linkedin_url}>View profile</ExternalLink>)
  if (contact.maps_url) add('Google Maps', <ExternalLink href={contact.maps_url}>Open in Maps</ExternalLink>)
  if (contact.upwork_job_url) add('Upwork job', <ExternalLink href={contact.upwork_job_url}>Open job post</ExternalLink>)
  if (contact.upwork_budget !== null) add('Budget', formatEuro(contact.upwork_budget))
  if (contact.connects_spent !== null) add('Connects spent', contact.connects_spent)
  if (contact.proposal_status) add('Proposal', PROPOSAL_LABELS[contact.proposal_status])

  add('Source', contact.met_where ? `${SOURCE_LABELS[contact.source]} · ${contact.met_where}` : SOURCE_LABELS[contact.source])
  if (contact.channel) add('Channel', CHANNEL_LABELS[contact.channel])
  add('Deal value', <span className="font-semibold">{formatEuro(contact.deal_value)}</span>)
  if (contact.stage === 'won' && contact.won_amount !== null) {
    const month = contact.won_month ? ` · ${monthLabel(contact.won_month, today)}` : ''
    add('Won', <span className="font-semibold text-good">{`${formatEuro(contact.won_amount)}${month}`}</span>)
  }
  if (contact.stage === 'lost' && contact.lost_reason) add('Lost because', contact.lost_reason)

  const touchAt = lastTouch?.occurred_at ?? contact.last_touch_at
  add(
    'Last touch',
    touchAt ? (
      `${shortDay(toDateKey(new Date(touchAt), timeZone), today)}${lastTouch ? ` · ${DIRECTION_LABELS[lastTouch.direction]}` : ''}`
    ) : (
      <span className="text-ink-3">Not yet</span>
    ),
  )

  const followUp = followUpLabel(contact.next_follow_up, today)
  add(
    'Next follow-up',
    <span
      className={cn(
        followUp.tone === 'warn' && 'font-semibold text-warn',
        followUp.tone === 'bad' && 'font-semibold text-bad',
        followUp.tone === 'none' && 'text-ink-3',
      )}
    >
      {followUp.text}
    </span>,
  )
  add('Added', formatDate(new Date(contact.created_at), timeZone))

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <h2 id={`${id}-title`} className="mb-1 text-base font-semibold text-foreground">
        Details
      </h2>
      <dl className="text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[120px_1fr] gap-3 border-t border-border py-2.5 first:border-t-0">
            <dt className="text-ink-2">{label}</dt>
            <dd className="min-w-0 text-foreground tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
