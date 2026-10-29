/**
 * Read-only range queries the Stats page needs on top of src/api (insights and
 * metric cards). Keys live under ['stats', …], so every write that refreshes
 * the Stats page (queryKeys.stats.all) refreshes these too.
 */
import { useQuery } from '@tanstack/react-query'
import { normaliseYears, yearBounds } from '@/api/metrics'
import { queryKeys } from '@/api/keys'
import { addDays, toDateKey, type DateKey } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { MetricEntry } from '@/schemas/stats'
import type { TaskStatus } from '@/schemas/today'

const extra = (...parts: unknown[]) => [...queryKeys.stats.all, 'extra', ...parts] as const

export type SentMessage = { occurred_at: string; got_reply: boolean }

/** Sent messages whose calendar day (in the user's time zone) is from…to. */
export function useSentMessages(from: DateKey, to: DateKey, timeZone: string) {
  return useQuery({
    queryKey: extra('sentMessages', from, to, timeZone),
    queryFn: async (): Promise<SentMessage[]> => {
      // Fetch a day either side in UTC, then keep the local days that fall in the range.
      const { data, error } = await supabase
        .from('touches')
        .select('occurred_at, got_reply')
        .eq('direction', 'sent')
        .gte('occurred_at', `${addDays(from, -1)}T00:00:00Z`)
        .lt('occurred_at', `${addDays(to, 2)}T00:00:00Z`)
        .order('occurred_at')
      if (error) throw error
      return data.filter((m) => {
        const day = toDateKey(new Date(m.occurred_at), timeZone)
        return day >= from && day <= to
      })
    },
  })
}

export type TaskLite = { due_date: DateKey; time: string | null; status: TaskStatus }

/** Tasks due from…to (dropped ones left out, like the Today page). */
export function useTasksInRange(from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: extra('tasks', from, to),
    queryFn: async (): Promise<TaskLite[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('due_date, time, status')
        .gte('due_date', from)
        .lte('due_date', to)
        .neq('status', 'dropped')
      if (error) throw error
      return data as TaskLite[]
    },
  })
}

/** Energy from the daily notes, from…to. */
export function useEnergyInRange(from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: extra('energy', from, to),
    queryFn: async (): Promise<{ date: DateKey; energy: number | null }[]> => {
      const { data, error } = await supabase.from('daily_logs').select('date, energy').gte('date', from).lte('date', to)
      if (error) throw error
      return data
    },
  })
}

/** Ticks of one routine item from…to (for the wake-up insight). */
export function useItemChecks(itemId: string | undefined, from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: extra('itemChecks', itemId, from, to),
    queryFn: async (): Promise<{ date: DateKey; done: boolean }[]> => {
      const { data, error } = await supabase
        .from('routine_checks')
        .select('date, done')
        .eq('routine_item_id', itemId ?? '')
        .gte('date', from)
        .lte('date', to)
      if (error) throw error
      return data
    },
    enabled: Boolean(itemId),
  })
}

/**
 * Entries of every metric in these years, for the metric cards and reports.
 * Same prefix as useMetricEntries, so logging a value refetches it.
 */
export function useAllMetricEntries(years: readonly number[]) {
  const sorted = normaliseYears(years)
  return useQuery({
    queryKey: queryKeys.stats.metricEntries('all', sorted),
    queryFn: async (): Promise<MetricEntry[]> => {
      const { from, to } = yearBounds(sorted)
      const { data, error } = await supabase
        .from('metric_entries')
        .select('*')
        .gte('entry_date', from)
        .lt('entry_date', to)
        .order('entry_date')
      if (error) throw error
      return data as MetricEntry[]
    },
  })
}
