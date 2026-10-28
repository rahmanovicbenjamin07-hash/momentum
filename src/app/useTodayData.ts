import { useMemo } from 'react'
import { useRoutineChecks, useRoutineItems } from '@/api/routine'
import { useTasksForDate, useTasksForDates } from '@/api/tasks'
import { weekDays, type DateKey } from '@/lib/dates'
import { checksRange, deriveTodayView, type TodayView } from './todayData'
import { useUserToday } from './useUserToday'

export type TodayData = {
  today: DateKey
  selected: DateKey
  timeZone: string
  /** Undefined while loading. */
  view: TodayView | undefined
  isError: boolean
  refetch: () => void
}

/** Loads everything the Today page (and the sidebar badge/streak) needs. `selected` defaults to today. */
export function useTodayData(selectedDay?: DateKey): TodayData {
  const { today, timeZone } = useUserToday()
  const selected = selectedDay ?? today
  const range = checksRange(today, selected)
  const week = useMemo(() => weekDays(today), [today])

  const routine = useRoutineItems()
  const checks = useRoutineChecks(range.from, range.to)
  const dayTasks = useTasksForDate(selected)
  const weekTasks = useTasksForDates(week)

  const view = useMemo(() => {
    if (!routine.data || !checks.data || !dayTasks.data || !weekTasks.data) return undefined
    return deriveTodayView({
      today,
      selected,
      timeZone,
      routineItems: routine.data,
      checks: checks.data,
      checksFrom: range.from,
      tasks: [...dayTasks.data, ...weekTasks.data],
    })
  }, [today, selected, timeZone, routine.data, checks.data, dayTasks.data, weekTasks.data, range.from])

  return {
    today,
    selected,
    timeZone,
    view,
    isError: routine.isError || checks.isError || dayTasks.isError || weekTasks.isError,
    refetch: () => {
      void routine.refetch()
      void checks.refetch()
      void dayTasks.refetch()
      void weekTasks.refetch()
    },
  }
}
