import { useRef, useState } from 'react'
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
import { RoutineEditor, type RoutineEditorHandlers, type RoutineEditorItem } from './RoutineEditor'
import { TaskRow } from './TaskRow'

type TodayTasksCardProps = RoutineEditorHandlers & {
  /** Everything scheduled today: routine items and one-off tasks. Sorted here. */
  items: readonly TodayItem[]
  /** All routine items (also days they aren't scheduled), for "Edit repeating". */
  routineItems: readonly RoutineEditorItem[]
  onToggle: (item: TodayItem, done: boolean) => void
  /**
   * Trash button on a one-off task: delete it straight away (the page offers Undo).
   * Repeating items ask first, then go through `onRemove`. Left out = no trash buttons.
   */
  onDeleteTask?: (item: TodayItem) => void
}

const FILTERS: { value: TodayFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'routine', label: 'Repeating' },
  { value: 'task', label: 'One-off' },
]

const EMPTY_TEXT: Record<TodayFilter, string> = {
  all: 'Nothing planned for today. Add a task above.',
  routine: 'No repeating tasks today.',
  task: 'No one-off tasks today.',
}

/** "Today's tasks": one list for repeating and one-off items, with filters, progress and an edit mode. */
export function TodayTasksCard({
  items,
  routineItems,
  onToggle,
  onChangeDays,
  onChangeTime,
  onRemove,
  onDeleteTask,
}: TodayTasksCardProps) {
  const [filter, setFilter] = useState<TodayFilter>('all')
  const [editing, setEditing] = useState(false)
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

  return (
    <section aria-labelledby="today-tasks-title" className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h2 id="today-tasks-title" className="text-base font-semibold text-foreground">
            Today’s tasks{' '}
            <span className="text-sm font-normal text-ink-2">
              <span className="sr-only">, done </span>
              {counts.done}/{counts.all}
            </span>
          </h2>
          <p className="text-[13px] text-ink-2">Repeating tasks come back on their days · one-off tasks roll over if unfinished</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!editing && (
            <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
              {FILTERS.map(({ value, label }) => {
                const selected = filter === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilter(value)}
                    className={cn(
                      'h-8 rounded-lg border px-3 text-[13px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      selected
                        ? 'border-brand bg-brand-tint text-brand'
                        : 'border-border bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    {label} <span className={selected ? 'text-brand' : 'text-ink-3'}>{counts[value]}</span>
                  </button>
                )
              })}
            </div>
          )}
          <Button variant="outline" size="sm" className="h-8 bg-card px-3 text-[13px]" onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit repeating'}
          </Button>
        </div>
      </div>

      <Progress
        value={percent}
        aria-label={`Today’s progress: ${percent}%`}
        className="h-1 rounded-none bg-brand-tint"
      />

      {editing ? (
        <RoutineEditor
          items={routineItems}
          onChangeDays={onChangeDays}
          onChangeTime={onChangeTime}
          onRemove={onRemove}
          onDone={() => setEditing(false)}
        />
      ) : visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-ink-2">{EMPTY_TEXT[filter]}</p>
      ) : (
        <ul aria-label="Tasks">
          {visible.map((item) => (
            <TaskRow key={`${item.kind}-${item.id}`} item={item} onToggle={onToggle} onDelete={handleDelete} />
          ))}
        </ul>
      )}

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
            const id = pendingRemove.current
            pendingRemove.current = null
            if (id) onRemove(id)
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
              className="bg-bad text-white hover:bg-bad/90"
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
