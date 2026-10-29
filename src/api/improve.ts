/**
 * Improvements page: weekly reviews, lessons, experiments and ideas.
 * Writes are optimistic (the screen changes at once and rolls back with a toast if saving fails).
 */
import { useMutation, useQuery, useQueryClient, type MutateOptions, type QueryKey } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import { supabase } from '@/lib/supabase'
import type {
  Experiment,
  ExperimentFormValues,
  Idea,
  IdeaFormValues,
  Lesson,
  LessonFormValues,
  Review,
  ReviewFormValues,
  ReviewStatus,
  StatsSnapshot,
} from '@/schemas/improve'
import { queryKeys } from './keys'
import {
  invalidateWhenIdle,
  newRowBase,
  patchCachedLists,
  patchCachedValue,
  requireUserId,
  restoreCache,
  type CacheSnapshot,
} from './optimistic'

type Rollback = { snapshot: CacheSnapshot }
type DbResult = PromiseLike<{ error: PostgrestError | null }>

const reviewsMutationKey = ['improve', 'reviews'] as const

/** What "Save review" sends: the four answers, the week and its numbers. status defaults to 'saved' (autosave sends 'draft'). */
export type SaveReviewInput = ReviewFormValues & { week_start: string; stats_snapshot: StatsSnapshot; status?: ReviewStatus }

/** Fields that can be changed on an experiment (e.g. ending it as kept / dropped). */
export type ExperimentPatch = Partial<
  Pick<
    Experiment,
    'title' | 'hypothesis' | 'metric' | 'start_date' | 'end_date' | 'status' | 'before_value' | 'during_value' | 'result'
  >
>
export type IdeaPatch = Partial<Pick<Idea, 'text' | 'status'>>

// ===========================================================================
// Weekly reviews
// ===========================================================================

/** Newest week first. */
function sortReviews(list: Review[]): Review[] {
  return [...list].sort((a, b) => b.week_start.localeCompare(a.week_start))
}

/** All the user's reviews (drafts too), newest week first. */
export function useReviews() {
  return useQuery({
    queryKey: queryKeys.improve.reviews(),
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase.from('reviews').select('*').order('week_start', { ascending: false })
      if (error) throw error
      return data as Review[]
    },
  })
}

/** The review for one week (weekStart = that Monday), or null if there is none yet. */
export function useReview(weekStart: string) {
  return useQuery({
    queryKey: queryKeys.improve.review(weekStart),
    queryFn: async (): Promise<Review | null> => {
      const { data, error } = await supabase.from('reviews').select('*').eq('week_start', weekStart).maybeSingle()
      if (error) throw error
      return data as Review | null
    },
  })
}

/** Saves the week's review (creates it, or overwrites that week's one) as 'saved', or as a 'draft' when asked. */
export function useSaveReview() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationKey: reviewsMutationKey,
    mutationFn: async (input: SaveReviewInput): Promise<Review> => {
      const { data, error } = await supabase
        .from('reviews')
        .upsert(
          {
            user_id: requireUserId(user?.id),
            week_start: input.week_start,
            wins: input.wins,
            misses: input.misses,
            lesson: input.lesson,
            focus: input.focus,
            status: input.status ?? 'saved',
            stats_snapshot: input.stats_snapshot,
          },
          { onConflict: 'user_id,week_start' },
        )
        .select()
        .single()
      if (error) throw error
      return data as Review
    },
    onMutate: async (input): Promise<Rollback> => {
      const userId = requireUserId(user?.id)
      const merge = (existing: Review | null | undefined): Review => ({
        ...(existing ?? newRowBase(userId)),
        week_start: input.week_start,
        wins: input.wins,
        misses: input.misses,
        lesson: input.lesson,
        focus: input.focus,
        status: input.status ?? 'saved',
        stats_snapshot: input.stats_snapshot,
      })
      const one = await patchCachedValue<Review | null>(queryClient, queryKeys.improve.review(input.week_start), (r) =>
        r === undefined ? undefined : merge(r),
      )
      const list = await patchCachedLists<Review>(queryClient, queryKeys.improve.reviews(), (reviews) => {
        const existing = reviews.find((r) => r.week_start === input.week_start)
        return sortReviews([...reviews.filter((r) => r !== existing), merge(existing)])
      })
      return { snapshot: [...one, ...list] }
    },
    onSuccess: (row) => queryClient.setQueryData(queryKeys.improve.review(row.week_start), row),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the review. Try again.")
    },
    onSettled: (_row, _error, input) =>
      invalidateWhenIdle(
        queryClient,
        reviewsMutationKey,
        queryKeys.improve.reviews(),
        queryKeys.improve.review(input.week_start),
      ),
  })
}

// ===========================================================================
// Shared optimistic create / update / delete for a list table
// ===========================================================================

type ListTable = {
  key: QueryKey
  /** e.g. "lesson", used in error toasts. */
  noun: string
}

