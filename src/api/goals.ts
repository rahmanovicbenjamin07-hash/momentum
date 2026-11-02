/**
 * Goals page: objectives (the goal in words), their key results (the `goals`
 * table: a number, steps, a habit or done / not done), each key result's
 * progress, and the open deals that can count towards a money goal.
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
import {
  GOAL_LIMITS,
  type Goal,
  type GoalType,
  type GoalUpdate,
  type GoalUpdateFormValues,
  type KeyResultDraft,
  type Milestone,
  type MilestoneFormValues,
  type NewObjectiveFormValues,
  type Objective,
  type ObjectiveFormValues,
} from '@/schemas/goals'
import { queryKeys, type ContactFilters } from './keys'
import {
  invalidateWhenIdle,
  newRowBase,
  nextPosition,
  patchCachedLists,
  patchCachedValue,
  requireUserId,
  restoreCache,
  type CacheSnapshot,
} from './optimistic'

const goalsKey = queryKeys.goals.goals()
const objectivesKey = queryKeys.goals.objectives()
const goalsMutationKey = ['goals', 'goals'] as const

type Rollback = { snapshot: CacheSnapshot }

/** A key result's progress: one value per month (only months with data, oldest first) and where it stands now. */
export type GoalSeries = {
  months: MonthValue[]
  /**
   * number, total: start value + everything added up; level: the best single month; manual: the latest value.
   * habit: days ticked; milestones: steps done; done: 1 or 0.
   */
  current: number
  /** Hand-updated number key results only: their pace, chart line and the values typed in (newest first). */
  manual?: {
    pace: number
    points: Point[]
    updates: GoalUpdate[]
    lastUpdate: DateKey | null
  }
  /** Habit key results: the days it was done (oldest first); `updates` are the ticks saved by hand. */
  habit?: { doneDates: DateKey[]; updates: GoalUpdate[] }
  /** Milestones key results: the steps, in position order. */
  milestones?: Milestone[]
}

/** Stages that count as "open" in the pipeline. */
export const OPEN_DEAL_STAGES = ['contacted', 'replied', 'meeting', 'proposal'] as const
export type OpenDeal = {
  id: string
  name: string
  stage: NonNullable<ContactFilters['stage']>
  value: number
}

/** Fields that can be changed on an existing key result. */
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
    | 'completed_on'
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

/** A hand-updated number key result's series from its typed-in values (any order). */
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

/** A habit's series from the days it was done (routine ticks or ticks saved by hand). */
export function habitSeries(doneDates: readonly DateKey[], updates: readonly GoalUpdate[] = []): GoalSeries {
  const sorted = [...new Set(doneDates)].sort()
  return { months: [], current: sorted.length, habit: { doneDates: sorted, updates: [...updates] } }
}

/** A milestones key result's series: its steps in order, current = steps done. */
export function milestonesSeries(milestones: readonly Milestone[]): GoalSeries {
  const sorted = [...milestones].sort((a, b) => a.position - b.position)
  return { months: [], current: sorted.filter((m) => m.done_on !== null).length, milestones: sorted }
}

/** Ticks saved by hand → series, for the kinds that store them in goal_updates. */
function seriesFromUpdates(goal: Goal, updates: readonly GoalUpdate[], today: DateKey): GoalSeries {
  return goal.kind === 'habit' ? habitSeries(updates.map((u) => u.date), updates) : manualSeries(goal, updates, today)
}

/** A new key result's row: what each kind stores in the shared columns (see the objectives migration). */
export function keyResultRow(
  draft: KeyResultDraft,
  objectiveId: string,
  base: { id: string; user_id: string; created_at: string },
): Goal {
  const common = {
    ...base,
    objective_id: objectiveId,
    kind: draft.kind,
    completed_on: null,
    title: draft.title,
    short_label: draft.title.slice(0, GOAL_LIMITS.shortLabel).trim(),
    type: 'total' as const,
    start_date: draft.start_date,
    deadline: draft.deadline,
    include_pipeline: false,
    source_kind: 'manual' as const,
    source_id: null,
    unit: null,
    start_value: 0,
    target: 1,
  }
  switch (draft.kind) {
    case 'number':
      return { ...common, unit: draft.unit, start_value: draft.start_value, target: draft.target }
    case 'habit':
      return draft.routine_item_id
        ? { ...common, source_kind: 'routine', source_id: draft.routine_item_id, target: draft.per_week }
        : { ...common, target: draft.per_week }
    case 'milestones':
    case 'done':
      return common
  }
}

