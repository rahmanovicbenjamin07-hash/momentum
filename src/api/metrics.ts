/**
 * Stats → My metrics: the user's metrics and their logged values.
 * Writes are optimistic (the screen changes at once and rolls back with a toast if saving fails).
 */
import { useMutation, useQuery, useQueryClient, type MutateOptions, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import { monthOf, type MonthKey } from '@/lib/metrics'
import { supabase } from '@/lib/supabase'
import { entryDateForMonth, type LogValueFormValues, type Metric, type MetricEntry, type NewMetricFormValues } from '@/schemas/stats'
import { useUpdateContact } from './contacts'
import { queryKeys } from './keys'
import {
  invalidateWhenIdle,
  newRowBase,
  nextPosition,
  patchCachedLists,
  requireUserId,
  restoreCache,
  type CacheSnapshot,
} from './optimistic'

/** The 3 metrics every user gets (metrics.builtin in the database). */
export type BuiltinMetric = 'money_earned' | 'trainings' | 'hours_worked'

/** A metric as stored: the schema fields plus its order and built-in key. */
export type MetricRow = Metric & { builtin: BuiltinMetric | null; position: number }

const metricsKey = queryKeys.stats.metrics()
const entriesPrefix = queryKeys.stats.metricEntriesAll()
const metricsMutationKey = ['stats', 'metrics'] as const
const entriesMutationKey = ['stats', 'metricEntries'] as const

type Rollback = { snapshot: CacheSnapshot }

// ===========================================================================
// Pure helpers (tested)
// ===========================================================================

/** First day of the month after "yyyy-MM": "2026-12" → "2027-01-01". */
export function nextMonthStart(month: MonthKey): string {
  const year = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`
}

/** [2026, 2025, 2026] → [2025, 2026]: same years in the same order, so query keys match. */
export function normaliseYears(years: readonly number[]): number[] {
  return [...new Set(years)].sort((a, b) => a - b)
}

/** Entries of these years: entry_date >= from and < to. */
export function yearBounds(years: readonly number[]): { from: string; to: string } {
  const sorted = normaliseYears(years)
  const first = sorted[0] ?? 0
  const last = sorted.at(-1) ?? first
  return { from: `${first}-01-01`, to: `${last + 1}-01-01` }
}

/**
 * "Log a value" saves one total for the month: it replaces the hand-logged entries of
 * that metric and month (daily/weekly ones too). Entries from won deals are kept.
 */
export function replaceMonthValue(list: readonly MetricEntry[], row: MetricEntry): MetricEntry[] {
  const month = monthOf(row.entry_date)
  const kept = list.filter(
    (e) => !(e.metric_id === row.metric_id && e.contact_id === null && monthOf(e.entry_date) === month),
  )
  return [...kept, row].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
}

/** The query key shape is ['stats', 'metricEntries', metricId, years]. */
function entriesKeyMatches(key: QueryKey, metricId: string, entryDate: string): boolean {
  const years = key[3]
  return key[2] === metricId && Array.isArray(years) && years.includes(Number(entryDate.slice(0, 4)))
}

/** Postgres "unique violation", e.g. a second metric with the same name. */
function isDuplicate(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

// ===========================================================================
// Metrics
// ===========================================================================

/** The user's metrics in their order (built-ins first). */
export function useMetrics() {
  return useQuery({
    queryKey: metricsKey,
    queryFn: async (): Promise<MetricRow[]> => {
      const { data, error } = await supabase.from('metrics').select('*').order('position').order('created_at')
      if (error) throw error
      return data as MetricRow[]
    },
    staleTime: 5 * 60_000,
  })
}

/** Adds a metric from the "New metric" form. `mutateAsync` resolves with the new metric (e.g. to select it). */
export function useCreateMetric() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const mutation = useMutation({
    mutationKey: metricsMutationKey,
    mutationFn: async (row: MetricRow): Promise<MetricRow> => {
      const { error } = await supabase.from('metrics').insert({
        id: row.id,
        name: row.name,
        unit: row.unit,
        log_every: row.log_every,
        yearly_goal: row.yearly_goal,
        position: row.position,
      })
      if (error) throw error
      return row
    },
    onMutate: async (row): Promise<Rollback> => ({
      snapshot: await patchCachedLists<MetricRow>(queryClient, metricsKey, (list) => [...list, row]),
    }),
    onError: (error, _row, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(isDuplicate(error) ? 'You already have a metric with that name.' : "Couldn't add the metric. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, metricsMutationKey, metricsKey),
  })

  const toRow = (values: NewMetricFormValues): MetricRow => ({
    ...newRowBase(requireUserId(user?.id)),
    name: values.name,
    unit: values.unit,
    log_every: values.log_every,
    yearly_goal: values.yearly_goal ?? null,
    builtin: null,
    position: nextPosition(queryClient.getQueryData<MetricRow[]>(metricsKey)),
  })

  return {
    ...mutation,
    mutate: (values: NewMetricFormValues, options?: MutateOptions<MetricRow, Error, MetricRow, Rollback>) =>
      mutation.mutate(toRow(values), options),
    mutateAsync: (values: NewMetricFormValues, options?: MutateOptions<MetricRow, Error, MetricRow, Rollback>) =>
      mutation.mutateAsync(toRow(values), options),
  }
}

// ===========================================================================
// Entries
// ===========================================================================

/**
 * All entries of one metric in the given calendar years (e.g. [2025, 2026] for
 * "compare with last year"), oldest first. Group them with `groupByMonth`.
 */
export function useMetricEntries(metricId: string | undefined, years: readonly number[]) {
  const sorted = normaliseYears(years)
  return useQuery({
    queryKey: queryKeys.stats.metricEntries(metricId ?? '', sorted),
    queryFn: async (): Promise<MetricEntry[]> => {
      const { from, to } = yearBounds(sorted)
      const { data, error } = await supabase
        .from('metric_entries')
        .select('*')
        .eq('metric_id', metricId ?? '')
        .gte('entry_date', from)
        .lt('entry_date', to)
        .order('entry_date')
      if (error) throw error
      return data as MetricEntry[]
    },
    enabled: Boolean(metricId) && sorted.length > 0,
  })
}

export type LogValueInput = { metricId: string; values: LogValueFormValues }

/**
 * "Log a value": saves the month's total, replacing what was hand-logged for that month
 * (won-deal entries stay). The new row is saved first, then the old ones removed,
 * so a failed save never loses data.
 */
export function useLogValue() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const mutation = useMutation({
    mutationKey: entriesMutationKey,
    mutationFn: async (row: MetricEntry): Promise<MetricEntry> => {
      const { error } = await supabase.from('metric_entries').insert({
        id: row.id,
        metric_id: row.metric_id,
        entry_date: row.entry_date,
        value: row.value,
        note: row.note,
      })
      if (error) throw error

      const month = monthOf(row.entry_date)
      const { error: cleanupError } = await supabase
        .from('metric_entries')
        .delete()
        .eq('metric_id', row.metric_id)
        .is('contact_id', null)
        .gte('entry_date', `${month}-01`)
        .lt('entry_date', nextMonthStart(month))
        .neq('id', row.id)
      if (cleanupError) throw cleanupError
      return row
    },
    onMutate: async (row): Promise<Rollback> => ({
      snapshot: await patchCachedLists<MetricEntry>(queryClient, entriesPrefix, (list, key) =>
        entriesKeyMatches(key, row.metric_id, row.entry_date) ? replaceMonthValue(list, row) : list,
      ),
    }),
    onError: (_error, _row, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the value. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, entriesMutationKey, entriesPrefix),
  })

  const toRow = ({ metricId, values }: LogValueInput): MetricEntry => ({
    ...newRowBase(requireUserId(user?.id)),
    metric_id: metricId,
    entry_date: entryDateForMonth(values.month),
    value: values.value,
    note: values.note ?? null,
    contact_id: null,
  })

  return {
    ...mutation,
    mutate: (input: LogValueInput, options?: MutateOptions<MetricEntry, Error, MetricEntry, Rollback>) =>
      mutation.mutate(toRow(input), options),
    mutateAsync: (input: LogValueInput, options?: MutateOptions<MetricEntry, Error, MetricEntry, Rollback>) =>
      mutation.mutateAsync(toRow(input), options),
  }
}

/** Deletes one entry (by id). */
export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: entriesMutationKey,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metric_entries').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id): Promise<Rollback> => ({
      snapshot: await patchCachedLists<MetricEntry>(queryClient, entriesPrefix, (list) => list.filter((e) => e.id !== id)),
    }),
    onError: (_error, _id, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't delete the entry. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, entriesMutationKey, entriesPrefix),
  })
}

// ===========================================================================
// Won deal → Money earned
// ===========================================================================

export type SaveWonDealInput = {
  contactId: string
  /** Shown as the entry's note: "Won: Fitbox Gym". */
  contactName: string
  amount: number
  /** Month paid, "yyyy-MM". */
  month: MonthKey
  /** The "Add to Money earned" checkbox. */
  addToMoneyEarned: boolean
}

/** The Money earned entry for a won deal (without id / user_id / created_at). */
export function dealEntryFields(input: SaveWonDealInput, metricId: string) {
  return {
    metric_id: metricId,
    contact_id: input.contactId,
    entry_date: entryDateForMonth(input.month),
    value: input.amount,
    note: `Won: ${input.contactName}`.slice(0, 500),
  }
}

/** The id of the user's "Money earned" metric, from the cache when loaded. null if it was deleted. */
async function moneyEarnedId(queryClient: QueryClient): Promise<string | null> {
  const cached = queryClient.getQueryData<MetricRow[]>(metricsKey)?.find((m) => m.builtin === 'money_earned')
  if (cached) return cached.id
  const { data, error } = await supabase.from('metrics').select('id').eq('builtin', 'money_earned').maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

/**
 * Adds a won deal to (or removes it from) Money earned. One entry per deal: saving
 * again replaces its amount and month; unticking "Add to Money earned" removes it.
 */
export function useSyncDealEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: entriesMutationKey,
    mutationFn: async (input: SaveWonDealInput) => {
      const metricId = await moneyEarnedId(queryClient)
      if (!metricId) {
        if (input.addToMoneyEarned) throw new Error('No "Money earned" metric. Add one in Stats → My metrics.')
        return
      }
      const { error } = input.addToMoneyEarned
        ? await supabase
            .from('metric_entries')
            .upsert(dealEntryFields(input, metricId), { onConflict: 'metric_id,contact_id' })
        : await supabase.from('metric_entries').delete().eq('metric_id', metricId).eq('contact_id', input.contactId)
      if (error) throw error
    },
    onSettled: () => invalidateWhenIdle(queryClient, entriesMutationKey, entriesPrefix),
  })
}

/**
 * Contact page → green Won panel → Save: stores amount + month on the lead, then
 * adds it to Money earned (or removes it when the box is unticked).
 * Throws an Error with a message for the panel to show.
 */
export function useSaveWonDeal() {
  const updateContact = useUpdateContact()
  const syncEntry = useSyncDealEntry()

  const mutateAsync = async (input: SaveWonDealInput): Promise<void> => {
    try {
      await updateContact.mutateAsync({
        id: input.contactId,
        patch: { won_amount: input.amount, won_month: entryDateForMonth(input.month) },
      })
    } catch (error) {
      throw new Error("Couldn't save the deal. Try again.", { cause: error })
    }
    try {
      await syncEntry.mutateAsync(input)
    } catch (error) {
      throw new Error(
        error instanceof Error && error.message.startsWith('No "Money earned"')
          ? `Deal saved. ${error.message}`
          : "Deal saved, but couldn't update Money earned. Try again.",
        { cause: error },
      )
    }
  }

  return { mutateAsync, isPending: updateContact.isPending || syncEntry.isPending }
}
