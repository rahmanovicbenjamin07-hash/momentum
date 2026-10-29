import { useId } from 'react'
import { CHART, percent } from './chartTheme'

export type ReplyRateRow = {
  /** Channel or source, e.g. "LinkedIn". */
  label: string
  sent: number
  /** Replies ÷ sent, 0–1 (computed in src/lib). */
  rate: number
}

type ReplyRateBarsProps = {
  rows: readonly ReplyRateRow[]
  title?: string
  /** Fewer sends than this and the bar is faded. Default 30. */
  minSends?: number
}

/** "Reply rate by channel": one bar per channel, highest first; faded when there are too few sends to trust. */
export function ReplyRateBars({ rows, title = 'Reply rate by channel', minSends = 30 }: ReplyRateBarsProps) {
  const id = useId()
  const sorted = [...rows].sort((a, b) => b.rate - a.rate)
  const max = Math.max(0.0001, ...sorted.map((r) => r.rate))
  const anyFaded = sorted.some((r) => r.sent < minSends)

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        <span className="text-[13px] text-ink-2">Replies ÷ messages sent</span>
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-3">No messages sent in this period yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((row) => {
            const faded = row.sent < minSends
            return (
              <li
                key={row.label}
                className="grid min-h-9 grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-x-3 text-sm sm:grid-cols-[96px_minmax(0,1fr)_64px]"
              >
                <span className="truncate text-foreground">{row.label}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-5 shrink-0 rounded-r-[4px]"
                    style={{
                      // Longest bar takes 75% of the room, leaving space for "48 sent".
                      width: row.rate === 0 ? 0 : `max(4px, ${(row.rate / max) * 75}%)`,
                      background: faded ? CHART.faded : CHART.strong,
                    }}
                  />
                  <span className="truncate text-xs text-ink-2 tabular-nums">
                    {row.sent} sent
                    {faded && <span className="sr-only"> (too few to trust yet)</span>}
                  </span>
                </span>
                <span className="text-right font-semibold text-foreground tabular-nums">{percent(row.rate, 1)}</span>
              </li>
            )
          })}
        </ul>
      )}

      {anyFaded && (
        <p className="mt-3 text-xs text-ink-2">Faded bars have fewer than {minSends} sends — too few to trust yet.</p>
      )}
    </section>
  )
}
