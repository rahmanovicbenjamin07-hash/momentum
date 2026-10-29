/**
 * Read-only hooks for the Stats page. Each one calls one SQL function from
 * supabase/migrations/20261029090100_stats_views.sql (they run with the user's
 * rights, so RLS applies).
 *
 * Ranges are calendar days 'yyyy-MM-dd', both days included. Where a range end
 * may be null, null means "no limit" (all time).
 */
import { useQuery } from '@tanstack/react-query'
import type { Database } from '@/lib/database.types'
import { addDays, type DateKey } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import { queryKeys } from './keys'

type Fns = Database['public']['Functions']

/** One day: tasks + routine done / total, percent null when there was nothing to do. */
export type DailyCompletionRow = Fns['stats_daily_completion']['Returns'][number]
/** One funnel step (contacted … won) with % of the step before. */
export type FunnelStepRow = Fns['stats_outreach_funnel']['Returns'][number]
/** dimension 'source' | 'channel' | 'template'; key null = no template; label = template name. */
export type ReplyRateRow = Fns['stats_reply_rates']['Returns'][number]
/** Same shape as reply rates, with won deals and € amount. */
export type RevenueRow = Fns['stats_revenue']['Returns'][number]
/** tag null = tasks without a tag. */
export type TagCountRow = Fns['stats_tasks_by_tag']['Returns'][number]
/** One routine item on one scheduled day (or a day it was ticked anyway). */
export type RoutineDayRow = Fns['stats_routine_days']['Returns'][number]

/** The API returns at most 1000 rows per call, so long routine ranges are fetched in parts of this many days. */
export const ROUTINE_DAYS_CHUNK = 31

/**
 * Splits from…to (both included) into back-to-back parts of at most `maxDays` days.
 * splitRange('2026-01-01', '2026-01-10', 4) → [01–04], [05–08], [09–10].
 */
export function splitRange(from: DateKey, to: DateKey, maxDays: number): [DateKey, DateKey][] {
  const parts: [DateKey, DateKey][] = []
  for (let start = from; start <= to; ) {
    const end = addDays(start, maxDays - 1)
    const last = end < to ? end : to
    parts.push([start, last])
    start = addDays(last, 1)
  }
  return parts
}

/** Tasks + routine completion per day (line chart, heatmap, KPIs). */
export function useDailyCompletion(from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: queryKeys.stats.dailyCompletion(from, to),
    queryFn: async (): Promise<DailyCompletionRow[]> => {
      const { data, error } = await supabase.rpc('stats_daily_completion', { p_from: from, p_to: to })
      if (error) throw error
      return data
    },
  })
}

/** Contacts first reached in the range and how far they got (5 steps, in order). */
export function useOutreachFunnel(from: DateKey | null, to: DateKey | null) {
  return useQuery({
    queryKey: queryKeys.stats.outreachFunnel(from, to),
    queryFn: async (): Promise<FunnelStepRow[]> => {
      const { data, error } = await supabase.rpc('stats_outreach_funnel', { p_from: from, p_to: to })
      if (error) throw error
      return data
    },
  })
}

/** Sent messages, replies and reply % by source, channel and template. Filter by `dimension`. */
export function useReplyRates(from: DateKey | null, to: DateKey | null) {
  return useQuery({
    queryKey: queryKeys.stats.replyRates(from, to),
    queryFn: async (): Promise<ReplyRateRow[]> => {
      const { data, error } = await supabase.rpc('stats_reply_rates', { p_from: from, p_to: to })
      if (error) throw error
      return data
    },
  })
}

/** Won deals and € won by source, channel and template. Filter by `dimension`. */
export function useRevenue(from: DateKey | null, to: DateKey | null) {
  return useQuery({
    queryKey: queryKeys.stats.revenue(from, to),
    queryFn: async (): Promise<RevenueRow[]> => {
      const { data, error } = await supabase.rpc('stats_revenue', { p_from: from, p_to: to })
      if (error) throw error
      return data
    },
  })
}

/** Tasks completed per tag, most first. */
export function useTasksByTag(from: DateKey | null, to: DateKey | null) {
  return useQuery({
    queryKey: queryKeys.stats.tasksByTag(from, to),
    queryFn: async (): Promise<TagCountRow[]> => {
      const { data, error } = await supabase.rpc('stats_tasks_by_tag', { p_from: from, p_to: to })
      if (error) throw error
      return data
    },
  })
}

/**
 * Every routine item on every scheduled day, oldest day first.
 * Fetched in parts of ROUTINE_DAYS_CHUNK days so a whole year fits under the 1000-row limit.
 */
export function useRoutineDays(from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: queryKeys.stats.routineDays(from, to),
    queryFn: async (): Promise<RoutineDayRow[]> => {
      const parts = await Promise.all(
        splitRange(from, to, ROUTINE_DAYS_CHUNK).map(async ([partFrom, partTo]) => {
          const { data, error } = await supabase.rpc('stats_routine_days', { p_from: partFrom, p_to: partTo })
          if (error) throw error
          return data
        }),
      )
      return parts.flat()
    },
  })
}
