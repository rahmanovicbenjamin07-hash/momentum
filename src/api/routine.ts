import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import type { TablesUpdate } from '@/lib/database.types'
import type { DateKey } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { MissReason, RoutineCheck, RoutineItem } from '@/schemas/today'
import { queryKeys } from './keys'
import {
  invalidateWhenIdle,
  newRowBase,
  nextPosition,
  patchCachedLists,
  restoreCache,
  toDbTime,
  type CacheSnapshot,
} from './optimistic'

const itemsKey = queryKeys.today.routineItems()
const checksPrefix = queryKeys.today.routineChecksAll()
const itemsMutationKey = ['routineItems'] as const
const checksMutationKey = ['routineChecks'] as const

type Rollback = { snapshot: CacheSnapshot }

// ===========================================================================
// Routine items
// ===========================================================================

/** Active routine items, in list order. Removed items (active = false) are left out. */
export function useRoutineItems() {
  return useQuery({
    queryKey: itemsKey,
    queryFn: async (): Promise<RoutineItem[]> => {
      const { data, error } = await supabase
        .from('routine_items')
        .select('*')
        .eq('active', true)
        .order('position')
        .order('created_at')
      if (error) throw error
      return data as RoutineItem[]
    },
  })
}

export type NewRoutineItem = {
  title: string
  /** Mon..Sun */
  days: boolean[]
  /** "HH:MM", or null for Anytime. */
  time: string | null
}

export function useCreateRoutineItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: itemsMutationKey,
    mutationFn: async (input: NewRoutineItem): Promise<RoutineItem> => {
      const position = nextPosition(queryClient.getQueryData<RoutineItem[]>(itemsKey))
      const { data, error } = await supabase
        .from('routine_items')
        .insert({ title: input.title.trim(), days: input.days, time: toDbTime(input.time), position })
        .select()
        .single()
      if (error) throw error
      return data as RoutineItem
    },
    onSuccess: (item) => {
      queryClient.setQueryData<RoutineItem[]>(itemsKey, (old) => (old ? [...old, item] : old))
    },
    onError: () => {
      toast.error("Couldn't add the repeating task. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, itemsMutationKey, itemsKey),
  })
}

export type RoutineItemChange = {
  id: string
  /** Mon..Sun */
  days?: boolean[]
  /** "HH:MM", or null to clear (Anytime). Leave out to keep the current time. */
  time?: string | null
}

/** Edit-repeating mode: change days and/or time. Optimistic. */
export function useUpdateRoutineItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: itemsMutationKey,
    mutationFn: async ({ id, ...change }: RoutineItemChange) => {
      const { error } = await supabase.from('routine_items').update(toItemPatch(change)).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...change }): Promise<Rollback> => {
      const patch = toItemPatch(change)
      const snapshot = await patchCachedLists<RoutineItem>(queryClient, itemsKey, (list) =>
        list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      )
      return { snapshot }
    },
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the change. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, itemsMutationKey, itemsKey),
  })
}

function toItemPatch(change: Omit<RoutineItemChange, 'id'>): Pick<TablesUpdate<'routine_items'>, 'days' | 'time'> {
  const patch: Pick<TablesUpdate<'routine_items'>, 'days' | 'time'> = {}
  if (change.days !== undefined) patch.days = change.days
  if (change.time !== undefined) patch.time = toDbTime(change.time)
  return patch
}

/**
 * Removes a routine item from the list. It's a soft delete (active = false),
 * so past ticks stay in the history. Optimistic.
 */
export function useRemoveRoutineItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: itemsMutationKey,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routine_items').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id): Promise<Rollback> => {
      const snapshot = await patchCachedLists<RoutineItem>(queryClient, itemsKey, (list) =>
        list.filter((item) => item.id !== id),
      )
      return { snapshot }
    },
    onError: (_error, _id, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't remove it. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, itemsMutationKey, itemsKey),
  })
}

// ===========================================================================
// Routine checks
// ===========================================================================

/** Checks for every day from `from` to `to` (both included). */
export function useRoutineChecks(from: DateKey, to: DateKey) {
  return useQuery({
    queryKey: queryKeys.today.routineChecks(from, to),
    queryFn: async (): Promise<RoutineCheck[]> => {
      const { data, error } = await supabase
        .from('routine_checks')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date')
      if (error) throw error
      return data as RoutineCheck[]
    },
  })
}

/** The new state of one routine item on one day. */
export type CheckChange = {
  routineItemId: string
  date: DateKey
  done: boolean
  missReason: MissReason | null
}

/** True when a routineChecks(from, to) cache key covers `date`. */
export function checksKeyCovers(key: QueryKey, date: DateKey): boolean {
  const [, , from, to] = key
  return typeof from === 'string' && typeof to === 'string' && from <= date && date <= to
}

/** Updates the matching check in a cached list, or adds a new one. Pure. */
export function applyCheckChange(
  list: RoutineCheck[],
  change: CheckChange,
  makeBase: () => Pick<RoutineCheck, 'id' | 'user_id' | 'created_at'>,
): RoutineCheck[] {
  const patch = { done: change.done, miss_reason: change.missReason }
  const index = list.findIndex((c) => c.routine_item_id === change.routineItemId && c.date === change.date)
  if (index === -1) {
    return [...list, { ...makeBase(), routine_item_id: change.routineItemId, date: change.date, ...patch }]
  }
  return list.map((check, i) => (i === index ? { ...check, ...patch } : check))
}

/** Shared by tick and miss-reason: one upsert per (item, day), optimistic, rollback + toast on error. */
function useRoutineCheckMutation<TInput>(toChange: (input: TInput) => CheckChange, errorMessage: string) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationKey: checksMutationKey,
    mutationFn: async (input: TInput) => {
      const change = toChange(input)
      const { error } = await supabase.from('routine_checks').upsert(
        {
          routine_item_id: change.routineItemId,
          date: change.date,
          done: change.done,
          miss_reason: change.missReason,
        },
        { onConflict: 'routine_item_id,date' },
      )
      if (error) throw error
    },
    onMutate: async (input): Promise<Rollback> => {
      const change = toChange(input)
      const userId = user?.id ?? ''
      const snapshot = await patchCachedLists<RoutineCheck>(queryClient, checksPrefix, (list, key) =>
        checksKeyCovers(key, change.date) ? applyCheckChange(list, change, () => newRowBase(userId)) : list,
      )
      return { snapshot }
    },
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(errorMessage)
    },
    onSettled: () => invalidateWhenIdle(queryClient, checksMutationKey, checksPrefix),
  })
}

export type ToggleRoutineCheckInput = { routineItemId: string; date: DateKey; done: boolean }

/** Tick / untick a routine item for a day. Instant; rolls back with a toast if saving fails. */
export function useToggleRoutineCheck() {
  return useRoutineCheckMutation(
    ({ routineItemId, date, done }: ToggleRoutineCheckInput): CheckChange => ({
      routineItemId,
      date,
      done,
      missReason: null,
    }),
    "Couldn't save that tick. Try again.",
  )
}

export type SetMissReasonInput = { routineItemId: string; date: DateKey; reason: MissReason }

/** "Yesterday you missed X": store why on that day's check (not done). */
export function useSetMissReason() {
  return useRoutineCheckMutation(
    ({ routineItemId, date, reason }: SetMissReasonInput): CheckChange => ({
      routineItemId,
      date,
      done: false,
      missReason: reason,
    }),
    "Couldn't save the reason. Try again.",
  )
}