/** The steps of a new milestones key result, in the order typed. */
function milestoneRows(draft: KeyResultDraft, goal: Goal, newBase: () => ReturnType<typeof newRowBase>): Milestone[] {
  if (draft.kind !== 'milestones') return []
  return draft.steps.map((step, position) => ({
    ...newBase(),
    goal_id: goal.id,
    title: step.title,
    due_date: step.due_date,
    done_on: null,
    position,
  }))
}

/** The series a brand-new key result starts with (so its card shows at once). */
function emptySeries(goal: Goal, milestones: readonly Milestone[]): GoalSeries {
  if (goal.kind === 'milestones') return milestonesSeries(milestones)
  if (goal.kind === 'habit' && goal.source_kind === 'manual') return habitSeries([])
  if (goal.kind === 'number' && goal.source_kind === 'manual') return manualSeries(goal, [], getToday())
  return { months: [], current: 0 }
}

// ===========================================================================
// Objectives
// ===========================================================================

/** The user's objectives, oldest first. */
export function useObjectives() {
  return useQuery({
    queryKey: objectivesKey,
    queryFn: async (): Promise<Objective[]> => {
      const { data, error } = await supabase.from('objectives').select('*').order('created_at')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

/** Saves a key result and its steps (if any). */
async function insertKeyResult(goal: Goal, milestones: readonly Milestone[]) {
  // keyResultRow always sets it; null only comes from old backups.
  if (!goal.objective_id) throw new Error('A key result needs a goal.')
  const { error } = await supabase.from('goals').insert({
    id: goal.id,
    objective_id: goal.objective_id,
    kind: goal.kind,
    title: goal.title,
    short_label: goal.short_label,
    type: goal.type,
    source_kind: goal.source_kind,
    source_id: goal.source_id,
    unit: goal.unit,
    target: goal.target,
    start_value: goal.start_value,
    start_date: goal.start_date,
    deadline: goal.deadline,
    include_pipeline: goal.include_pipeline,
  })
  if (error) throw error
  if (milestones.length === 0) return
  const { error: stepsError } = await supabase.from('goal_milestones').insert(
    milestones.map((m) => ({ id: m.id, goal_id: m.goal_id, title: m.title, due_date: m.due_date, position: m.position })),
  )
  if (stepsError) throw stepsError
}

type NewKeyResult = { goal: Goal; milestones: Milestone[] }

/** Shows a new key result at once: in the goals list, with its starting series. */
async function addKeyResultToCache(queryClient: QueryClient, { goal, milestones }: NewKeyResult): Promise<CacheSnapshot> {
  const listSnapshot = await patchCachedLists<Goal>(queryClient, goalsKey, (list) => [...list, goal])
  const seriesSnapshot = await patchCachedValue<GoalSeries>(queryClient, queryKeys.goals.goalSeries(goal.id), () =>
    emptySeries(goal, milestones),
  )
  return [...listSnapshot, ...seriesSnapshot]
}

/** "New goal": the objective and its first key result. `mutateAsync` resolves with the new objective. */
export function useCreateObjective() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  type Input = { objective: Objective } & NewKeyResult
  const mutation = useMutation({
    mutationKey: goalsMutationKey,
    mutationFn: async ({ objective, goal, milestones }: Input): Promise<Objective> => {
      const { error } = await supabase.from('objectives').insert({ id: objective.id, title: objective.title, why: objective.why })
      if (error) throw error
      await insertKeyResult(goal, milestones)
      return objective
    },
    onMutate: async (input): Promise<Rollback> => {
      const objectives = await patchCachedLists<Objective>(queryClient, objectivesKey, (list) => [...list, input.objective])
      return { snapshot: [...objectives, ...(await addKeyResultToCache(queryClient, input))] }
    },
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't add the goal. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, goalsMutationKey, objectivesKey, goalsKey),
  })

  const toInput = (values: NewObjectiveFormValues): Input => {
    const newBase = () => newRowBase(requireUserId(user?.id))
    const objective: Objective = { ...newBase(), title: values.objective.title, why: values.objective.why }
    const goal = keyResultRow(values.keyResult, objective.id, newBase())
    return { objective, goal, milestones: milestoneRows(values.keyResult, goal, newBase) }
  }

  return {
    ...mutation,
    mutateAsync: (values: NewObjectiveFormValues, options?: MutateOptions<Objective, Error, Input, Rollback>) =>
      mutation.mutateAsync(toInput(values), options),
  }
}

/** "Edit goal": the objective's name and why it matters. */
export function useUpdateObjective() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: goalsMutationKey,
    mutationFn: async ({ id, values }: { id: string; values: ObjectiveFormValues }) => {
      const { error } = await supabase.from('objectives').update(values).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, values }): Promise<Rollback> => ({
      snapshot: await patchCachedLists<Objective>(queryClient, objectivesKey, (list) =>
        list.map((o) => (o.id === id ? { ...o, ...values } : o)),
      ),
    }),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the goal. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, goalsMutationKey, objectivesKey),
  })
}

