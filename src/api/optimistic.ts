/**
 * Small helpers shared by the optimistic mutations in src/api.
 *
 * The pattern every optimistic hook follows:
 *   onMutate  → patchCachedLists(...)  (stop refetches, save old data, show the change now)
 *   onError   → restoreCache(...) + toast
 *   onSettled → invalidateWhenIdle(...) (refetch once the last related change finished)
 */
import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { uuid } from '@/lib/uuid'

/** Cached data as it was before an optimistic change, for rolling back. */
export type CacheSnapshot = ReadonlyArray<readonly [QueryKey, unknown]>

/**
 * Applies `update` to every cached list whose key starts with `prefix`.
 * Lists not loaded yet are skipped (they'll fetch fresh data anyway).
 */
export async function patchCachedLists<T>(
  queryClient: QueryClient,
  prefix: QueryKey,
  update: (list: T[], key: QueryKey) => T[],
): Promise<CacheSnapshot> {
  // A refetch landing now would overwrite the optimistic change.
  await queryClient.cancelQueries({ queryKey: prefix })
  const entries = queryClient.getQueriesData<T[]>({ queryKey: prefix })
  for (const [key, list] of entries) {
    if (list) queryClient.setQueryData<T[]>(key, update(list, key))
  }
  return entries
}

export function restoreCache(queryClient: QueryClient, snapshot: CacheSnapshot | undefined): void {
  for (const [key, data] of snapshot ?? []) queryClient.setQueryData(key, data)
}

/**
 * Refetches the given queries, but only when this is the last running mutation
 * with `mutationKey`. Otherwise a refetch could bring back stale data and undo
 * a newer optimistic change (e.g. ticking two items quickly).
 */
export async function invalidateWhenIdle(
  queryClient: QueryClient,
  mutationKey: QueryKey,
  ...prefixes: QueryKey[]
): Promise<void> {
  if (queryClient.isMutating({ mutationKey }) > 1) return
  await Promise.all(prefixes.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

/** id / user_id / created_at for a row created in the browser. */
export function newRowBase(userId: string): { id: string; user_id: string; created_at: string } {
  return { id: uuid(), user_id: userId, created_at: new Date().toISOString() }
}

/** Forms send "HH:MM"; Postgres returns "HH:MM:SS". Store the same shape in the cache. */
export function toDbTime(time: string | null | undefined): string | null {
  if (!time) return null
  return time.length === 5 ? `${time}:00` : time
}

/** Position for a new row placed after the existing ones. */
export function nextPosition(rows: ReadonlyArray<{ position: number }> | undefined): number {
  return (rows ?? []).reduce((next, row) => Math.max(next, row.position + 1), 0)
}

export function requireUserId(userId: string | undefined): string {
  if (!userId) throw new Error('You are signed out. Sign in and try again.')
  return userId
}
