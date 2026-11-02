import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { PositionUpdate } from '@/lib/taskOrder'
import type { RoutineItem, Task } from '@/schemas/today'
import { queryKeys } from './keys'
import { invalidateWhenIdle, patchCachedLists, restoreCache, type CacheSnapshot } from './optimistic'

const tasksPrefix = queryKeys.today.tasksAll()
const routineKey = queryKeys.today.routineItems()
// Its own key: a reorder waits for other reorders, not for ticks.
const reorderMutationKey = ['todayOrder'] as const

type Rollback = { snapshot: CacheSnapshot }

function withPositions<T extends { id: string; position: number }>(list: T[], positions: ReadonlyMap<string, number>): T[] {
  return list.map((row) => {
    const position = positions.get(row.id)
    return position === undefined ? row : { ...row, position }
  })
}

/**
 * "My order" in Today's tasks: saves the new place of each moved row
 * (one-off tasks and repeating items). Instant; rolls back with a toast if saving fails.
 */
export function useReorderTodayItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: reorderMutationKey,
    mutationFn: async (updates: readonly PositionUpdate[]) => {
      const results = await Promise.all(
        updates.map(({ kind, id, position }) =>
          supabase
            .from(kind === 'task' ? 'tasks' : 'routine_items')
            .update({ position })
            .eq('id', id),
        ),
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async (updates): Promise<Rollback> => {
      const tasks = new Map(updates.filter((u) => u.kind === 'task').map((u) => [u.id, u.position]))
      const routine = new Map(updates.filter((u) => u.kind === 'routine').map((u) => [u.id, u.position]))
      const a = await patchCachedLists<Task>(queryClient, tasksPrefix, (list) => withPositions(list, tasks))
      const b = await patchCachedLists<RoutineItem>(queryClient, routineKey, (list) => withPositions(list, routine))
      return { snapshot: [...a, ...b] }
    },
    onError: (_error, _updates, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the new order. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, reorderMutationKey, tasksPrefix, routineKey),
  })
}
