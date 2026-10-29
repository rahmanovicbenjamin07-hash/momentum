/**
 * The bell: latest notifications and how many are unread. Both refresh every minute.
 * Marking as read is optimistic (the dot disappears at once and comes back with a toast if saving fails).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/schemas/settings'
import { queryKeys } from './keys'
import { invalidateWhenIdle, patchCachedLists, patchCachedValue, restoreCache, type CacheSnapshot } from './optimistic'

type Rollback = { snapshot: CacheSnapshot }

const listKey = queryKeys.notifications.notifications()
const countKey = queryKeys.notifications.unreadCount()
const mutationKey = ['notifications', 'read'] as const
const POLL_MS = 60_000

/** The newest 30 notifications, newest first. */
export function useNotifications() {
  return useQuery({
    queryKey: listKey,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as Notification[]
    },
    refetchInterval: POLL_MS,
  })
}

/** How many notifications are unread (all of them, not just the newest 30). */
export function useUnreadCount() {
  return useQuery({
    queryKey: countKey,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
      if (error) throw error
      return count ?? 0
    },
    refetchInterval: POLL_MS,
  })
}

/** "Mark all read": every unread notification gets read_at = now. */
export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null)
      if (error) throw error
    },
    onMutate: async (): Promise<Rollback> => {
      const now = new Date().toISOString()
      const list = await patchCachedLists<Notification>(queryClient, listKey, (items) =>
        items.map((n) => (n.read_at ? n : { ...n, read_at: now })),
      )
      const count = await patchCachedValue<number>(queryClient, countKey, (n) => (n === undefined ? undefined : 0))
      return { snapshot: [...list, ...count] }
    },
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't mark notifications as read. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, mutationKey, queryKeys.notifications.all),
  })
}

/** Marks one notification as read: mutate(id). Already-read ones are left as they are. */
export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null)
      if (error) throw error
    },
    onMutate: async (id): Promise<Rollback> => {
      const now = new Date().toISOString()
      const wasUnread = queryClient.getQueryData<Notification[]>(listKey)?.some((n) => n.id === id && !n.read_at)
      const list = await patchCachedLists<Notification>(queryClient, listKey, (items) =>
        items.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)),
      )
      const count = await patchCachedValue<number>(queryClient, countKey, (n) =>
        n === undefined || !wasUnread ? undefined : Math.max(0, n - 1),
      )
      return { snapshot: [...list, ...count] }
    },
    onError: (_error, _id, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't mark the notification as read. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, mutationKey, queryKeys.notifications.all),
  })
}
