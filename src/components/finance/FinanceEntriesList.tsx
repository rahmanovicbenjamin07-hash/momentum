import { PencilLine, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'
import { formatDate } from '@/lib/dates'
import { formatAmount, formatEur, type MoneyTotals } from '@/lib/finance'
import type { FinanceEntry } from '@/schemas/finance'

type FinanceEntriesListProps = {
  /** e.g. "November 2026". */
  monthLabel: string
  /** The month's totals; profit (earned − spent) heads the amount column. */
  totals: MoneyTotals
  /** The month's logs, newest first. */
  entries: readonly FinanceEntry[]
  onEdit: (entry: FinanceEntry) => void
  onDelete: (entry: FinanceEntry) => void
}

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-lg text-ink-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

const headClass = 'px-3 pb-2 text-left align-bottom text-xs font-medium tracking-wide text-ink-2 uppercase first:pl-5'

const signed = (value: number) => (value > 0 ? `+${formatEur(value)}` : formatEur(value))

/**
 * The month's logs as a table: Name | Description | Date | Total.
 * The Total column is headed by the month's total, with each log's amount under it.
 * On phones Description and Date move under the name.
 */
export function FinanceEntriesList({ monthLabel, totals, entries, onEdit, onDelete }: FinanceEntriesListProps) {
  const id = useId()
  const { profit } = totals

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card pt-4 pb-1">
      <h2 id={`${id}-title`} className="sr-only">
        Logs for {monthLabel}
      </h2>
      <table aria-labelledby={`${id}-title`} className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={cn(headClass, 'sm:w-[30%]')}>
              Name
            </th>
            <th scope="col" className={cn(headClass, 'hidden sm:table-cell')}>
              Description
            </th>
            <th scope="col" className={cn(headClass, 'hidden w-[120px] sm:table-cell')}>
              Date
            </th>
            <th scope="col" className={cn(headClass, 'w-[132px] text-right sm:w-[150px]')}>
              <span className="block">Total</span>
              <span
                className={cn(
                  'mt-0.5 block text-xl font-bold tracking-tight normal-case tabular-nums',
                  profit > 0 ? 'text-good' : profit < 0 ? 'text-bad' : 'text-foreground',
                )}
              >
                {signed(profit)}
              </span>
            </th>
            <th scope="col" className="w-[84px] pr-5 pb-2">
              <span className="sr-only">Edit or delete</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const income = entry.kind === 'income'
            const day = formatDate(entry.date)
            return (
              <tr key={entry.id} className="border-t border-border first:border-t-0">
                <td className="py-3 pr-3 pl-5 align-top">
                  <p className="truncate font-semibold text-foreground">{entry.name}</p>
                  {entry.note && <p className="truncate text-[13px] text-ink-2 sm:hidden">{entry.note}</p>}
                  <p className="text-xs text-ink-2 sm:hidden">{day}</p>
                </td>
                <td className="hidden px-3 py-3 align-top text-ink-2 sm:table-cell">
                  {entry.note ? (
                    <p className="truncate">{entry.note}</p>
                  ) : (
                    <p>
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">No description</span>
                    </p>
                  )}
                </td>
                <td className="hidden px-3 py-3 align-top whitespace-nowrap text-ink-2 sm:table-cell">{day}</td>
                <td className="px-3 py-3 text-right align-top">
                  <p className={cn('font-semibold whitespace-nowrap tabular-nums', income ? 'text-good' : 'text-foreground')}>
                    <span className="sr-only">{income ? 'Earned ' : 'Spent '}</span>
                    <span aria-hidden="true">{income ? '+' : '−'}</span>
                    {formatAmount(entry.amount, entry.currency)}
                  </p>
                  {entry.currency === 'bam' && <p className="text-xs text-ink-2 tabular-nums">{formatEur(entry.amount_eur)}</p>}
                </td>
                <td className="py-2 pr-5 align-top">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${entry.name} on ${day}`}
                      onClick={() => onEdit(entry)}
                      className={cn(iconButton, 'hover:bg-muted hover:text-foreground')}
                    >
                      <PencilLine className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${entry.name} on ${day}`}
                      onClick={() => onDelete(entry)}
                      className={cn(iconButton, 'hover:bg-bad-tint hover:text-bad')}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {entries.length === 0 && (
        <p className="px-5 py-6 text-sm text-ink-2">Nothing logged this month. Use Add log to note what you earned or spent.</p>
      )}
    </section>
  )
}
