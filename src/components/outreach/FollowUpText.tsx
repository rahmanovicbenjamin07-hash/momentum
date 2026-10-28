import { format, parseISO } from 'date-fns'
import { cn } from 'cn'
import type { DateKey } from '@/lib/dates'
import { followUpState } from '@/lib/outreach'

type FollowUpTextProps = {
  /** Next follow-up day, or null when none is planned. */
  date: DateKey | null
  /** Today's date, to decide "Today" / "2 days late". */
  today: DateKey
  /** Text in front, e.g. "Next: " on board cards. */
  prefix?: string
  className?: string
}

/** "Today" in amber, "2 days late" in red, "Fri, 30 Oct" when later, "—" when none. */
export function FollowUpText({ date, today, prefix = '', className }: FollowUpTextProps) {
  const state = followUpState(date, today)

  switch (state.kind) {
    case 'none':
      return (
        <span className={cn('text-ink-3', className)}>
          {prefix && <span>{prefix}</span>}
          <span aria-hidden="true">—</span>
          <span className="sr-only">No follow-up</span>
        </span>
      )
    case 'today':
      return <span className={cn('font-semibold text-warn', className)}>{prefix}Today</span>
    case 'late':
      return (
        <span className={cn('font-semibold text-bad', className)}>
          {prefix}
          {state.days} {state.days === 1 ? 'day' : 'days'} late
        </span>
      )
    case 'upcoming':
      return (
        <span className={cn('text-foreground', className)}>
          {prefix}
          {format(parseISO(date as DateKey), 'EEE, d MMM')}
        </span>
      )
  }
}
