import { useMemo } from 'react'
import { useRoutineChecks, useRoutineItems } from '@/api/routine'
import { useTasksForDates } from '@/api/tasks'
import { addDays, weekDays, type DateKey, type WeekStartsOn } from '@/lib/dates'
import { weekColumns, type WeekColumn } from '@/lib/week'
import { useUserToday } from './useUserToday'

export type WeekData = {
  today: DateKey
  timeZone: string
  weekStartsOn: WeekStartsOn
  /** Undefined while loading. */
  columns: WeekColumn[] | undefined
  isError: boolean
  refetch: () => void
}

/**
 * Everything Week view needs for the week starting on `first`. Uses the same caches as
 * Today (tasks per day, routine checks), so ticking something on one page shows on the other.
 */
export function useWeekData(first: DateKey): WeekData {
  const { today, timeZone, weekStartsOn } = useUserToday()
  const days = useMemo(() => weekDays(first, weekStartsOn), [first, weekStartsOn])

  const routine = useRoutineItems()
  const checks = useRoutineChecks(first, addDays(first, 6))
  const tasks = useTasksForDates(days)

  const columns = useMemo(() => {
    if (!routine.data || !checks.data || !tasks.data) return undefined
    return weekColumns({
      day: first,
      today,
      timeZone,
      weekStartsOn,
      routineItems: routine.data,
      checks: checks.data,
      tasks: tasks.data,
    })
  }, [first, today, timeZone, weekStartsOn, routine.data, checks.data, tasks.data])

  return {
    today,
    timeZone,
    weekStartsOn,
    columns,
    isError: routine.isError || checks.isError || tasks.isError,
    refetch: () => {
      void routine.refetch()
      void checks.refetch()
      void tasks.refetch()
    },
  }
}
