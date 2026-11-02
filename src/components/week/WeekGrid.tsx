import { format, parseISO } from 'date-fns'
import { Plus, RefreshCw } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { MeterBar } from '@/components/MeterBar'
import { Checkbox } from '@/components/ui/checkbox'
import type { DateKey } from '@/lib/dates'
import type { WeekColumn } from '@/lib/week'
import type { TodayItem } from '@/schemas/today'

type WeekGridProps = {
  columns: readonly WeekColumn[]
  /** Tick or untick an item on that day. */
  onToggle: (item: TodayItem, done: boolean, date: DateKey) => void
  /** "+ Add" under a day. */
  onAdd: (date: DateKey) => void
  /** Where a day's name links to (that day on Today). */
  dayHref: (date: DateKey) => string
}

/**
 * Week view: one glass card per day. Seven across on wide screens, 4 / 2 on smaller ones,
 * and stacked on phones with today first.
 */
export function WeekGrid({ columns, onToggle, onAdd, dayHref }: WeekGridProps) {
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {columns.map((column) => (
        <WeekDayCard key={column.date} column={column} onToggle={onToggle} onAdd={onAdd} href={dayHref(column.date)} />
      ))}
    </div>
  )
}

function WeekDayCard({
  column,
  onToggle,
  onAdd,
  href,
}: {
  column: WeekColumn
  onToggle: WeekGridProps['onToggle']
  onAdd: WeekGridProps['onAdd']
  href: string
}) {
  const titleId = useId()
  const day = parseISO(column.date)
  const longName = format(day, 'EEEE, d MMMM')

  return (
    <section
      aria-labelledby={titleId}
      data-today={column.isToday || undefined}
      className={cn('flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3', column.isToday && 'order-first sm:order-none')}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id={titleId} className="min-w-0">
          <Link
            to={href}
            aria-label={`${longName}${column.isToday ? ' (today)' : ''}, open in day view`}
            className="-mx-1 flex items-baseline gap-1.5 rounded-lg px-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className={cn('text-sm font-semibold', column.isToday ? 'text-brand' : 'text-foreground')}>{format(day, 'EEE')}</span>
            <span className={cn('text-[13px] tabular-nums', column.isToday ? 'font-semibold text-brand' : 'text-ink-2')}>{format(day, 'd MMM')}</span>
          </Link>
        </h2>
        {column.isToday ? (
          <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand">Today</span>
        ) : column.percent !== null && !column.isFuture ? (
          <span className="shrink-0 text-[13px] font-semibold text-foreground tabular-nums">{column.percent}%</span>
        ) : null}
      </div>

      {column.total === 0 ? (
        <p className="text-[13px] text-ink-3">Nothing planned</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <MeterBar value={column.percent ?? 0} label={`${longName}: ${column.done} of ${column.total} done`} className="flex-1" />
            <span className="shrink-0 text-[11px] text-ink-2 tabular-nums">
              {column.done}/{column.total}
            </span>
          </div>
          <ul aria-label={`Tasks on ${longName}`} className="flex flex-col gap-2">
            {column.items.map((item) => (
              <WeekItem key={`${item.kind}-${item.id}`} item={item} onToggle={(done) => onToggle(item, done, column.date)} />
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        onClick={() => onAdd(column.date)}
        aria-label={`Add task on ${longName}`}
        className="inline-flex h-8 items-center gap-1.5 self-start rounded-full px-2.5 text-[13px] font-medium text-ink-2 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add
      </button>
    </section>
  )
}

function WeekItem({ item, onToggle }: { item: TodayItem; onToggle: (done: boolean) => void }) {
  const checkboxId = useId()
  return (
    <li className="flex items-start gap-2">
      <Checkbox
        id={checkboxId}
        checked={item.done}
        onCheckedChange={(checked) => onToggle(checked === true)}
        className="mt-0.5 size-4 border-ink-3"
      />
      <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer text-[13px] leading-snug break-words">
        <span className={item.done ? 'text-ink-3 line-through' : 'text-foreground'}>{item.title}</span>
        {(item.kind === 'routine' || item.time) && (
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-2 tabular-nums">
            {item.kind === 'routine' && (
              <>
                <RefreshCw className="size-3 text-brand" aria-hidden="true" />
                <span className="sr-only">Repeating</span>
              </>
            )}
            {item.time}
          </span>
        )}
      </label>
    </li>
  )
}
