import { useId } from 'react'
import { cn } from 'cn'
import { Link } from 'react-router'
import { MeterBar } from '@/components/MeterBar'
import type { WeekProgress } from '@/lib/progress'
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from '@/lib/today-list'
import { weekCellTone, weekSoFarLabel, type WeekCellTone } from '@/lib/todayCards'

const TONE_CLASSES: Record<WeekCellTone, string> = {
  empty: 'bg-muted text-transparent',
  low: 'bg-brand-tint text-brand',
  mid: 'bg-[#C7D2FE] text-[#312E81]',
  high: 'bg-brand text-white',
  top: 'bg-[#312E81] text-white',
}

type ThisWeekCardProps = {
  week: WeekProgress
  outreach: { sent: number; goal: number }
  /** Where the "Stats" link goes. */
  statsHref?: string
}

/** "This week" side card: week %, counts and a 7-day strip (darker = more done). */
export function ThisWeekCard({ week, outreach, statsHref = '/stats' }: ThisWeekCardProps) {
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
        <div className="flex gap-1">
          <dt>Outreaches</dt>
          <dd className="font-semibold text-foreground">
            {outreach.sent}/{outreach.goal}
          </dd>
        </div>
      </dl>

      <ol aria-label="Days this week" className="mt-3 grid grid-cols-7 gap-1.5">
        {week.days.map((day, i) => {
          const tone = weekCellTone(day.percent)
          const spoken = day.isFuture ? 'not yet' : day.percent === null ? 'nothing planned' : `${day.percent}% done`
          return (
            <li key={day.date} className="flex flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className={cn(
                  'grid h-9 w-full place-items-center rounded-lg text-[11px] font-semibold',
                  TONE_CLASSES[tone],
                  day.isToday && 'ring-2 ring-brand ring-inset',
                )}
              >
                {day.percent === null ? '' : `${day.percent}%`}
              </span>
              <span
                aria-hidden="true"
                className={cn('text-xs', day.isToday ? 'font-bold text-foreground' : 'text-ink-2')}
              >
                {WEEKDAY_SHORT[i]}
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
