import { useId } from 'react'
import { Button } from '@/components/ui/button'
import type { DateKey } from '@/lib/dates'
import { formatOverdue } from '@/lib/overdue'
import { tagLabel } from '@/lib/today-list'
import type { Task } from '@/schemas/today'

export type OverdueTask = Pick<Task, 'id' | 'title' | 'due_date' | 'tag'>

type OverdueBlockProps<T extends OverdueTask> = {
  /** Unfinished one-off tasks from earlier days. Nothing shows when empty. */
  tasks: readonly T[]
  /** Today's date, for "Due yesterday" / "Due 3 days ago". */
  today: DateKey
  onMoveToToday: (task: T) => void
  onDrop: (task: T) => void
}

/** Yellow block above the list: each late task with "Move to today" and "Drop". */
export function OverdueBlock<T extends OverdueTask>({ tasks, today, onMoveToToday, onDrop }: OverdueBlockProps<T>) {
  const titleId = useId()
  if (tasks.length === 0) return null

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-xl border border-[#FCD34D] bg-card px-4 py-3 sm:flex-row sm:items-start sm:gap-5"
    >
      <h2
        id={titleId}
        className="inline-flex h-6 w-fit shrink-0 items-center rounded-lg bg-warn-tint px-2 text-xs font-semibold text-warn sm:mt-2"
      >
        Overdue · {tasks.length}
      </h2>
      <ul className="min-w-0 flex-1 divide-y divide-border">
        {tasks.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-1.5">
            <div className="min-w-0 flex-1 basis-48">
              <p id={`${titleId}-${task.id}`} className="text-[15px] break-words text-foreground">
                {task.title}
              </p>
              <p className="text-[13px] text-ink-2">
                {formatOverdue(task.due_date, today)}
                {task.tag && ` · ${tagLabel(task.tag)}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                className="bg-card"
                aria-describedby={`${titleId}-${task.id}`}
                onClick={() => onMoveToToday(task)}
              >
                Move to today
              </Button>
              <Button
                variant="ghost"
                className="text-ink-2"
                aria-describedby={`${titleId}-${task.id}`}
                onClick={() => onDrop(task)}
              >
                Drop
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