/** Adds a row built in the browser to the top of the list. `mutate` / `mutateAsync` take the form values. */
function useCreateRow<T extends { id: string }, Input>(
  table: ListTable,
  toRow: (input: Input, userId: string) => T,
  insert: (row: T) => DbResult,
) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const mutation = useMutation({
    mutationKey: table.key,
    mutationFn: async (row: T): Promise<T> => {
      const { error } = await insert(row)
      if (error) throw error
      return row
    },
    onMutate: async (row): Promise<Rollback> => ({
      snapshot: await patchCachedLists<T>(queryClient, table.key, (list) => [row, ...list]),
    }),
    onError: (_error, _row, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(`Couldn't add the ${table.noun}. Try again.`)
    },
    onSettled: () => invalidateWhenIdle(queryClient, table.key, table.key),
  })

  const build = (input: Input) => toRow(input, requireUserId(user?.id))
  return {
    ...mutation,
    mutate: (input: Input, options?: MutateOptions<T, Error, T, Rollback>) => mutation.mutate(build(input), options),
    mutateAsync: (input: Input, options?: MutateOptions<T, Error, T, Rollback>) =>
      mutation.mutateAsync(build(input), options),
  }
}

/** Changes one row: mutate({ id, patch }). */
function useUpdateRow<T extends { id: string }, Patch extends Partial<T>>(
  table: ListTable,
  update: (id: string, patch: Patch) => DbResult,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: table.key,
    mutationFn: async ({ id, patch }: { id: string; patch: Patch }) => {
      const { error } = await update(id, patch)
      if (error) throw error
    },
    onMutate: async ({ id, patch }): Promise<Rollback> => ({
      snapshot: await patchCachedLists<T>(queryClient, table.key, (list) =>
        list.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      ),
    }),
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(`Couldn't save the ${table.noun}. Try again.`)
    },
    onSettled: () => invalidateWhenIdle(queryClient, table.key, table.key),
  })
}

/** Deletes one row: mutate(id). */
function useDeleteRow<T extends { id: string }>(table: ListTable, remove: (id: string) => DbResult) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: table.key,
    mutationFn: async (id: string) => {
      const { error } = await remove(id)
      if (error) throw error
    },
    onMutate: async (id): Promise<Rollback> => ({
      snapshot: await patchCachedLists<T>(queryClient, table.key, (list) => list.filter((row) => row.id !== id)),
    }),
    onError: (_error, _id, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(`Couldn't delete the ${table.noun}. Try again.`)
    },
    onSettled: () => invalidateWhenIdle(queryClient, table.key, table.key),
  })
}

// ===========================================================================
// Lessons
// ===========================================================================

const lessonsTable: ListTable = { key: queryKeys.improve.lessons(), noun: 'lesson' }

/** Lessons, newest first. */
export function useLessons() {
  return useQuery({
    queryKey: lessonsTable.key,
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase.from('lessons').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Lesson[]
    },
  })
}

export function useCreateLesson() {
  return useCreateRow<Lesson, LessonFormValues>(
    lessonsTable,
    (values, userId) => ({ ...newRowBase(userId), area: values.area, text: values.text }),
    (row) => supabase.from('lessons').insert({ id: row.id, area: row.area, text: row.text }),
  )
}

export function useDeleteLesson() {
  return useDeleteRow(lessonsTable, (id) => supabase.from('lessons').delete().eq('id', id))
}

// ===========================================================================
// Experiments
// ===========================================================================

const experimentsTable: ListTable = { key: queryKeys.improve.experiments(), noun: 'experiment' }

/** Experiments, latest start first. */
export function useExperiments() {
  return useQuery({
    queryKey: experimentsTable.key,
    queryFn: async (): Promise<Experiment[]> => {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Experiment[]
    },
  })
}

/** Starts an experiment from the form: status 'running', no values measured yet. */
export function useCreateExperiment() {
  return useCreateRow<Experiment, ExperimentFormValues>(
    experimentsTable,
    (values, userId) => ({
      ...newRowBase(userId),
      title: values.title,
      hypothesis: values.hypothesis,
      metric: values.metric,
      start_date: values.start_date,
      end_date: values.end_date,
      status: 'running',
      before_value: null,
      during_value: null,
      result: '',
    }),
    (row) =>
      supabase.from('experiments').insert({
        id: row.id,
        title: row.title,
        hypothesis: row.hypothesis,
        metric: row.metric,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        before_value: row.before_value,
        during_value: row.during_value,
        result: row.result,
      }),
  )
}

/** e.g. mutate({ id, patch: { status: 'kept', result: 'Replies went up' } }). */
export function useUpdateExperiment() {
  return useUpdateRow<Experiment, ExperimentPatch>(experimentsTable, (id, patch) =>
    supabase.from('experiments').update(patch).eq('id', id),
  )
}

export function useDeleteExperiment() {
  return useDeleteRow(experimentsTable, (id) => supabase.from('experiments').delete().eq('id', id))
}

// ===========================================================================
// Ideas
// ===========================================================================

const ideasTable: ListTable = { key: queryKeys.improve.ideas(), noun: 'idea' }

/** Ideas, newest first. */
export function useIdeas() {
  return useQuery({
    queryKey: ideasTable.key,
    queryFn: async (): Promise<Idea[]> => {
      const { data, error } = await supabase.from('ideas').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Idea[]
    },
  })
}

export function useCreateIdea() {
  return useCreateRow<Idea, IdeaFormValues>(
    ideasTable,
    (values, userId) => ({ ...newRowBase(userId), text: values.text, status: 'new' }),
    (row) => supabase.from('ideas').insert({ id: row.id, text: row.text, status: row.status }),
  )
}

/** e.g. mutate({ id, patch: { status: 'testing' } }). */
export function useUpdateIdea() {
  return useUpdateRow<Idea, IdeaPatch>(ideasTable, (id, patch) => supabase.from('ideas').update(patch).eq('id', id))
}

export function useDeleteIdea() {
  return useDeleteRow(ideasTable, (id) => supabase.from('ideas').delete().eq('id', id))
}
