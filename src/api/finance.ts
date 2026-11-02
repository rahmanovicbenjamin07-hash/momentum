/**
 * Finance page: money entries (income and expenses) and the starting savings.
 * Entries change optimistically: the list updates at once and rolls back on an error.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import { toEur } from '@/lib/finance'
import { supabase } from '@/lib/supabase'
import {
  financeEntrySchema,
  financeSettingsSchema,
  type FinanceEntry,
  type FinanceEntryFormValues,
  type FinanceSettings,
  type StartingSavingsFormValues,
} from '@/schemas/finance'
import { queryKeys } from './keys'
import { invalidateWhenIdle, newRowBase, patchCachedLists, requireUserId, restoreCache, type CacheSnapshot } from './optimistic'

type Rollback = { snapshot: CacheSnapshot }

const PAGE = 1000
const entriesKey = queryKeys.finance.entries()

/** Newest day first; within a day, the newest entry first. */
function sortEntries(list: FinanceEntry[]): FinanceEntry[] {
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

/** Every money entry (all years: savings add up from the start). Pages past the 1000-row limit. */
export function useFinanceEntries() {
  return useQuery({
    queryKey: entriesKey,
    queryFn: async (): Promise<FinanceEntry[]> => {
      const rows: FinanceEntry[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('finance_entries')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, from + PAGE - 1)
        if (error) throw error
        rows.push(...data.map((row) => financeEntrySchema.parse(row)))
        if (data.length < PAGE) return rows
      }
    },
  })
}

function entryFields(values: FinanceEntryFormValues) {
  return {
    date: values.date,
    kind: values.kind,
    name: values.name,
    amount: values.amount,
    currency: values.currency,
    category: values.category,
    note: values.note,
  }
}

/** Adds an entry: mutate(formValues). */
export function useCreateFinanceEntry() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const mutation = useMutation({
    mutationKey: entriesKey,
    mutationFn: async (row: FinanceEntry): Promise<FinanceEntry> => {
      const { amount_eur: _computed, user_id: _owner, created_at: _created, ...insert } = row
      const { error } = await supabase.from('finance_entries').insert(insert)
      if (error) throw error
      return row
    },
    onMutate: async (row): Promise<Rollback> => ({
      snapshot: await patchCachedLists<FinanceEntry>(queryClient, entriesKey, (list) => sortEntries([row, ...list])),
    }),
    onError: (_error, _row, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save it. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, entriesKey, entriesKey),
  })
  const build = (values: FinanceEntryFormValues): FinanceEntry => ({
    ...newRowBase(requireUserId(user?.id)),
    ...entryFields(values),
    amount_eur: toEur(values.amount, values.currency),
  })
  return {
    ...mutation,
    mutate: (values: FinanceEntryFormValues) => mutation.mutate(build(values)),
    mutateAsync: (values: FinanceEntryFormValues) => mutation.mutateAsync(build(values)),
  }
}

/** Changes an entry: mutate({ id, values }). */
export function useUpdateFinanceEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: entriesKey,
    mutationFn: async ({ id, values }: { id: string; values: FinanceEntryFormValues }) => {
      const { error } = await supabase.from('finance_entries').update(entryFields(values)).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, values }): Promise<Rollback> => ({
      snapshot: await patchCachedLists<FinanceEntry>(queryClient, entriesKey, (list) =>
        sortEntries(
          list.map((row) =>
            row.id === id ? { ...row, ...entryFields(values), amount_eur: toEur(values.amount, values.currency) } : row,
          ),
        ),
      ),
    }),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the change. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, entriesKey, entriesKey),
  })
}

/**
 * Deletes an entry. `remove(entry)` returns an undo function that adds the same row back
 * (same id, so it lands where it was).
 */
export function useDeleteFinanceEntry() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationKey: entriesKey,
    mutationFn: async (entry: FinanceEntry) => {
      const { error } = await supabase.from('finance_entries').delete().eq('id', entry.id)
      if (error) throw error
    },
    onMutate: async (entry): Promise<Rollback> => ({
      snapshot: await patchCachedLists<FinanceEntry>(queryClient, entriesKey, (list) => list.filter((row) => row.id !== entry.id)),
    }),
    onError: (_error, _entry, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't delete it. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, entriesKey, entriesKey),
  })
  const restore = useMutation({
    mutationKey: entriesKey,
    mutationFn: async (entry: FinanceEntry) => {
      const { amount_eur: _computed, user_id: _owner, ...insert } = entry
      const { error } = await supabase.from('finance_entries').insert(insert)
      if (error) throw error
    },
    onMutate: async (entry): Promise<Rollback> => ({
      snapshot: await patchCachedLists<FinanceEntry>(queryClient, entriesKey, (list) => sortEntries([entry, ...list])),
    }),
    onError: (_error, _entry, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't bring it back. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, entriesKey, entriesKey),
  })
  return {
    ...mutation,
    remove: (entry: FinanceEntry) => {
      mutation.mutate(entry)
      return () => restore.mutate(entry)
    },
  }
}

/** The starting savings, or null before they are set. */
export function useFinanceSettings() {
  return useQuery({
    queryKey: queryKeys.finance.settings(),
    queryFn: async (): Promise<FinanceSettings | null> => {
      const { data, error } = await supabase.from('finance_settings').select('*').maybeSingle()
      if (error) throw error
      return data ? financeSettingsSchema.parse(data) : null
    },
  })
}

/** Saves "I had X saved on <date>" (one row per user). */
export function useSaveStartingSavings() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (values: StartingSavingsFormValues): Promise<FinanceSettings> => {
      const { data, error } = await supabase
        .from('finance_settings')
        .upsert(
          {
            user_id: requireUserId(user?.id),
            starting_savings: values.amount,
            starting_currency: values.currency,
            starting_date: values.date,
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single()
      if (error) throw error
      return financeSettingsSchema.parse(data)
    },
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.finance.settings(), settings),
    onError: () => toast.error("Couldn't save your starting savings. Try again."),
  })
}
