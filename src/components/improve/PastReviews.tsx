import { useId } from 'react'
import { cardClass } from './meta'

export type PastReviewItem = {
  /** e.g. "Week 42 · 12–18 Oct". */
  weekLabel: string
  /** Task completion 0–100, or null when there were no tasks. */
  completion: number | null
  focus: string
  onOpen: () => void
}

type PastReviewsProps = {
  items: PastReviewItem[]
}

/** Earlier weeks, newest first. Each row opens that week's review. */
export function PastReviews({ items }: PastReviewsProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cardClass}>
      <h2 id={id} className="text-base font-semibold text-foreground">
        Past reviews
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">No past reviews yet. Save this week’s review and it shows up here.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border border-t border-border">
          {items.map((item) => {
            const details = [item.completion === null ? null : `${Math.round(item.completion)}%`, item.focus && `focus: ${item.focus}`]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={item.weekLabel}>
                <button
                  type="button"
                  onClick={item.onOpen}
                  className="-mx-2 flex w-[calc(100%+1rem)] flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-lg px-2 py-3 text-left text-sm outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="font-medium text-foreground">{item.weekLabel}</span>
                  <span className="text-[13px] text-ink-2 tabular-nums">{details}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
