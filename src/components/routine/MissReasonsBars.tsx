import { useId } from 'react'
import { CHART } from '@/components/stats/chartTheme'
import { NOT_ANSWERED, type MissReasonLabel } from '@/lib/routineStats'

type MissReasonsBarsProps = {
  /** Most common first, "Not answered" last (from routineItemStats). */
  reasons: readonly { reason: MissReasonLabel; count: number }[]
  /** One pattern sentence, e.g. "Most misses are on Mondays — usually after a late Sunday." */
  pattern?: string | null
}

const TOP = 'var(--warn)'
const OTHER = 'var(--chart-amber-soft)'
const UNANSWERED = 'var(--chart-empty)'

/** "Why you missed it": missed days by the reason picked on Today, plus a pattern sentence. */
export function MissReasonsBars({ reasons, pattern }: MissReasonsBarsProps) {
  const id = useId()
  const shown = reasons.filter((r) => r.count > 0)
  const max = Math.max(1, ...shown.map((r) => r.count))
  const topReason = shown.find((r) => r.reason !== NOT_ANSWERED)?.reason

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
        Why you missed it
      </h2>
      {pattern && <p className="mt-2 text-sm font-semibold text-foreground">{pattern}</p>}

      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">No missed days. Keep it going!</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {shown.map((r) => (
            <li key={r.reason} className="grid min-h-6 grid-cols-[96px_minmax(0,1fr)_32px] items-center gap-3 text-sm">
              <span className="truncate text-foreground">{r.reason}</span>
              <span aria-hidden="true" className="h-3 overflow-hidden rounded-[4px]" style={{ background: CHART.track }}>
                <span
                  className="block h-full rounded-r-[4px]"
                  style={{
                    width: `max(4px, ${(r.count / max) * 100}%)`,
                    background: r.reason === NOT_ANSWERED ? UNANSWERED : r.reason === topReason ? TOP : OTHER,
                  }}
                />
              </span>
              <span className="text-right font-semibold text-foreground tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-2">
        Reasons come from the one-tap question on Today. Ticks fill these charts automatically — you never type routine
        numbers.
      </p>
    </section>
  )
}
