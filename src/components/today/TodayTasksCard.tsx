import { ChevronDown, CircleDot, RefreshCw, type LucideIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { countTodayItems, filterTodayItems, percentDone, sortTodayItems, type TodayFilter } from '@/lib/today-list'
import type { TodayItem } from '@/schemas/today'
import { TaskRow } from './TaskRow'

type TodayTasksCardProps = {
  /** Which day the card is for; sets the title and texts. Default 'today'. */
  day?: TaskDay
  /** Everything scheduled that day: routine items and one-off tasks. Sorted here. */
  items: readonly TodayItem[]
  onToggle: (item: TodayItem, done: boolean) => void
  /**
   * Trash button on a one-off task: delete it straight away (the page offers Undo).
   * Repeating items ask first, then go through `onRemove`. Left out = no trash buttons.
   */
  onDeleteTask?: (item: TodayItem) => void
  /** Removes a repeating item from the routine, after "Remove from your routine?". */
  onRemove: (id: string) => void
  /** Start folded up: only the heading and its arrow show. */
  defaultCollapsed?: boolean
  /** Called when the arrow folds or unfolds the card (the page remembers it). */
  onCollapsedChange?: (collapsed: boolean) => void
}

type TaskDay = 'today' | 'tomorrow'

const DAY_WORDS: Record<TaskDay, { title: string; progress: string; list: string }> = {
  today: { title: 'Today’s tasks', progress: 'Today’s progress', list: 'Tasks' },
  tomorrow: { title: 'Tomorrow’s tasks', progress: 'Tomorrow’s progress', list: 'Tomorrow’s tasks' },
}

/** Round pills: "All" shows its word, the other two only an icon (the name is in aria-label and the tooltip). */
const FILTERS: { value: TodayFilter; label: string; icon?: LucideIcon }[] = [
  { value: 'all', label: 'All' },
  { value: 'routine', label: 'Repeating', icon: RefreshCw },
  { value: 'task', label: 'One-off', icon: CircleDot },
]

function emptyText(filter: TodayFilter, day: TaskDay): string {
  if (filter === 'routine') return `No repeating tasks ${day}.`
  if (filter === 'task') return `No one-off tasks ${day}.`
  return `Nothing planned for ${day}. Add a task above.`
}

/**
 * "Today's tasks" (or tomorrow's): one list for repeating and one-off items, with filters,
 * and progress. The arrow by the title folds the card down to its heading.
 */
export function TodayTasksCard({
  day = 'today',
  items,
  onToggle,
  onRemove,
  onDeleteTask,
  defaultCollapsed = false,
  onCollapsedChange,
}: TodayTasksCardProps) {
  const id = useId()
  const words = DAY_WORDS[day]
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [filter, setFilter] = useState<TodayFilter>('all')
  /** The repeating item waiting for "Remove from your routine?". */
  const [confirming, setConfirming] = useState<TodayItem | null>(null)
  const pendingRemove = useRef<string | null>(null)
  /** The trash button that opened the dialog; focus goes back to it when the dialog closes. */
  const returnFocus = useRef<HTMLElement | null>(null)

  const handleDelete = onDeleteTask
    ? (item: TodayItem) => {
        if (item.kind !== 'routine') return onDeleteTask(item)
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setConfirming(item)
      }
    : undefined

  const counts = countTodayItems(items)
  const visible = sortTodayItems(filterTodayItems(items, filter))
  const percent = percentDone(counts.done, counts.all)

  function toggleCollapsed() {
    setCollapsed(!collapsed)
    onCollapsedChange?.(!collapsed)
  }

  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 px-4 pt-4 transition-[padding] duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'pb-4' : 'pb-3',
        )}
      >
        <h2 id={`${id}-title`} className="min-w-0 text-base font-semibold text-foreground">
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls={`${id}-body`}
            onClick={toggleCollapsed}
            className="-mx-1 flex items-center gap-1.5 rounded-lg px-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0 text-ink-2 transition-transform duration-300 ease-out motion-reduce:transition-none',
                collapsed && '-rotate-90',
              )}
            />
            <span>
              {words.title}{' '}
              <span className="text-sm font-normal text-ink-2">
                <span className="sr-only">, done </span>
                {counts.done}/{counts.all}
              </span>
            </span>
          </button>
        </h2>
        {!collapsed && (
          <div className="flex flex-wrap items-center gap-2 duration-300 ease-out animate-in fade-in-0 motion-reduce:animate-none">
            <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
              {FILTERS.map(({ value, label, icon: Icon }) => {
                const selected = filter === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${label} ${counts[value]}`}
                    title={label}
                    onClick={() => setFilter(value)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      selected
                        ? 'border-brand bg-brand-tint text-brand'
                        : 'border-border bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : label}
                    <span className={cn('tabular-nums', selected ? 'text-brand' : 'text-ink-3')}>{counts[value]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/*
        Folds by animating the row height (0fr ↔ 1fr). While folded the body is inert and
        aria-hidden, and turns invisible once the animation ends, so it's out of the Tab
        order and screen readers just like `hidden` was.
      */}
      <div
        id={`${id}-body`}
        inert={collapsed}
        aria-hidden={collapsed || undefined}
        className={cn(
          'grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'invisible grid-rows-[0fr]' : 'visible grid-rows-[1fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <Progress
            value={percent}
            aria-label={`${words.progress}: ${percent}%`}
            className="h-1 rounded-none bg-brand-tint"
          />

          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-ink-2">{emptyText(filter, day)}</p>
          ) : (
            <ul aria-label={words.list}>
              {visible.map((item) => (
                <TaskRow key={`${item.kind}-${item.id}`} item={item} onToggle={onToggle} onDelete={handleDelete} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            // There's no DialogTrigger, so put focus back on the trash button ourselves
            // (Radix would otherwise drop it on the page body).
            event.preventDefault()
            returnFocus.current?.focus()
            returnFocus.current = null
            // Remove only now that focus is back in the row, so the page can move it to
            // the next row when the item disappears (keyboard users stay in place).
            const removeId = pendingRemove.current
            pendingRemove.current = null
            if (removeId) onRemove(removeId)
          }}
        >
          <DialogHeader>
            <DialogTitle>Remove ‘{confirming?.title}’ from your routine?</DialogTitle>
            <DialogDescription>Past days stay in your stats.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              className="bg-bad-strong text-white hover:bg-bad-strong/90"
              onClick={() => {
                pendingRemove.current = confirming?.id ?? null
                setConfirming(null)
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