/** Deletes an objective with all its key results, their updates and steps. */
export function useDeleteObjective() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: goalsMutationKey,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('objectives').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id): Promise<Rollback> => ({
      snapshot: [
        ...(await patchCachedLists<Objective>(queryClient, objectivesKey, (list) => list.filter((o) => o.id !== id))),
        ...(await patchCachedLists<Goal>(queryClient, goalsKey, (list) => list.filter((g) => g.objective_id !== id))),
      ],
    }),
    onError: (_error, _id, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't delete the goal. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, goalsMutationKey, objectivesKey, goalsKey),
  })
}

// ===========================================================================
// Key results (the goals table)
// ===========================================================================

/** Every key result of every objective, oldest first. */
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

/** "Add key result" to an objective. `mutateAsync` resolves with the new key result. */
export function useCreateKeyResult() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  type Input = { objectiveId: string; draft: KeyResultDraft }
  const mutation = useMutation({
    mutationKey: goalsMutationKey,
    mutationFn: async ({ goal, milestones }: NewKeyResult): Promise<Goal> => {
      await insertKeyResult(goal, milestones)
      return goal
    },
    onMutate: async (input): Promise<Rollback> => ({ snapshot: await addKeyResultToCache(queryClient, input) }),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't add the key result. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, goalsMutationKey, goalsKey),
  })

  const toInput = ({ objectiveId, draft }: Input): NewKeyResult => {
    const newBase = () => newRowBase(requireUserId(user?.id))
    const goal = keyResultRow(draft, objectiveId, newBase())
    return { goal, milestones: milestoneRows(draft, goal, newBase) }
  }

  return {
    ...mutation,
    mutateAsync: (input: Input, options?: MutateOptions<Goal, Error, NewKeyResult, Rollback>) =>
      mutation.mutateAsync(toInput(input), options),
  }
}

/** Changes a key result, e.g. { include_pipeline: true } or { completed_on: today } ("Mark as done"). */
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

/** Deletes a key result with its typed-in updates and steps (metric / routine data stays). */
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
      toast.error("Couldn't delete the key result. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, goalsMutationKey, goalsKey),
  })
}

// ===========================================================================
// Progress
// ===========================================================================

/** Days a routine item was ticked done, from `from` to `to`. */
async function routineDoneDates(routineItemId: string, from: DateKey, to: DateKey): Promise<DateKey[]> {
  const { data, error } = await supabase
    .from('routine_checks')
    .select('date')
    .eq('routine_item_id', routineItemId)
    .eq('done', true)
    .gte('date', from)
    .lte('date', to)
    .order('date')
  if (error) throw error
  return data.map((row) => row.date)
}

