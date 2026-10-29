import { useId } from 'react'
import { cn } from 'cn'
import { monthName } from '@/components/metrics/format'
import type { RoutineMonth } from '@/lib/routineStats'
import { daysText, rateText, rateTone } from './format'

/** "Month by month": done of scheduled, rate, running total and missed days. Newest first. */
export function MonthTable({ months }: { months: readonly RoutineMonth[] }) {
  const id = useId()
  const rows = [...months].filter((m) => m.scheduled > 0).sort((a, b) => b.month.localeCompare(a.month))

  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Month by month
        </h2>
        <span className="text-[13px] text-ink-2">Newest first</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-3">Nothing scheduled yet this year.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-background text-left text-xs font-semibold tracking-wider text-ink-2 uppercase">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Month
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Done
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Rate
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Running total
                </th>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Missed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m) => (
                <tr key={m.month}>
                  <th scope="row" className="px-5 py-3 text-left font-semibold text-foreground">
                    {monthName(m.month)}
                  </th>
                  <td className="px-3 py-3 text-foreground tabular-nums">
                    {m.done} of {m.scheduled}
                  </td>
                  <td className={cn('px-3 py-3 font-semibold tabular-nums', rateTone(m.rate))}>{rateText(m.rate)}</td>
                  <td className="px-3 py-3 text-foreground tabular-nums">{daysText(m.total)}</td>
                  <td className="px-5 py-3 text-foreground tabular-nums">{daysText(m.missed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
