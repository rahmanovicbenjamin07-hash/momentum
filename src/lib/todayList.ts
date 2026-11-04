import type { RoutineCheck, RoutineItem, Task, TodayItem } from '@/schemas/today'
import { DEFAULT_TIME_ZONE, dayIndex, toDateKey, type DateKey } from './dates'
import { formatRepeatDays, sortTodayItems, toHHMM } from './today-list'

// Shared helpers live in today-list.ts (already used by UI components); re-exported here.
export { sortTodayItems, toHHMM }

/** "Every day", "Mon–Fri", "Weekends", "Mon, Wed, Fri" (3+ days in a row → "Mon–Thu"). */
export const formatDays = formatRepeatDays

/** The routine fields needed to decide scheduling. `created_at` is optional. */
export type SchedulableItem = Pick<RoutineItem, 'days' | 'active'> & { created_at?: string }

/**
 * True when a routine item is due on this day: it's active, its weekday is ticked,
 * and (when created_at is known) it already existed that day.
 */
export function isScheduledOn(item: SchedulableItem, date: DateKey, timeZone: string = DEFAULT_TIME_ZONE): boolean {
  if (!item.active || !item.days[dayIndex(date)]) return false
  if (item.created_at && toDateKey(new Date(item.created_at), timeZone) > date) return false
  return true
}

export type TodayRoutineInput = Pick<RoutineItem, 'id' | 'title' | 'days' | 'time' | 'active'> & {
  end_time?: string | null
  created_at?: string
  position?: number
  notes?: string | null
}
export type TodayCheckInput = Pick<RoutineCheck, 'routine_item_id' | 'date' | 'done'> &
  Partial<Pick<RoutineCheck, 'miss_reason'>>
export type TodayTaskInput = Pick<Task, 'id' | 'title' | 'time' | 'due_date' | 'status' | 'tag' | 'priority'> & {
  end_time?: string | null
  position?: number
  notes?: string | null
}

/**
 * Everything for one day in a single sorted list:
 * routine items scheduled that day + one-off tasks due that day.
 * "Not done" (✗) = a dropped task, or a routine item with a miss reason; they stay in the list.
 */
export function buildTodayItems(
  routineItems: readonly TodayRoutineInput[],
  checks: readonly TodayCheckInput[],
  tasks: readonly TodayTaskInput[],
  date: DateKey,
  timeZone: string = DEFAULT_TIME_ZONE,
): TodayItem[] {
  const dayChecks = checks.filter((c) => c.date === date)
  const doneIds = new Set(dayChecks.filter((c) => c.done).map((c) => c.routine_item_id))
  const missedIds = new Set(dayChecks.filter((c) => !c.done && c.miss_reason).map((c) => c.routine_item_id))

  const routine: TodayItem[] = routineItems
    .filter((item) => isScheduledOn(item, date, timeZone))
    .map((item) => ({
      kind: 'routine',
      id: item.id,
      title: item.title,
      time: toHHMM(item.time),
      ...(item.end_time ? { endTime: toHHMM(item.end_time) } : {}),
      done: doneIds.has(item.id),
      missed: missedIds.has(item.id),
      days: [...item.days],
      ...(item.notes ? { notes: item.notes } : {}),
      ...(item.position === undefined ? {} : { position: item.position }),
    }))

  const oneOff: TodayItem[] = tasks
    .filter((task) => task.due_date === date)
    .map((task) => ({
      kind: 'task',
      id: task.id,
      title: task.title,
      time: toHHMM(task.time),
      ...(task.end_time ? { endTime: toHHMM(task.end_time) } : {}),
      done: task.status === 'done',
      missed: task.status === 'dropped',
      ...(task.notes ? { notes: task.notes } : {}),
      tag: task.tag,
      priority: task.priority,
      ...(task.position === undefined ? {} : { position: task.position }),
    }))

  return sortTodayItems([...routine, ...oneOff])
}
