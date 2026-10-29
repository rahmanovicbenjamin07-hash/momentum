/**
 * Goals page: the user's goals, their progress (per month, or the values typed
 * in for hand-updated goals) and the open deals that can count towards a money goal.
 * Writes are optimistic (the screen changes at once and rolls back with a toast if saving fails).
 */
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type MutateOptions,
  type QueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import { getToday, type DateKey } from '@/lib/dates'
import type { Point } from '@/lib/goalChart'
import { manualProgress } from '@/lib/manualGoal'
import { bestMonth, groupByMonth, runningTotal, type MonthValue } from '@/lib/metrics'
import { supabase } from '@/lib/supabase'
import type { Goal, GoalType, GoalUpdate, GoalUpdateFormValues, NewGoalFormValues } from '@/schemas/goals'
import { queryKeys, type ContactFilters } from './keys'
import {
  invalidateWhenIdle,
  newRowBase,
  patchCachedLists,
  patchCachedValue,
  requireUserId,
  restoreCache,
  type CacheSnapshot,
} from './optimistic'

const goalsKey = queryKeys.goals.goals()
const goalsMutationKey = ['goals', 'goals'] as const

type Rollback = { snapshot: CacheSnapshot }

/** A goal's progress: one value per month (only months with data, oldest first) and where it stands now. */
export type GoalSeries = {
  months: MonthValue[]
  /** total goal: start value + everything added up; level goal: the best single month; manual: the latest value. */
  current: number
  /** Hand-updated goals only: their pace, chart line and the values typed in (newest first). */
  manual?: {
    pace: number
    points: Point[]
    updates: GoalUpdate[]
    lastUpdate: DateKey | null
  }
}

/** Stages that count as "open" in the pipeline. */
export const OPEN_DEAL_STAGES = ['contacted', 'replied', 'meeting', 'proposal'] as const
export type OpenDeal = {
  id: string
  name: string
  stage: NonNullable<ContactFilters['stage']>
  value: number
}

/** Fields that can be changed on an existing goal (the Goals page uses include_pipeline). */
export type GoalPatch = Partial<
  Pick<
    Goal,
    | 'title'
    | 'short_label'
    | 'type'
    | 'source_kind'
    | 'source_id'
    | 'unit'
    | 'target'
    | 'start_value'
    | 'start_date'
    | 'deadline'
    | 'include_pipeline'
  >
>

// ===========================================================================
// Pure helpers (tested)
// ===========================================================================

/** Routine ticks per month: each done day counts as 1. */
export function routineMonths(doneDates: readonly DateKey[]): MonthValue[] {
  return groupByMonth(doneDates.map((date) => ({ entry_date: date, value: 1, note: null })))
}

/** Where a goal stands: total = start value + sum of all months, level = best month. */
export function goalCurrent(type: GoalType, months: readonly MonthValue[], startValue = 0): number {
  if (type === 'level') return bestMonth(months)?.value ?? 0
  return startValue + (runningTotal(months).at(-1)?.total ?? 0)
}

/** A hand-updated goal's series from its typed-in values (any order). */
export function manualSeries(goal: Goal, updates: readonly GoalUpdate[], today: DateKey): GoalSeries {
  const progress = manualProgress({ startDate: goal.start_date, startValue: goal.start_value, updates, today })
  return {
    months: [],
    current: progress.current,
    manual: {
      pace: progress.pace,
      points: progress.points,
      updates: [...updates].sort((a, b) => b.date.localeCompare(a.date)),
      lastUpdate: progress.lastUpdate,
    },
  }
}

// ===========================================================================
// Goals
// ===========================================================================

/** The user's goals, oldest first. */
export function useGoals() {
  return useQuery({
    queryKey: goalsKey,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase.from('goals').select('*').order('created_at')
      if (error) throw error
      return data as Goal[]
    },
    staleTime: 5 * 60_000,
  })
}