async function goalUpdates(goalId: string): Promise<GoalUpdate[]> {
  const { data, error } = await supabase.from('goal_updates').select('*').eq('goal_id', goalId).order('date')
  if (error) throw error
  return data as GoalUpdate[]
}

/**
 * A key result's progress from its start date up to today (Europe/Sarajevo):
 *   done        → nothing to read (completed_on is on the row);
 *   milestones  → its steps;
 *   habit       → the days it was done: routine item ticks, or ticks saved by hand (goal_updates);
 *   number, manual  → the values typed in (goal_updates);
 *   number, metric  → the metric's entries added up per month, on top of the start value;
 *   number, routine → days the routine item was ticked done, per month.
 */
export async function fetchGoalSeries(goal: Goal): Promise<GoalSeries> {
  const today = getToday()
  if (goal.kind === 'done') return { months: [], current: goal.completed_on ? 1 : 0 }
  if (goal.kind === 'milestones') {
    const { data, error } = await supabase.from('goal_milestones').select('*').eq('goal_id', goal.id).order('position')
    if (error) throw error
    return milestonesSeries(data as Milestone[])
  }
  if (goal.kind === 'habit') {
    if (goal.source_kind === 'routine' && goal.source_id) {
      const to = goal.deadline < today ? goal.deadline : today
      return habitSeries(await routineDoneDates(goal.source_id, goal.start_date, to))
    }
    const ticks = await goalUpdates(goal.id)
    return habitSeries(
      ticks.map((u) => u.date),
      ticks,
    )
  }
  if (goal.source_kind === 'manual' || goal.source_id === null) {
    return manualSeries(goal, await goalUpdates(goal.id), today)
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
    months = routineMonths(await routineDoneDates(goal.source_id, goal.start_date, today))
  }
  return { months, current: goalCurrent(goal.type, months, goal.start_value) }
}

/** One key result's progress (see fetchGoalSeries). */
export function useGoalSeries(goal: Goal | undefined) {
  return useQuery({
    queryKey: queryKeys.goals.goalSeries(goal?.id ?? ''),
    queryFn: () => (goal ? fetchGoalSeries(goal) : Promise.resolve({ months: [], current: 0 })),
    enabled: Boolean(goal),
  })
}

/** Every key result's progress at once (goal chips, Reports). Same cache as useGoalSeries. data is undefined until all have loaded. */
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

// ===========================================================================
// Values and ticks saved by hand (goal_updates)
// ===========================================================================

const goalUpdatesMutationKey = ['goals', 'updates'] as const

/** Rewrites one key result's cached series with a changed list of updates. */
async function patchUpdatesSeries(
  queryClient: QueryClient,
  goal: Goal,
  change: (updates: GoalUpdate[]) => GoalUpdate[],
): Promise<Rollback> {
  const snapshot = await patchCachedValue<GoalSeries>(queryClient, queryKeys.goals.goalSeries(goal.id), (series) =>
    series ? seriesFromUpdates(goal, change(series.manual?.updates ?? series.habit?.updates ?? []), getToday()) : undefined,
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
      patchUpdatesSeries(queryClient, goal, (updates) => [...updates.filter((u) => u.date !== row.date), row]),
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
    const sameDay = (cached?.manual?.updates ?? cached?.habit?.updates)?.find((u) => u.date === values.date)
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

/** Removes one typed-in value (e.g. a typo) or one habit tick. */
export function useDeleteGoalUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: goalUpdatesMutationKey,
    mutationFn: async ({ id }: { goal: Goal; id: string }) => {
      const { error } = await supabase.from('goal_updates').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: ({ goal, id }): Promise<Rollback> =>
      patchUpdatesSeries(queryClient, goal, (updates) => updates.filter((u) => u.id !== id)),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't delete the update. Try again.")
    },
    onSettled: (_data, _error, { goal }) =>
      invalidateWhenIdle(queryClient, goalUpdatesMutationKey, queryKeys.goals.goalSeries(goal.id)),
  })
}

/**
 * Ticks (or unticks) a day on a habit you tick by hand. Ticks are goal_updates
 * with value 1. Habits linked to a routine item are ticked on Today instead.
 */
