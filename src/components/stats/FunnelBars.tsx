import { useId } from 'react'
import { CHART, percent } from './chartTheme'

export type FunnelStep = {
  label: string
  count: number
  /** Share of the step before, 0–1 (computed in src/lib). null for the first step. */
  ofPrevious: number | null
}

type FunnelBarsProps = {
  steps: readonly FunnelStep[]
  /** Small text on the right of the title, e.g. "Last 30 days". */
  caption?: string
  title?: string
}

/** "Outreach funnel": contacted → replied → meeting → proposal → won, each with % of the step before. */
export function FunnelBars({ steps, caption, title = 'Outreach funnel' }: FunnelBarsProps) {
  const id = useId()
  const max = Math.max(1, ...steps.map((s) => s.count))

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {caption && <span className="text-[13px] text-ink-2">{caption}</span>}
      </div>

      {steps.length === 0 || steps.every((s) => s.count === 0) ? (
        <p className="py-8 text-center text-sm text-ink-3">No outreach in this period yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((step) => {
            const share = step.ofPrevious === null ? 'Start' : `${percent(step.ofPrevious)} of previous`
            return (
              <li
                key={step.label}
                className="grid min-h-9 grid-cols-[72px_minmax(0,1fr)_96px] items-center gap-x-3 text-sm sm:grid-cols-[110px_minmax(0,1fr)_130px]"
              >
                <span className="truncate text-foreground">{step.label}</span>
                <span aria-hidden="true" className="h-5 overflow-hidden rounded-[4px]" style={{ background: CHART.track }}>
                  <span
                    className="block h-full rounded-r-[4px]"
                    style={{
                      width: step.count === 0 ? 0 : `max(6px, ${(step.count / max) * 100}%)`,
                      background: CHART.strong,
                    }}
                  />
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="min-w-6 text-right font-semibold text-foreground tabular-nums">{step.count}</span>
                  <span className="text-xs leading-tight text-ink-2">{share}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