/** Adds a hand-updated goal from the "New goal" form; `mutateAsync` resolves with the new goal. */
export function useCreateGoal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const mutation = useMutation({
    mutationKey: goalsMutationKey,
    mutationFn: async (row: Goal): Promise<Goal> => {
      const { error } = await supabase.from('goals').insert({
        id: row.id,
        title: row.title,
        short_label: row.short_label,
        type: row.type,
        source_kind: row.source_kind,
        source_id: row.source_id,
        unit: row.unit,
        target: row.target,
        start_value: row.start_value,
        start_date: row.start_date,
        deadline: row.deadline,
        include_pipeline: row.include_pipeline,
      })
      if (error) throw error
      return row
    },
    onMutate: async (row): Promise<Rollback> => ({
      snapshot: await patchCachedLists<Goal>(queryClient, goalsKey, (list) => [...list, row]),
    }),
    onError: (_error, _row, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't add the goal. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, goalsMutationKey, goalsKey),
  })

  const toRow = (values: NewGoalFormValues): Goal => ({
    ...newRowBase(requireUserId(user?.id)),
    title: values.title,
    short_label: values.short_label,
    type: 'total',
    source_kind: 'manual',
    source_id: null,
    unit: values.unit,
    target: values.target,
    start_value: values.start_value,
    start_date: values.start_date,
    deadline: values.deadline,
    include_pipeline: false,
  })

  return {
    ...mutation,
    mutate: (values: NewGoalFormValues, options?: MutateOptions<Goal, Error, Goal, Rollback>) =>
      mutation.mutate(toRow(values), options),
    mutateAsync: (values: NewGoalFormValues, options?: MutateOptions<Goal, Error, Goal, Rollback>) =>
      mutation.mutateAsync(toRow(values), options),
  }
}

/** Changes a goal, e.g. { id, patch: { include_pipeline: true } } for the "Include pipeline" switch. */
export function useUpdateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: goalsMutationKey,
    mutationFn: async ({ id, patch }: { id: string; patch: GoalPatch }) => {
      const { error } = await supabase.from('goals').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }): Promise<Rollback> => ({
      snapshot: await patchCachedLists<Goal>(queryClient, goalsKey, (list) =>
        list.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      ),
    }),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the goal. Try again.")
    },
    // The source or start date may have changed, so refresh the series too.
    onSettled: () => invalidateWhenIdle(queryClient, goalsMutationKey, queryKeys.goals.all),
  })
}

/** Deletes a goal and its typed-in updates (metric / routine data stays). */
export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: goalsMutationKey,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id): Promise<Rollback> => ({
      snapshot: await patchCachedLists<Goal>(queryClient, goalsKey, (list) => list.filter((g) => g.id !== id)),
    }),
    onError: (_error, _id, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't delete the goal. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, goalsMutationKey, goalsKey),
  })
}

// ===========================================================================
// Progress
// ===========================================================================

/**
 * A goal's progress from its start date up to today (Europe/Sarajevo):
 *   manual goal  → the values typed in (goal_updates);
 *   metric goal  → the metric's entries added up per month, on top of the start value;
 *   routine goal → days the routine item was ticked done, per month.
 */
export async function fetchGoalSeries(goal: Goal): Promise<GoalSeries> {
  const today = getToday()
  if (goal.source_kind === 'manual' || goal.source_id === null) {
    const { data, error } = await supabase.from('goal_updates').select('*').eq('goal_id', goal.id).order('date')
    if (error) throw error
    return manualSeries(goal, data as GoalUpdate[], today)
  }
  let months: MonthValue[]
  if (goal.source_kind === 'metric') {
    const { data, error } = await supabase
      .from('metric_entries')
      .select('entry_date, value, note')
      .eq('metric_id', goal.source_id)
      .gte('entry_date', goal.start_date)
      .lte('entry_date', today)
      .order('entry_date')
    if (error) throw error
    months = groupByMonth(data)
  } else {
    const { data, error } = await supabase
      .from('routine_checks')
      .select('date')
      .eq('routine_item_id', goal.source_id)
      .eq('done', true)
      .gte('date', goal.start_date)
      .lte('date', today)
      .order('date')
    if (error) throw error
    months = routineMonths(data.map((row) => row.date))
  }
  return { months, current: goalCurrent(goal.type, months, goal.start_value) }
}

// ===========================================================================
// Values typed in by hand (manual goals)
// ===========================================================================

const goalUpdatesMutationKey = ['goals', 'updates'] as const

/** Rewrites one goal's cached series with a changed list of updates. */
async function patchManualSeries(
  queryClient: QueryClient,
  goal: Goal,
  change: (updates: GoalUpdate[]) => GoalUpdate[],
): Promise<Rollback> {
  const snapshot = await patchCachedValue<GoalSeries>(queryClient, queryKeys.goals.goalSeries(goal.id), (series) =>
    series ? manualSeries(goal, change(series.manual?.updates ?? []), getToday()) : undefined,
  )
  return { snapshot }
}

