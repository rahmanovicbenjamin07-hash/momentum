import { useMutation, useQuery, useQueryClient, type MutateOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import type { DateKey } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/uuid'
import type { Priority, Task } from '@/schemas/today'
import { queryKeys } from './keys'
import {
  invalidateWhenIdle,
  nextPosition,
  patchCachedLists,
  requireUserId,
  restoreCache,
  toDbTime,
  type CacheSnapshot,
} from './optimistic'

const tasksPrefix = queryKeys.today.tasksAll()
const overduePrefix = queryKeys.today.overdueTasksAll()
const tasksMutationKey = ['tasks'] as const

type Rollback = { snapshot: CacheSnapshot }

// ===========================================================================
// Queries
// ===========================================================================

/** One-off tasks due on `date` (todo + done; dropped ones are hidden). */
export function useTasksForDate(date: DateKey) {
  return useQuery({
    queryKey: queryKeys.today.tasks(date),
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('due_date', date)
        .neq('status', 'dropped')
        .order('position')
        .order('created_at')
      if (error) throw error
      return data as Task[]
    },
  })
}

/** Unfinished tasks from days before `today`, oldest first. */
export function useOverdueTasks(today: DateKey) {
  return useQuery({
    queryKey: queryKeys.today.overdueTasks(today),
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .lt('due_date', today)
        .eq('status', 'todo')
        .order('due_date')
        .order('position')
        .order('created_at')
      if (error) throw error
      return data as Task[]
    },
  })
}

// ===========================================================================
// Pure cache helpers (tested in tasks.test.ts)
// ===========================================================================

export function patchTask(list: Task[], id: string, patch: Partial<Task>): Task[] {
  return list.map((task) => (task.id === id ? { ...task, ...patch } : task))
}

export function withoutTask(list: Task[], id: string): Task[] {
  return list.filter((task) => task.id !== id)
}

/** The full row for a new task, built in the browser so the cache and the database get the same id. */
export function buildTask(input: NewTask, ids: { id: string; userId: string; position: number }): Task {
  return {
    id: ids.id,
    user_id: ids.userId,
    created_at: new Date().toISOString(),
    title: input.title.trim(),
    notes: input.notes ?? null,
    due_date: input.dueDate,
    time: toDbTime(input.time),
    tag: input.tag ?? null,
    priority: input.priority ?? 'medium',
    status: 'todo',
    completed_at: null,
    position: ids.position,
    contact_id: null,
  }
}

// ===========================================================================
// Mutations
// ===========================================================================

export type NewTask = {
  title: string
  dueDate: DateKey
  /** "HH:MM", or null/undefined for Anytime. */
  time?: string | null
  /** Without "#". */
  tag?: string | null
  priority?: Priority
  notes?: string | null
}

/** Adds a one-off task. It shows in the list instantly; rolls back with a toast if saving fails. */
export function useCreateTask() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const mutation = useMutation({
    mutationKey: tasksMutationKey,
    mutationFn: async (task: Task) => {
      const { error } = await supabase.from('tasks').insert({
        id: task.id,
        title: task.title,
        notes: task.notes,
        due_date: task.due_date,
        time: task.time,
        tag: task.tag,
        priority: task.priority,
        position: task.position,
      })
      if (error) throw error
    },
    onMutate: async (task): Promise<Rollback> => {
      const snapshot = await patchCachedLists<Task>(queryClient, queryKeys.today.tasks(task.due_date), (list) => [
        ...list,
        task,
      ])
      return { snapshot }
    },
    onError: (_error, _task, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't add the task. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, tasksMutationKey, tasksPrefix),
  })

  /** Turns the quick-add values into a full row (id, position) before sending. */
  const toTask = (input: NewTask): Task =>
    buildTask(input, {
      id: uuid(),
      userId: requireUserId(user?.id),
      position: nextPosition(queryClient.getQueryData<Task[]>(queryKeys.today.tasks(input.dueDate))),
    })

  return {
    ...mutation,
    mutate: (input: NewTask, options?: MutateOptions<void, Error, Task, Rollback>) =>
      mutation.mutate(toTask(input), options),
    mutateAsync: (input: NewTask, options?: MutateOptions<void, Error, Task, Rollback>) =>
      mutation.mutateAsync(toTask(input), options),
  }
}

/** Shared by toggle / move / drop: optimistic over today's lists and the overdue list. */
function useTaskMutation<TInput>(config: {
  save: (input: TInput) => Promise<void>
  /** Changes the cached lists to show the result straight away. */
  apply: (input: TInput) => {
    tasks: (list: Task[], date: DateKey | undefined) => Task[]
    overdue: (list: Task[]) => Task[]
  }
  errorMessage: string
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: tasksMutationKey,
    mutationFn: config.save,
    onMutate: async (input: TInput): Promise<Rollback> => {
      const { tasks, overdue } = config.apply(input)
      const a = await patchCachedLists<Task>(queryClient, tasksPrefix, (list, key) =>
        tasks(list, typeof key[2] === 'string' ? key[2] : undefined),
      )
      const b = await patchCachedLists<Task>(queryClient, overduePrefix, overdue)
      return { snapshot: [...a, ...b] }
    },
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(config.errorMessage)
    },
    onSettled: () => invalidateWhenIdle(queryClient, tasksMutationKey, tasksPrefix, overduePrefix),
  })
}

async function updateTask(id: string, patch: { status?: Task['status']; due_date?: DateKey }): Promise<void> {
  // completed_at is set/cleared by a database trigger when status changes.
  const { error } = await supabase.from('tasks').update(patch).eq('id', id)
  if (error) throw error
}

export type ToggleTaskInput = { id: string; done: boolean }

/** Tick / untick a one-off task. Instant; rolls back with a toast if saving fails. */
export function useToggleTask() {
  return useTaskMutation({
    save: ({ id, done }: ToggleTaskInput) => updateTask(id, { status: done ? 'done' : 'todo' }),
    apply: ({ id, done }) => {
      const patch: Partial<Task> = done
        ? { status: 'done', completed_at: new Date().toISOString() }
        : { status: 'todo', completed_at: null }
      return { tasks: (list) => patchTask(list, id, patch), overdue: (list) => patchTask(list, id, patch) }
    },
    errorMessage: "Couldn't update the task. Try again.",
  })
}

export type MoveToTodayInput = { task: Task; today: DateKey }

/** Overdue block → "Move to today". */
export function useMoveToToday() {
  return useTaskMutation({
    save: ({ task, today }: MoveToTodayInput) => updateTask(task.id, { due_date: today }),
    apply: ({ task, today }) => ({
      tasks: (list, date) => {
        if (date !== today) return withoutTask(list, task.id)
        return list.some((t) => t.id === task.id) ? list : [...list, { ...task, due_date: today }]
      },
      overdue: (list) => withoutTask(list, task.id),
    }),
    errorMessage: "Couldn't move the task. Try again.",
  })
}

/** Overdue block → "Drop". The task is kept (status = dropped) but hidden everywhere. */
export function useDropTask() {
  return useTaskMutation({
    save: (id: string) => updateTask(id, { status: 'dropped' }),
    apply: (id) => ({ tasks: (list) => withoutTask(list, id), overdue: (list) => withoutTask(list, id) }),
    errorMessage: "Couldn't drop the task. Try again.",
  })
}
