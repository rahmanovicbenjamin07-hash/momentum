import { format, parseISO } from 'date-fns'
import { useId, useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { addDays, weekStart, type DateKey } from '@/lib/dates'
import { CHART, heatLevel, percent } from './chartTheme'

export type ConsistencyDay = {
  date: DateKey
  /** Share of the day's routine and tasks done, 0–1. null = nothing was planned. */
  rate: number | null
}

type ConsistencyHeatmapProps = {
  days: readonly ConsistencyDay[]
  today: DateKey
  /** Number of weeks (columns). Default 12. */
  weeks?: number
  /** Shown under the grid, e.g. "<strong>Insight:</strong> Tuesdays are your strongest day…". */
  insight?: ReactNode
}

const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'] as const

function cellLabel(date: DateKey, rate: number | null | undefined): string {
  const day = format(parseISO(date), 'EEE, d MMM')
  if (rate === undefined || rate === null) return `${day}: nothing planned`
  return `${day}: ${percent(rate)} done`
}

/** "Consistency": one square per day for the last 12 weeks (columns = weeks, rows = Mon–Sun). */
export function ConsistencyHeatmap({ days, today, weeks = 12, insight }: ConsistencyHeatmapProps) {
  const id = useId()
  const [hover, setHover] = useState<{ label: string; col: number; row: number } | null>(null)
  const byDate = new Map(days.map((d) => [d.date, d.rate]))
  const start = addDays(weekStart(today), -(weeks - 1) * 7)
  const columns = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (__, d) => addDays(start, w * 7 + d)))

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Consistency
        </h2>
        <span className="text-[13px] text-ink-2">Last {weeks} weeks</span>
      </div>

      <div className="relative max-w-[400px]">
        <div
          role="group"
          aria-label={`Days done, last ${weeks} weeks, Monday to Sunday`}
          className="grid gap-1"
          style={{ gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 1fr))`, gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, auto)' }}
        >
          {ROW_LABELS.map((label, row) => (
            <span key={row} aria-hidden="true" className="flex items-center pr-1.5 text-[11px] leading-none text-ink-2">
              {label}
            </span>
          ))}
          {columns.map((week, col) =>
            week.map((date, row) => {
              if (date > today) return <span key={date} aria-hidden="true" className="aspect-square" />
              const rate = byDate.get(date)
              const label = cellLabel(date, rate)
              return (
                <span
                  key={date}
                  role="img"
                  aria-label={label}
                  onPointerEnter={() => setHover({ label, col, row })}
                  onPointerLeave={() => setHover(null)}
                  className={cn('aspect-square rounded-[4px]', date === today && 'ring-2 ring-brand ring-offset-1 ring-offset-card')}
                  style={{ background: CHART.heat[heatLevel(rate ?? null)] }}
                />
              )
            }),
          )}
        </div>

        {hover && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 w-max -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground"
            style={{
              left: `calc(2rem + (100% - 2rem) * ${(hover.col + 0.5) / weeks})`,
              top: `calc(100% * ${hover.row / 7} - 4px)`,
            }}
          >
            {hover.label}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-ink-2">
        <span>Less</span>
        {CHART.heat.map((color) => (
          <span key={color} aria-hidden="true" className="size-3 rounded-[3px]" style={{ background: color }} />
        ))}
        <span>More</span>
        <span className="sr-only">: darker squares mean more of the day was done.</span>
      </div>

      {insight && <div className="mt-4 rounded-lg bg-background px-3 py-2.5 text-[13px] leading-relaxed text-foreground">{insight}</div>}
    </section>
  )
}