export function useToggleHabitDay() {
  const save = useSaveGoalUpdate()
  const remove = useDeleteGoalUpdate()
  const queryClient = useQueryClient()
  return {
    isPending: save.isPending || remove.isPending,
    mutate: ({ goal, date, done }: { goal: Goal; date: DateKey; done: boolean }) => {
      if (done) return save.mutate({ goal, values: { date, value: 1, note: null } })
      const cached = queryClient.getQueryData<GoalSeries>(queryKeys.goals.goalSeries(goal.id))
      const tick = cached?.habit?.updates.find((u) => u.date === date)
      if (tick) remove.mutate({ goal, id: tick.id })
    },
  }
}

// ===========================================================================
// Steps (milestones key results)
// ===========================================================================

const milestonesMutationKey = ['goals', 'milestones'] as const

/** Rewrites one key result's cached steps. */
async function patchMilestones(
  queryClient: QueryClient,
  goalId: string,
  change: (milestones: Milestone[]) => Milestone[],
): Promise<Rollback> {
  const snapshot = await patchCachedValue<GoalSeries>(queryClient, queryKeys.goals.goalSeries(goalId), (series) =>
    series ? milestonesSeries(change(series.milestones ?? [])) : undefined,
  )
  return { snapshot }
}

function useMilestoneMutation<I extends { goalId: string }>(
  write: (input: I) => Promise<void>,
  change: (input: I) => (milestones: Milestone[]) => Milestone[],
  failMessage: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: milestonesMutationKey,
    mutationFn: write,
    onMutate: (input): Promise<Rollback> => patchMilestones(queryClient, input.goalId, change(input)),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(failMessage)
    },
    onSettled: (_data, _error, { goalId }) =>
      invalidateWhenIdle(queryClient, milestonesMutationKey, queryKeys.goals.goalSeries(goalId)),
  })
}

/** "Add step": goes after the existing steps. */
export function useAddMilestone() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const mutation = useMilestoneMutation<{ goalId: string; row: Milestone }>(
    async ({ row }) => {
      const { error } = await supabase
        .from('goal_milestones')
        .insert({ id: row.id, goal_id: row.goal_id, title: row.title, due_date: row.due_date, position: row.position })
      if (error) throw error
    },
    ({ row }) => (list) => [...list, row],
    "Couldn't add the step. Try again.",
  )
  const toInput = (goalId: string, values: MilestoneFormValues) => {
    const cached = queryClient.getQueryData<GoalSeries>(queryKeys.goals.goalSeries(goalId))
    const row: Milestone = {
      ...newRowBase(requireUserId(user?.id)),
      goal_id: goalId,
      title: values.title,
      due_date: values.due_date,
      done_on: null,
      position: nextPosition(cached?.milestones),
    }
    return { goalId, row }
  }
  return {
    ...mutation,
    mutateAsync: ({ goalId, values }: { goalId: string; values: MilestoneFormValues }) =>
      mutation.mutateAsync(toInput(goalId, values)),
  }
}

/** Ticks a step done (on `doneOn`) or back to "to do" (null). */
export function useToggleMilestone() {
  return useMilestoneMutation<{ goalId: string; id: string; doneOn: DateKey | null }>(
    async ({ id, doneOn }) => {
      const { error } = await supabase.from('goal_milestones').update({ done_on: doneOn }).eq('id', id)
      if (error) throw error
    },
    ({ id, doneOn }) => (list) => list.map((m) => (m.id === id ? { ...m, done_on: doneOn } : m)),
    "Couldn't save the step. Try again.",
  )
}

export function useDeleteMilestone() {
  return useMilestoneMutation<{ goalId: string; id: string }>(
    async ({ id }) => {
      const { error } = await supabase.from('goal_milestones').delete().eq('id', id)
      if (error) throw error
    },
    ({ id }) => (list) => list.filter((m) => m.id !== id),
    "Couldn't delete the step. Try again.",
  )
}

// ===========================================================================
// Pipeline
// ===========================================================================

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
