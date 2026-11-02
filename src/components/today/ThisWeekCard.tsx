import { useId } from 'react'
import { cn } from 'cn'
import { Link } from 'react-router'
import { MeterBar } from '@/components/MeterBar'
import type { WeekProgress } from '@/lib/progress'
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from '@/lib/today-list'
import { weekSoFarLabel } from '@/lib/todayCards'

type ThisWeekCardProps = {
  week: WeekProgress
  /** Where the "Stats" link goes. */
  statsHref?: string
}

/** "This week" side card: week %, counts and one progress bar per day, Monday to Sunday. */
export function ThisWeekCard({ week, statsHref = '/stats' }: ThisWeekCardProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          This week
        </h2>
        <Link to={statsHref} className="rounded text-[13px] font-semibold text-brand hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          Stats
        </Link>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <p className="text-[13px] text-ink-2">Week progress · {weekSoFarLabel(week.days)}</p>
        <p className="text-[26px] leading-none font-bold tracking-tight text-foreground">{week.percent}%</p>
      </div>
      <MeterBar value={week.percent} label="Week progress" className="mt-3" />

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
        <div className="flex gap-1">
          <dt>Tasks</dt>
          <dd className="font-semibold text-foreground">
            {week.oneOff.done}/{week.oneOff.total}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Repeating</dt>
          <dd className="font-semibold text-foreground">
            {week.routine.done}/{week.routine.total}
          </dd>
        </div>
      </dl>

      <ol aria-label="Days this week" className="mt-4 flex flex-col gap-2.5">
        {week.days.map((day, i) => {
          const spoken = day.isFuture ? 'not yet' : day.percent === null ? 'nothing planned' : `${day.percent}% done`
          const shown = !day.isFuture && day.percent !== null
          return (
            <li key={day.date} className="flex items-center gap-3 text-xs">
              <span aria-hidden="true" className={cn('w-8 shrink-0', day.isToday ? 'font-bold text-foreground' : 'text-ink-2')}>
                {WEEKDAY_SHORT[i]}
              </span>
              <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-lg bg-brand-tint">
                {shown && (
                  <span className="block h-full rounded-lg bg-brand transition-[width]" style={{ width: `${day.percent}%` }} />
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn('w-9 shrink-0 text-right tabular-nums', day.isToday ? 'font-bold text-foreground' : shown ? 'font-semibold text-foreground' : 'text-ink-3')}
              >
                {shown ? `${day.percent}%` : '—'}
              </span>
              <span className="sr-only">
                {WEEKDAY_NAMES[i]}
                {day.isToday && ' (today)'}: {spoken}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
