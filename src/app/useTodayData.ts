import { useMemo } from 'react'
import { useRoutineChecks, useRoutineItems } from '@/api/routine'
import { useDailyCompletion } from '@/api/stats'
import { useTasksForDate, useTasksForDates } from '@/api/tasks'
import { addDays, weekDays, type DateKey, type WeekStartsOn } from '@/lib/dates'
import { checksRange, deriveTodayView, streakRange, type TodayView } from './todayData'
import { useUserToday } from './useUserToday'

export type TodayData = {
  today: DateKey
  selected: DateKey
  timeZone: string
  /** 1 = weeks start on Monday, 0 = Sunday (profile setting). */
  weekStartsOn: WeekStartsOn
  /** Undefined while loading. */
  view: TodayView | undefined
  isError: boolean
  refetch: () => void
}

/** Loads everything the Today page (and the sidebar badge/streak) needs. `selected` defaults to today. */
export function useTodayData(selectedDay?: DateKey): TodayData {
  const { today, timeZone, weekStartsOn } = useUserToday()
  const selected = selectedDay ?? today
  const range = checksRange(today, selected, weekStartsOn)
  const week = useMemo(() => weekDays(today, weekStartsOn), [today, weekStartsOn])

  const routine = useRoutineItems()
  const checks = useRoutineChecks(range.from, range.to)
  const dayTasks = useTasksForDate(selected)
  const weekTasks = useTasksForDates(week)
  const tomorrowTasks = useTasksForDate(addDays(today, 1))
  const streakDays = streakRange(today)
  const history = useDailyCompletion(streakDays.from, streakDays.to)

  const view = useMemo(() => {
    if (!routine.data || !checks.data || !dayTasks.data || !weekTasks.data || !tomorrowTasks.data || !history.data) {
      return undefined
    }
    return deriveTodayView({
      today,
      selected,
      timeZone,
      weekStartsOn,
      routineItems: routine.data,
      checks: checks.data,
      tasks: [...dayTasks.data, ...weekTasks.data, ...tomorrowTasks.data],
      history: history.data,
    })
  }, [
    today,
    selected,
    timeZone,
    weekStartsOn,
    routine.data,
    checks.data,
    dayTasks.data,
    weekTasks.data,
    tomorrowTasks.data,
    history.data,
  ])

  return {
    today,
    selected,
    timeZone,
    weekStartsOn,
    view,
    isError:
      routine.isError || checks.isError || dayTasks.isError || weekTasks.isError || tomorrowTasks.isError || history.isError,
    refetch: () => {
      void routine.refetch()
      void checks.refetch()
      void dayTasks.refetch()
      void weekTasks.refetch()
      void tomorrowTasks.refetch()
      void history.refetch()
    },
  }
}
