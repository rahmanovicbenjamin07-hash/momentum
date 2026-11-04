import { useSetMissReason, useToggleRoutineCheck, useUpdateRoutineItem } from '@/api/routine'
import { useSetTaskStatus, useUpdateTask } from '@/api/tasks'
import type { EditTaskResult } from '@/components/today/EditTaskDialog'
import type { DateKey } from '@/lib/dates'
import type { Task, TodayItem, TodayItemStatus } from '@/schemas/today'

const TASK_STATUS: Record<TodayItemStatus, Task['status']> = { open: 'todo', done: 'done', missed: 'dropped' }

/**
 * ✓ / ✗ and Edit for rows on Today and Week.
 * "Not done" on a repeating item is saved as a miss with reason "Other" (so it isn't asked about again).
 */
export function useTaskActions() {
  const toggleCheck = useToggleRoutineCheck()
  const setMissReason = useSetMissReason()
  const setTaskStatus = useSetTaskStatus()
  const updateTask = useUpdateTask()
  const updateRoutine = useUpdateRoutineItem()

  function setStatus(item: TodayItem, status: TodayItemStatus, date: DateKey) {
    if (item.kind === 'task') {
      setTaskStatus.mutate({ id: item.id, status: TASK_STATUS[status] })
    } else if (status === 'missed') {
      setMissReason.mutate({ routineItemId: item.id, date, reason: 'Other' })
    } else {
      toggleCheck.mutate({ routineItemId: item.id, date, done: status === 'done' })
    }
  }

  /** Saves the task pop-up. Rejects when saving fails (the hooks already showed a toast and undid it). */
  async function saveEdit(result: EditTaskResult): Promise<void> {
    if (result.kind === 'task') {
      await updateTask.save({
        id: result.id,
        changes: {
          title: result.title,
          dueDate: result.dueDate,
          time: result.time,
          endTime: result.endTime,
          notes: result.notes,
        },
      })
    } else {
      await updateRoutine.mutateAsync({
        id: result.id,
        title: result.title,
        notes: result.notes,
        days: result.days,
        time: result.time,
        endTime: result.endTime,
      })
    }
  }

  return { setStatus, saveEdit }
}
