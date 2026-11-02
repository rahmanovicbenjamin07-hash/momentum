import { useId } from 'react'
import { cn } from 'cn'
import { MeterBar } from '@/components/MeterBar'
import { formatEur, type CategoryTotal, type MoneyTotals } from '@/lib/finance'

type FinanceSummaryProps = {
  /** e.g. "November 2026". */
  monthLabel: string
  totals: MoneyTotals
  /** Saved at the end of the month (or today); null for a month still ahead. */
  saved: number | null
  /** Shown under Saved, e.g. "since €3,000 on 1 Oct 2026". */
  savedNote?: string
}

/** One big number on a card, e.g. "Earned €2,200". */
export function MoneyTile({ label, value, tone, note }: { label: string; value: string; tone?: 'good' | 'bad'; note?: string }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="rounded-xl border border-border bg-card p-4">
      <p id={id} className="text-[13px] text-ink-2">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl font-bold tracking-tight tabular-nums',
          tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-foreground',
        )}
      >
        {value}
      </p>
      {note && <p className="mt-0.5 text-xs text-ink-2">{note}</p>}
    </div>
  )
}

/** Earned / Spent / Profit / Saved for one month. */
export function FinanceSummary({ monthLabel, totals, saved, savedNote }: FinanceSummaryProps) {
  const id = useId()
  const { earned, spent, profit } = totals
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="sr-only">
        {monthLabel} totals
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MoneyTile label="Earned" value={formatEur(earned)} />
        <MoneyTile label="Spent" value={formatEur(spent)} />
        <MoneyTile
          label="Profit"
          value={profit > 0 ? `+${formatEur(profit)}` : formatEur(profit)}
          tone={profit > 0 ? 'good' : profit < 0 ? 'bad' : undefined}
          note={earned > 0 ? `You kept ${Math.round((profit / earned) * 100)}% of what you earned` : undefined}
        />
        <MoneyTile label="Saved" value={saved === null ? '—' : formatEur(saved)} note={saved === null ? 'This month is still ahead' : savedNote} />
      </div>
    </section>
  )
}

type CategoryBreakdownProps = {
  spent: readonly CategoryTotal[]
  earned: readonly CategoryTotal[]
}

function CategoryList({ title, rows, empty, color }: { title: string; rows: readonly CategoryTotal[]; empty: string; color: string }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-2">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.category} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{row.category}</span>
                <span className="shrink-0 font-semibold text-foreground tabular-nums">
                  {formatEur(row.total)} <span className="font-normal text-ink-2">· {row.percent}%</span>
                </span>
              </div>
              <MeterBar value={row.percent} label={`${row.category}: ${row.percent}%`} color={color} trackColor="var(--chart-track)" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Where the money went (and came from) this month, by category. */
export function CategoryBreakdown({ spent, earned }: CategoryBreakdownProps) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <h2 id={`${id}-title`} className="mb-4 text-base font-semibold text-foreground">
        By category
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <CategoryList title="Spent on" rows={spent} empty="Nothing spent yet." color="var(--chart-spent)" />
        <CategoryList title="Earned from" rows={earned} empty="Nothing earned yet." color="var(--chart-earned)" />
      </div>
    </section>
  )
}
