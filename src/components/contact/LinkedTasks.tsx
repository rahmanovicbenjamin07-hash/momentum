import { Plus } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { daysBetween, type DateKey } from '@/lib/dates'
import type { Task } from '@/schemas/today'
import { shortDay } from './format'

export type LinkedTask = Pick<Task, 'id' | 'title' | 'due_date' | 'time' | 'status'>

type LinkedTasksProps = {
  tasks: readonly LinkedTask[]
  today: DateKey
  /** Ticks a task done (or back to to-do). Without it the list is read-only. */
  onToggle?: (task: LinkedTask, done: boolean) => void
  onAddTask?: () => void
}

/** "Today 10:30" (amber), "2 days late" (red), "30 Oct 09:00", "Done". */
function dueLabel(task: LinkedTask, today: DateKey): { text: string; className: string } {
  const time = task.time ? ` ${task.time.slice(0, 5)}` : ''
  if (task.status !== 'todo') return { text: task.status === 'done' ? 'Done' : 'Dropped', className: 'text-ink-3' }
  const diff = daysBetween(today, task.due_date)
  if (diff === 0) return { text: `Today${time}`, className: 'font-semibold text-warn' }
  if (diff < 0) return { text: `${-diff} ${diff === -1 ? 'day' : 'days'} late`, className: 'font-semibold text-bad' }
  if (diff === 1) return { text: `Tomorrow${time}`, className: 'text-ink-2' }
  return { text: `${shortDay(task.due_date, today)}${time}`, className: 'text-ink-2' }
}

/** Tasks that belong to this lead, open ones first. */
export function LinkedTasks({ tasks, today, onToggle, onAddTask }: LinkedTasksProps) {
  const id = useId()
  const sorted = [...tasks].sort(
    (a, b) =>
      Number(a.status !== 'todo') - Number(b.status !== 'todo') ||
      a.due_date.localeCompare(b.due_date) ||
      (a.time ?? '').localeCompare(b.time ?? ''),
  )

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Linked tasks
        </h2>
        {onAddTask && (
          <Button variant="ghost" size="icon-sm" aria-label="Add task" onClick={onAddTask}>
            <Plus aria-hidden="true" />
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-ink-3">No tasks for this lead.</p>
      ) : (
        <ul className="flex flex-col gap-2.5 text-sm">
          {sorted.map((task) => {
            const due = dueLabel(task, today)
            const done = task.status === 'done'
            const boxId = `${id}-${task.id}`
            return (
              <li key={task.id} className="flex items-start gap-2">
                {onToggle && (
                  <input
                    id={boxId}
                    type="checkbox"
                    checked={done}
                    onChange={(e) => onToggle(task, e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-brand"
                  />
                )}
                {onToggle ? (
                  <label htmlFor={boxId} className={cn('min-w-0 flex-1', task.status !== 'todo' && 'text-ink-3 line-through')}>
                    {task.title}
                  </label>
                ) : (
                  <span className={cn('min-w-0 flex-1', task.status !== 'todo' && 'text-ink-3 line-through')}>
                    {task.title}
                  </span>
                )}
                <span className={cn('shrink-0 text-xs tabular-nums', due.className)}>{due.text}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
