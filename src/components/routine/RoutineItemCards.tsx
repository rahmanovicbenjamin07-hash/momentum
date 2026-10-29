import { cn } from 'cn'
import { MeterBar } from '@/components/MeterBar'
import { formatRepeatDays } from '@/lib/today-list'
import { daysText, rateText, rateTone } from './format'

export type RoutineCardData = {
  id: string
  title: string
  /** Mon..Sun, 7 booleans. */
  days: readonly boolean[]
  done: number
  missed: number
  /** done ÷ scheduled, or null before anything was scheduled. */
  rate: number | null
}

type RoutineItemCardsProps = {
  items: readonly RoutineCardData[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** One card per routine item: days done, rate of scheduled days, misses. Click to show it in the chart. */
export function RoutineItemCards({ items, selectedId, onSelect }: RoutineItemCardsProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-ink-3">
        No routine items yet. Add repeating tasks on Today and they show up here.
      </p>
    )
  }
  return (
    <ul aria-label="Routine items" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex h-full w-full flex-col rounded-xl border bg-card p-4 text-left outline-none hover:border-brand/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                selected ? 'border-brand ring-1 ring-brand' : 'border-border',
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-ink-2">
                  {formatRepeatDays(item.days)}
                </span>
              </span>
              <span className="mt-1 text-[26px] leading-tight font-bold tracking-tight text-foreground">{daysText(item.done)}</span>
              <span className={cn('mt-1 text-xs font-semibold', rateTone(item.rate))}>
                {item.rate === null ? 'Nothing scheduled yet' : `${rateText(item.rate)} of scheduled days`}
              </span>
              <MeterBar
                value={(item.rate ?? 0) * 100}
                label={`${item.title}: share of scheduled days done`}
                className="mt-3"
                trackColor="#EEF0F4"
              />
              <span className="mt-2 text-xs text-ink-2">{item.missed} missed so far this year</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
