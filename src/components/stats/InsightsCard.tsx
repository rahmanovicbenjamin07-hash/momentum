import { Clock, Send, TrendingUp, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'

export type InsightKind = 'routine' | 'outreach' | 'timing' | 'energy'

export type Insight = {
  id: string
  kind: InsightKind
  /** The finding, e.g. "On days you wake up at 06:00 you finish 31% more tasks." */
  title: string
  /** The numbers behind it, e.g. "84% completion vs 64% on late days · based on 213 days". */
  detail: string
}

const KIND_STYLE: Record<InsightKind, { icon: LucideIcon; className: string }> = {
  routine: { icon: TrendingUp, className: 'bg-good-tint text-good' },
  outreach: { icon: Send, className: 'bg-brand-tint text-brand' },
  timing: { icon: Clock, className: 'bg-info-tint text-info' },
  energy: { icon: TriangleAlert, className: 'bg-warn-tint text-warn' },
}

/** "Insights": a few sentences about patterns in the user's own data. */
export function InsightsCard({ insights }: { insights: readonly Insight[] }) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Insights
        </h2>
        <span className="text-[13px] text-ink-2">Patterns found in your own data</span>
      </div>

      {insights.length === 0 ? (
        <p className="py-6 text-sm text-ink-3">Not enough data yet. Insights show up after a couple of weeks of use.</p>
      ) : (
        <ul className="divide-y divide-border">
          {insights.map((insight) => {
            const { icon: Icon, className } = KIND_STYLE[insight.kind]
            return (
              <li key={insight.id} className="flex gap-3 py-3.5 last:pb-0">
                <span aria-hidden="true" className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full', className)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                  <p className="mt-0.5 text-xs text-ink-2">{insight.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
