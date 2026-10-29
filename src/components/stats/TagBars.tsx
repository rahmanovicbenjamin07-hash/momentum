import { useId } from 'react'
import { CHART } from './chartTheme'

export type TagCount = {
  /** Display name, e.g. "Outreach" ("Untagged" for tasks without a tag). */
  label: string
  count: number
}

/** "Completed by tag": done tasks per tag, most first. */
export function TagBars({ tags, title = 'Completed by tag' }: { tags: readonly TagCount[]; title?: string }) {
  const id = useId()
  const sorted = [...tags].sort((a, b) => b.count - a.count)
  const total = sorted.reduce((sum, t) => sum + t.count, 0)
  const max = Math.max(1, ...sorted.map((t) => t.count))

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        <span className="text-[13px] text-ink-2 tabular-nums">
          {total} {total === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="py-6 text-sm text-ink-3">No tasks done in this period yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((t) => (
            <li key={t.label} className="grid min-h-7 grid-cols-[88px_minmax(0,1fr)_40px] items-center gap-3 text-sm">
              <span className="truncate text-foreground">{t.label}</span>
              <span aria-hidden="true" className="h-3.5 overflow-hidden rounded-[4px]" style={{ background: CHART.track }}>
                <span
                  className="block h-full rounded-r-[4px]"
                  style={{ width: t.count === 0 ? 0 : `max(4px, ${(t.count / max) * 100}%)`, background: CHART.strong }}
                />
              </span>
              <span className="text-right font-semibold text-foreground tabular-nums">{t.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
