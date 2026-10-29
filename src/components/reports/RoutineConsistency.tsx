import { useId } from 'react'
import { CHART } from '@/components/stats/chartTheme'
import type { Report } from '@/lib/reports'

/** "Routine": done ÷ scheduled per item and overall. Green bars at 90% or more. */
export function RoutineConsistency({ routine }: { routine: Report['routine'] }) {
  const id = useId()
  const pct = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`)

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5 print:break-inside-avoid">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Routine
        </h2>
        {routine.overall !== null && (
          <span className="text-sm font-semibold text-foreground tabular-nums">{pct(routine.overall)} overall</span>
        )}
      </div>
      {routine.items.length === 0 ? (
        <p className="text-sm text-ink-3">No routine items scheduled in this period.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {routine.items.map((item) => (
            <li key={item.title} className="grid grid-cols-[minmax(0,1fr)_minmax(64px,120px)_44px] items-center gap-3 text-sm">
              <span className="truncate text-foreground" title={`${item.done} of ${item.scheduled} days`}>
                {item.title}
              </span>
              <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-[4px] [print-color-adjust:exact]" style={{ background: CHART.track }}>
                <span
                  className="block h-full rounded-r-[4px]"
                  style={{
                    width: `${Math.round((item.rate ?? 0) * 100)}%`,
                    background: (item.rate ?? 0) >= 0.9 ? 'var(--good)' : CHART.strong,
                  }}
                />
              </span>
              <span className="text-right font-semibold text-foreground tabular-nums">
                {pct(item.rate)}
                <span className="sr-only">
                  {' '}
                  ({item.done} of {item.scheduled} days)
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
