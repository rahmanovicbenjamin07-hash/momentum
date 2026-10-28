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

export type TodayRoutineInput = Pick<RoutineItem, 'id' | 'title' | 'days' | 'time' | 'active'> & { created_at?: string }
export type TodayCheckInput = Pick<RoutineCheck, 'routine_item_id' | 'date' | 'done'>
export type TodayTaskInput = Pick<Task, 'id' | 'title' | 'time' | 'due_date' | 'status' | 'tag' | 'priority'>

/**
 * Everything for one day in a single sorted list:
 * routine items scheduled that day + one-off tasks due that day (dropped tasks are left out).
 */
export function buildTodayItems(
  routineItems: readonly TodayRoutineInput[],
  checks: readonly TodayCheckInput[],
  tasks: readonly TodayTaskInput[],
  date: DateKey,
  timeZone: string = DEFAULT_TIME_ZONE,
): TodayItem[] {
  const doneIds = new Set(checks.filter((c) => c.date === date && c.done).map((c) => c.routine_item_id))

  const routine: TodayItem[] = routineItems
    .filter((item) => isScheduledOn(item, date, timeZone))
    .map((item) => ({
      kind: 'routine',
      id: item.id,
      title: item.title,
      time: toHHMM(item.time),
      done: doneIds.has(item.id),
      days: [...item.days],
    }))

  const oneOff: TodayItem[] = tasks
    .filter((task) => task.due_date === date && task.status !== 'dropped')
    .map((task) => ({
      kind: 'task',
      id: task.id,
      title: task.title,
      time: toHHMM(task.time),
      done: task.status === 'done',
      tag: task.tag,
      priority: task.priority,
    }))

  return sortTodayItems([...routine, ...oneOff])
}
