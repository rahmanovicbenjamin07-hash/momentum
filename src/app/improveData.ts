/**
 * Improvements page data that isn't a plain list: the week's numbers (live),
 * stage changes in a week, and measuring an experiment's metric over a period.
 */
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/keys'
import { useRoutineChecks, useRoutineItems } from '@/api/routine'
import { splitRange } from '@/api/stats'
import { useTasksForDates } from '@/api/tasks'
import { useWeekTouches } from '@/api/touches'
import type { WeeklyGoalRow } from '@/components/improve/WeeklyGoalsCard'
import { addDays, daysBetween, weekDays, type DateKey } from '@/lib/dates'
import { targetProgress, weekNumbers } from '@/lib/review'
import { supabase } from '@/lib/supabase'
import { weeklyTargetsSchema, type ExperimentMetric, type StatsSnapshot, type WeeklyTargets } from '@/schemas/improve'

/** Leads moved to another stage in from…to (local days; a day either side is fetched, weekNumbers filters). */
function useStageChanges(from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: [...queryKeys.improve.all, 'stageChanges', from, to] as const,
    queryFn: async (): Promise<{ to_stage: string; changed_at: string }[]> => {
      const { data, error } = await supabase
        .from('stage_history')
        .select('to_stage, changed_at')
        .gte('changed_at', `${addDays(from, -1)}T00:00:00Z`)
        .lt('changed_at', `${addDays(to, 2)}T00:00:00Z`)
      if (error) throw error
      return data
    },
  })
}

/** The week's numbers (Mon–Sun), worked out live from tasks, routine, touches and stage changes. */
export function useWeekNumbers(weekStart: DateKey, timeZone: string): { data: StatsSnapshot | undefined; isError: boolean } {
  const sunday = addDays(weekStart, 6)
  const tasks = useTasksForDates(weekDays(weekStart))
  const items = useRoutineItems()
  const checks = useRoutineChecks(weekStart, sunday)
  const touches = useWeekTouches(weekStart)
  const stages = useStageChanges(weekStart, sunday)
  const ready = tasks.data && items.data && checks.data && touches.data && stages.data
  return {
    data: ready
      ? weekNumbers({
          weekStart,
          tasks: tasks.data ?? [],
          routineItems: items.data ?? [],
          routineChecks: checks.data ?? [],
          touches: touches.data ?? [],
          contactsStageHistory: stages.data ?? [],
          timeZone,
        })
      : undefined,
    isError: tasks.isError || items.isError || checks.isError || touches.isError || stages.isError,
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * An experiment metric over from…to (both included), using the stats SQL functions:
 * reply_rate / task_completion / routine_rate in percent, outreach_sent per week.
 * null when there was nothing to measure.
 */
export async function measureMetric(metric: ExperimentMetric, from: DateKey, to: DateKey): Promise<number | null> {
  if (to < from) return null
  if (metric === 'reply_rate' || metric === 'outreach_sent') {
    const { data, error } = await supabase.rpc('stats_reply_rates', { p_from: from, p_to: to })
    if (error) throw error
    const channels = data.filter((r) => r.dimension === 'channel')
    const sent = channels.reduce((n, r) => n + r.sent, 0)
    if (metric === 'outreach_sent') return round1((sent / (daysBetween(from, to) + 1)) * 7)
    return sent > 0 ? round1((channels.reduce((n, r) => n + r.replies, 0) / sent) * 100) : null
  }
  if (metric === 'task_completion') {
    const { data, error } = await supabase.rpc('stats_daily_completion', { p_from: from, p_to: to })
    if (error) throw error
    const total = data.reduce((n, r) => n + r.total, 0)
    return total > 0 ? round1((data.reduce((n, r) => n + r.done, 0) / total) * 100) : null
  }
  const parts = await Promise.all(
    splitRange(from, to, 31).map(async ([a, b]) => {
      const { data, error } = await supabase.rpc('stats_routine_days', { p_from: a, p_to: b })
      if (error) throw error
      return data
    }),
  )
  const rows = parts.flat().filter((r) => r.scheduled)
  return rows.length ? round1((rows.filter((r) => r.done).length / rows.length) * 100) : null
}

/** The 14 days before an experiment starts: its "before" period. */
export function beforePeriod(startDate: DateKey): { from: DateKey; to: DateKey } {
  return { from: addDays(startDate, -14), to: addDays(startDate, -1) }
}

/** From the start up to today (or the end, if earlier): the "during" period. */
export function duringPeriod(exp: { start_date: DateKey; end_date: DateKey }, today: DateKey): { from: DateKey; to: DateKey } {
  return { from: exp.start_date, to: exp.end_date < today ? exp.end_date : today }
}

/** A metric over a period, kept in the cache (the running experiment card). */
export function useMeasure(metric: ExperimentMetric | undefined, from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: [...queryKeys.stats.all, 'measure', metric, from, to] as const,
    queryFn: () => measureMetric(metric ?? 'reply_rate', from, to),
    enabled: Boolean(metric),
  })
}

export const DEFAULT_WEEKLY_TARGETS: WeeklyTargets = { outreaches: 20, task_completion: 80, meetings: 2 }

/** profiles.weekly_targets (jsonb) → targets, or the defaults when it's missing or broken. */
export function parseTargets(json: unknown): WeeklyTargets {
  const result = weeklyTargetsSchema.safeParse(json)
  return result.success ? result.data : DEFAULT_WEEKLY_TARGETS
}

/** "This week's goals": each target vs this week's numbers. */
export function weeklyGoalRows(targets: WeeklyTargets, numbers: StatsSnapshot): WeeklyGoalRow[] {
  const outreach = targetProgress(numbers.outreach_sent, targets.outreaches)
  const completion = targetProgress(numbers.task_completion, targets.task_completion)
  const meetings = targetProgress(numbers.meetings, targets.meetings)
  return [
    {
      label: `${targets.outreaches} ${targets.outreaches === 1 ? 'outreach' : 'outreaches'}`,
      valueText: `${numbers.outreach_sent} / ${targets.outreaches}`,
      ...outreach,
    },
    {
      label: `${targets.task_completion}% task completion`,
      valueText: `${numbers.task_completion}%${completion.onTrack ? ' · on track' : ''}`,
      ...completion,
    },
    {
      label: `${targets.meetings} ${targets.meetings === 1 ? 'meeting' : 'meetings'} booked`,
      valueText: `${numbers.meetings} / ${targets.meetings}`,
      ...meetings,
    },
  ]
}
