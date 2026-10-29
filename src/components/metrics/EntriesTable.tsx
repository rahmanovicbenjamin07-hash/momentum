import { useId } from 'react'
import { cn } from 'cn'
import type { Unit } from '@/schemas/stats'
import { formatChange, formatMetricValue, monthName } from './format'
import type { ChartMonth } from './MetricChart'

type EntriesTableProps = {
  /** One row per logged month (any order; shown newest first). */
  rows: readonly ChartMonth[]
  unit: Unit
}

/** "Entries": month, value, change vs the month before, running total, note. Newest first. */
export function EntriesTable({ rows, unit }: EntriesTableProps) {
  const id = useId()
  const sorted = [...rows].sort((a, b) => b.month.localeCompare(a.month))

  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-baseline justify-between gap-2 px-5 pt-5 pb-3">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Entries
        </h2>
        <span className="text-[13px] text-ink-2">Newest first</span>
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-3">Nothing logged yet. Log your first value on the left.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-background text-left text-xs font-semibold tracking-wider text-ink-2 uppercase">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Month
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Value
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Change
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Running total
                </th>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((row) => (
                <tr key={row.month}>
                  <th scope="row" className="px-5 py-3 text-left font-semibold text-foreground">
                    {monthName(row.month)}
                  </th>
                  <td className="px-3 py-3 text-foreground tabular-nums">{formatMetricValue(row.value, unit)}</td>
                  <td
                    className={cn(
                      'px-3 py-3 font-semibold tabular-nums',
                      row.change === null ? 'text-ink-3' : row.change >= 0 ? 'text-good' : 'text-bad',
                    )}
                  >
                    {row.change === null ? (
                      <>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">No month before</span>
                      </>
                    ) : (
                      formatChange(row.change)
                    )}
                  </td>
                  <td className="px-3 py-3 text-foreground tabular-nums">{formatMetricValue(row.total, unit)}</td>
                  <td className="px-5 py-3 text-ink-2">{row.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
