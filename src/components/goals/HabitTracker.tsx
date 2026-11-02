import { Check } from 'lucide-react'
import { cn } from 'cn'
import { formatDate, type DateKey } from '@/lib/dates'

/** One day of this week. `disabled`: in the future or outside the goal's dates. */
export type HabitDay = { date: DateKey; weekday: string; done: boolean; disabled: boolean }
/** One week of the strip. */
export type HabitWeekCell = { start: DateKey; count: number; needed: number; hit: boolean; current: boolean }

/** How many weeks the strip shows. */
const STRIP_WEEKS = 12

type HabitTrackerProps = {
  perWeek: number
  /** This week, first day first. */
  days: readonly HabitDay[]
  /** Finished weeks and this week, oldest first. */
  weeks: readonly HabitWeekCell[]
  /** Routine item it's linked to; its days are ticked on Today instead of here. */
  linkedTo: string | null
  /** e.g. "Hit 6 of 8 weeks so far (75%)". */
  summary: string
  onToggleDay: (date: DateKey, done: boolean) => void
}

/** A habit key result: this week's days (tick them here unless linked to a routine item) and the last 12 weeks. */
export function HabitTracker({ perWeek, days, weeks, linkedTo, summary, onToggleDay }: HabitTrackerProps) {
  const thisWeek = weeks.find((w) => w.current)
  const recent = weeks.slice(-STRIP_WEEKS)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">This week</h4>
          <p className="text-[13px] text-ink-2 tabular-nums">
            {thisWeek ? `${thisWeek.count} of ${thisWeek.needed}` : `0 of ${perWeek}`}
            {thisWeek?.hit ? ' · done for this week' : ''}
          </p>
        </div>
        <div role="group" aria-label="This week" className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const label = `${day.weekday} ${formatDate(day.date)}`
            const readOnly = linkedTo !== null || day.disabled
            return (
              <button
                key={day.date}
                type="button"
                aria-pressed={day.done}
                aria-label={label}
                disabled={readOnly}
                onClick={() => onToggleDay(day.date, !day.done)}
                className={cn(
                  'flex h-11 flex-col items-center justify-center rounded-lg border text-xs font-semibold',
                  'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none',
                  day.done ? 'border-good bg-good-tint text-good' : 'border-border bg-card text-ink-2',
                  !readOnly && !day.done && 'hover:bg-muted',
                  day.disabled && !day.done && 'opacity-50',
                  readOnly && 'cursor-default',
                )}
              >
                <span aria-hidden>{day.weekday.slice(0, 1)}</span>
                {day.done ? <Check aria-hidden className="size-3.5" /> : <span aria-hidden className="h-3.5" />}
              </button>
            )
          })}
        </div>
        {linkedTo && <p className="mt-2 text-xs text-ink-2">Linked to “{linkedTo}” — tick it on Today.</p>}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">Weeks</h4>
          <p className="text-[13px] text-ink-2 tabular-nums">{summary}</p>
        </div>
        {recent.length === 0 ? (
          <p className="text-[13px] text-ink-2">Weeks show up here once the habit starts.</p>
        ) : (
          <ol className="flex flex-wrap gap-1.5" aria-label={`Last ${recent.length} weeks`}>
            {recent.map((week) => {
              const text = `Week of ${formatDate(week.start)}: ${week.count} of ${week.needed}${week.current ? ' (this week)' : week.hit ? ', hit' : ', missed'}`
              return (
                <li
                  key={week.start}
                  title={text}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums',
                    week.hit ? 'bg-good text-white' : week.current ? 'border border-dashed border-ink-3 text-ink-2' : 'bg-bad-tint text-bad',
                  )}
                >
                  <span aria-hidden>{week.count}</span>
                  <span className="sr-only">{text}</span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
