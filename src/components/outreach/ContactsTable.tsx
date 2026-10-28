import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import type { DateKey } from '@/lib/dates'
import { FollowUpText } from './FollowUpText'
import {
  avatarTone,
  contactViaLabel,
  formatEuro,
  lastTouchLabel,
  leadInitials,
  leadShortLine,
  leadValue,
  type LeadSummary,
} from './format'
import { SourceChip } from './SourceChip'
import { StagePill } from './StagePill'

type ContactsTableProps = {
  /** Leads to show (already filtered, sorted and paged). */
  contacts: readonly LeadSummary[]
  today: DateKey
  /** True when filters/search are on, so the empty state offers "Clear filters". */
  filtered?: boolean
  onClearFilters?: () => void
  onAddLead?: () => void
  /** Shown under the rows, e.g. "Showing 8 of 38" with Previous / Next. */
  footer?: ReactNode
}

/** Round initials avatar for a lead. */
export function LeadAvatar({ lead, className }: { lead: LeadSummary; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
        avatarTone(lead.id),
        className,
      )}
    >
      {leadInitials(lead)}
    </span>
  )
}

const COLUMNS = ['Lead', 'Found on', 'Stage', 'Contact via', 'Last touch', 'Next follow-up', 'Value'] as const

/** Leads table: each row opens /outreach/:id. Scrolls sideways on narrow screens. */
export function ContactsTable({ contacts, today, filtered, onClearFilters, onAddLead, footer }: ContactsTableProps) {
  if (contacts.length === 0) {
    return filtered ? (
      <EmptyState title="No leads match" description="Try another source, stage or search word.">
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </EmptyState>
    ) : (
      <EmptyState title="No leads yet" description="Add someone you found on LinkedIn, Google Maps, Upwork or in person.">
        {onAddLead && <Button onClick={onAddLead}>Add lead</Button>}
      </EmptyState>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <caption className="sr-only">Leads</caption>
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map((label) => (
                <th
                  key={label}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold tracking-wider text-ink-2 uppercase',
                    label === 'Value' && 'text-right',
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts.map((lead) => {
              const shortLine = leadShortLine(lead)
              return (
                <tr key={lead.id} className="relative hover:bg-background focus-within:bg-background">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <LeadAvatar lead={lead} />
                      <div className="min-w-0">
                        {/* The link covers the whole row (after:inset-0), so any click opens the lead. */}
                        <Link
                          to={`/outreach/${lead.id}`}
                          className="font-semibold text-foreground outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                        >
                          {lead.name}
                        </Link>
                        {shortLine && <p className="truncate text-xs text-ink-2">{shortLine}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <SourceChip source={lead.source} />
                  </td>
                  <td className="px-4 py-3">
                    <StagePill stage={lead.stage} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">{contactViaLabel(lead.channel)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">{lastTouchLabel(lead.last_touch_at, today)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <FollowUpText date={lead.next_follow_up} today={today} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-foreground tabular-nums">
                    {formatEuro(leadValue(lead))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </div>
  )
}