type SaveUpdateInput = { goal: Goal; values: GoalUpdateFormValues }

/**
 * Saves where a hand-updated goal stands on a day ("today I have €4,200").
 * One value per day: saving the same day again replaces it.
 */
export function useSaveGoalUpdate() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const mutation = useMutation({
    mutationKey: goalUpdatesMutationKey,
    mutationFn: async ({ row }: { goal: Goal; row: GoalUpdate }) => {
      const { error } = await supabase
        .from('goal_updates')
        .upsert({ id: row.id, goal_id: row.goal_id, date: row.date, value: row.value, note: row.note }, { onConflict: 'goal_id,date' })
      if (error) throw error
    },
    onMutate: ({ goal, row }): Promise<Rollback> =>
      patchManualSeries(queryClient, goal, (updates) => [...updates.filter((u) => u.date !== row.date), row]),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the update. Try again.")
    },
    onSettled: (_data, _error, { goal }) =>
      invalidateWhenIdle(queryClient, goalUpdatesMutationKey, queryKeys.goals.goalSeries(goal.id)),
  })

  const toRow = ({ goal, values }: SaveUpdateInput): { goal: Goal; row: GoalUpdate } => {
    // Same day again: keep that row's id, so the cache and the database agree.
    const cached = queryClient.getQueryData<GoalSeries>(queryKeys.goals.goalSeries(goal.id))
    const sameDay = cached?.manual?.updates.find((u) => u.date === values.date)
    const base = newRowBase(requireUserId(user?.id))
    return {
      goal,
      row: { ...base, id: sameDay?.id ?? base.id, goal_id: goal.id, date: values.date, value: values.value, note: values.note },
    }
  }

  return {
    ...mutation,
    mutate: (input: SaveUpdateInput) => mutation.mutate(toRow(input)),
    mutateAsync: (input: SaveUpdateInput) => mutation.mutateAsync(toRow(input)),
  }
}

/** Removes one typed-in value (e.g. a typo). */
export function useDeleteGoalUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: goalUpdatesMutationKey,
    mutationFn: async ({ id }: { goal: Goal; id: string }) => {
      const { error } = await supabase.from('goal_updates').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: ({ goal, id }): Promise<Rollback> =>
      patchManualSeries(queryClient, goal, (updates) => updates.filter((u) => u.id !== id)),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't delete the update. Try again.")
    },
    onSettled: (_data, _error, { goal }) =>
      invalidateWhenIdle(queryClient, goalUpdatesMutationKey, queryKeys.goals.goalSeries(goal.id)),
  })
}

/** One goal's progress (see fetchGoalSeries). */
export function useGoalSeries(goal: Goal | undefined) {
  return useQuery({
    queryKey: queryKeys.goals.goalSeries(goal?.id ?? ''),
    queryFn: () => (goal ? fetchGoalSeries(goal) : Promise.resolve({ months: [], current: 0 })),
    enabled: Boolean(goal),
  })
}

/** Every goal's progress at once (goal chips, Reports). Same cache as useGoalSeries. data is undefined until all have loaded. */
export function useGoalsSeries(goals: readonly Goal[] | undefined) {
  return useQueries({
    queries: (goals ?? []).map((goal) => ({
      queryKey: queryKeys.goals.goalSeries(goal.id),
      queryFn: () => fetchGoalSeries(goal),
    })),
    combine: (results) => ({
      data: goals && results.every((r) => r.data !== undefined)
        ? new Map((goals ?? []).map((g, i) => [g.id, results[i]?.data as GoalSeries]))
        : undefined,
      isError: results.some((r) => r.isError),
      refetch: () => Promise.all(results.map((r) => r.refetch())),
    }),
  })
}

/** Open deals with a value: contacts in contacted / replied / meeting / proposal with deal_value set. */
export function useOpenDeals() {
  return useQuery({
    queryKey: queryKeys.goals.openDeals(),
    queryFn: async (): Promise<OpenDeal[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, stage, deal_value')
        .in('stage', [...OPEN_DEAL_STAGES])
        .not('deal_value', 'is', null)
        .order('deal_value', { ascending: false })
      if (error) throw error
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        stage: c.stage as OpenDeal['stage'],
        value: c.deal_value ?? 0,
      }))
    },
  })
}
