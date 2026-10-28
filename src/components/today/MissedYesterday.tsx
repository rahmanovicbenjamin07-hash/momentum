import { useId } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MISS_REASONS, type MissReason, type RoutineItem } from '@/schemas/today'

export type MissedItem = Pick<RoutineItem, 'id' | 'title'>

type MissedYesterdayProps<T extends MissedItem> = {
  /** Routine items missed yesterday without a reason yet. One is asked at a time; nothing shows when empty. */
  items: readonly T[]
  /** True when yesterday was this week's forgiven miss, so the streak continues. */
  streakSafe?: boolean
  onReason: (item: T, reason: MissReason) => void
  onDismiss: () => void
}

/** "Yesterday you missed Read 20 pages" with one-tap reason buttons. */
export function MissedYesterday<T extends MissedItem>({ items, streakSafe, onReason, onDismiss }: MissedYesterdayProps<T>) {
  const titleId = useId()
  const item = items[0]
  if (!item) return null
  const more = items.length - 1

  return (
    <section aria-labelledby={titleId} className="relative rounded-xl border border-border bg-card p-4 pr-12">
      <h2 id={titleId} className="text-[15px] font-semibold text-foreground">
        Yesterday you missed <span className="text-brand">{item.title}</span>
        {more > 0 && <span className="font-normal text-ink-2"> · {more} more after this</span>}
      </h2>
      <p className="mt-0.5 text-[13px] text-ink-2">
        One tap — it helps you spot patterns later.
        {streakSafe && ' Your streak is safe: it was your weekly rest day.'}
      </p>
      <div role="group" aria-label={`Why did you miss ${item.title}?`} className="mt-3 flex flex-wrap gap-2">
        {MISS_REASONS.map((reason) => (
          <Button key={reason} variant="outline" className="h-9 bg-card px-3" onClick={() => onReason(item, reason)}>
            {reason}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-ink-3"
        onClick={onDismiss}
      >
        <X aria-hidden="true" />
      </Button>
    </section>
  )
}
