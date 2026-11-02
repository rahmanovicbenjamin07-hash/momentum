import type { Priority, TodayItem, TodayItemKind } from '@/schemas/today'
import { sortTodayItems } from './today-list'

/** How "Today's tasks" is ordered: by time (default), by priority, or the order you dragged them into. */
export type TaskSort = 'time' | 'priority' | 'manual'

export const TASK_SORTS: readonly TaskSort[] = ['time', 'priority', 'manual']

export const isTaskSort = (value: unknown): value is TaskSort => TASK_SORTS.includes(value as TaskSort)

/** High first. Repeating items have no priority and count as medium. */
const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const rank = (item: TodayItem) => PRIORITY_RANK[item.priority ?? 'medium']

/** Saved order; items without one go last. Ties: repeating before one-off, then the incoming order. */
function byPosition(a: TodayItem, b: TodayItem): number {
  const pa = a.position ?? Number.MAX_SAFE_INTEGER
  const pb = b.position ?? Number.MAX_SAFE_INTEGER
  if (pa !== pb) return pa - pb
  if (a.kind !== b.kind) return a.kind === 'routine' ? -1 : 1
  return 0
}

/**
 * Orders the list for the chosen sort. Done items always sit at the bottom.
 * - time: by time, "Anytime" last (see sortTodayItems)
 * - priority: high → medium → low, then by time
 * - manual: the saved order
 */
export function orderTodayItems(items: readonly TodayItem[], sort: TaskSort): TodayItem[] {
  if (sort === 'time') return sortTodayItems(items)
  const base = sort === 'priority' ? sortTodayItems(items) : [...items]
  return base
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.done !== b.item.done) return a.item.done ? 1 : -1
      const diff = sort === 'priority' ? rank(a.item) - rank(b.item) : byPosition(a.item, b.item)
      return diff !== 0 ? diff : a.index - b.index
    })
    .map(({ item }) => item)
}

/** Moves the item with `activeId` to where `overId` is. Unknown ids leave the list as it is. */
export function moveItem(items: readonly TodayItem[], activeId: string, overId: string): TodayItem[] {
  const from = items.findIndex((i) => i.id === activeId)
  const to = items.findIndex((i) => i.id === overId)
  if (from === -1 || to === -1 || from === to) return [...items]
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (moved) next.splice(to, 0, moved)
  return next
}

export type PositionUpdate = { kind: TodayItemKind; id: string; position: number }

/**
 * New saved positions after a drag: each item's place in the list (0, 1, 2…).
 * Only items whose position actually changed are returned, so fewer rows are written.
 */
export function positionUpdates(ordered: readonly TodayItem[]): PositionUpdate[] {
  return ordered.flatMap((item, position) => (item.position === position ? [] : [{ kind: item.kind, id: item.id, position }]))
}
