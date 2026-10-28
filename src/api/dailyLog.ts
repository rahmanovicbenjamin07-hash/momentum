import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import type { DateKey } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { DailyLog } from '@/schemas/today'
import { queryKeys } from './keys'
import { invalidateWhenIdle, newRowBase, requireUserId } from './optimistic'

const dailyLogMutationKey = ['dailyLog'] as const

/** The note + energy for one day, or null if nothing was saved yet. */
export function useDailyLog(date: DateKey) {
  return useQuery({
    queryKey: queryKeys.today.dailyLog(date),
    queryFn: async (): Promise<DailyLog | null> => {
      const { data, error } = await supabase.from('daily_logs').select('*').eq('date', date).maybeSingle()
      if (error) throw error
      return data as DailyLog | null
    },
  })
}

/** Leave a field out to keep what's saved. An empty note is stored as null. */
export type DailyLogChange = {
  date: DateKey
  note?: string
  energy?: number | null
}

/** Only the fields that were given, ready for the database. Pure. */
export function toDailyLogPatch(change: DailyLogChange): Partial<Pick<DailyLog, 'note' | 'energy'>> {
  const patch: Partial<Pick<DailyLog, 'note' | 'energy'>> = {}
  if (change.note !== undefined) patch.note = change.note === '' ? null : change.note
  if (change.energy !== undefined) patch.energy = change.energy
  return patch
}

/**
 * Creates or updates the day's log (one row per day). The cache updates right
 * away; debounce calls from the textarea in the component (autosave).
 */
export function useSaveDailyLog() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationKey: dailyLogMutationKey,
    mutationFn: async (change: DailyLogChange): Promise<DailyLog> => {
      const { data, error } = await supabase
        .from('daily_logs')
        .upsert(
          { user_id: requireUserId(user?.id), date: change.date, ...toDailyLogPatch(change) },
          { onConflict: 'user_id,date' },
        )
        .select()
        .single()
      if (error) throw error
      return data as DailyLog
    },
    onMutate: async (change) => {
      const key = queryKeys.today.dailyLog(change.date)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<DailyLog | null>(key)
      const patch = toDailyLogPatch(change)
      queryClient.setQueryData<DailyLog | null>(key, (old) =>
        old
          ? { ...old, ...patch }
          : { ...newRowBase(user?.id ?? ''), date: change.date, note: null, energy: null, ...patch },
      )
      return { previous }
    },
    onError: (_error, change, context) => {
      if (context) queryClient.setQueryData(queryKeys.today.dailyLog(change.date), context.previous)
      toast.error("Couldn't save your daily note. Try again.")
    },
    onSettled: (_data, _error, change) =>
      invalidateWhenIdle(queryClient, dailyLogMutationKey, queryKeys.today.dailyLog(change.date)),
  })
}
