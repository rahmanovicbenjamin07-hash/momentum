/**
 * Settings page: notification settings and the profile settings (theme, week start, targets…).
 * Writes are optimistic (the screen changes at once and rolls back with a toast if saving fails).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import type { Tables } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/uuid'
import type { NotificationKey, NotificationPref, ProfileSettings } from '@/schemas/settings'
import { queryKeys } from './keys'
import type { Profile } from './profile'
import {
  invalidateWhenIdle,
  patchCachedLists,
  patchCachedValue,
  requireUserId,
  restoreCache,
  toDbTime,
  type CacheSnapshot,
} from './optimistic'

type Rollback = { snapshot: CacheSnapshot }

const prefsKey = queryKeys.settings.notificationPrefs()
const prefsMutationKey = ['settings', 'notificationPrefs'] as const
const profileMutationKey = ['profile', 'settings'] as const

/** One setting change. Leave a field out to keep it as it is (or the default for a new setting). */
export type NotificationPrefInput = {
  key: NotificationKey
  enabled?: boolean
  /** "HH:MM", or null for no time. */
  time?: string | null
  /** quiet_hours only: "HH:MM". */
  time_end?: string | null
}

/** Profile settings that can be changed (any subset). */
export type ProfileSettingsPatch = Partial<ProfileSettings>

/** Postgres sends "HH:MM:SS"; the app works with "HH:MM". */
function toHhmm(time: string | null): string | null {
  return time ? time.slice(0, 5) : null
}

export function toNotificationPref(row: Tables<'notification_prefs'>): NotificationPref {
  return {
    id: row.id,
    user_id: row.user_id,
    key: row.key as NotificationKey,
    enabled: row.enabled,
    time: toHhmm(row.time),
    time_end: toHhmm(row.time_end),
  }
}

// ===========================================================================
// Notification settings
// ===========================================================================

/** All notification settings (times as "HH:MM"). Routine reminders appear once the app has created them. */
export function useNotificationPrefs() {
  return useQuery({
    queryKey: prefsKey,
    queryFn: async (): Promise<NotificationPref[]> => {
      const { data, error } = await supabase.from('notification_prefs').select('*').order('key')
      if (error) throw error
      return data.map(toNotificationPref)
    },
    staleTime: 5 * 60_000,
  })
}

/**
 * Turns a setting on/off or changes its time, creating it if it doesn't exist yet
 * (e.g. a routine reminder: { key: `routine:${itemId}`, time: item.time }).
 */
export function useSetNotificationPref() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationKey: prefsMutationKey,
    mutationFn: async (input: NotificationPrefInput) => {
      const row: { user_id: string; key: string; enabled?: boolean; time?: string | null; time_end?: string | null } = {
        user_id: requireUserId(user?.id),
        key: input.key,
      }
      if (input.enabled !== undefined) row.enabled = input.enabled
      if (input.time !== undefined) row.time = toDbTime(input.time)
      if (input.time_end !== undefined) row.time_end = toDbTime(input.time_end)
      const { error } = await supabase.from('notification_prefs').upsert(row, { onConflict: 'user_id,key' })
      if (error) throw error
    },
    onMutate: async (input): Promise<Rollback> => {
      const userId = requireUserId(user?.id)
      const changes: Partial<NotificationPref> = {}
      if (input.enabled !== undefined) changes.enabled = input.enabled
      if (input.time !== undefined) changes.time = input.time
      if (input.time_end !== undefined) changes.time_end = input.time_end
      return {
        snapshot: await patchCachedLists<NotificationPref>(queryClient, prefsKey, (list) =>
          list.some((p) => p.key === input.key)
            ? list.map((p) => (p.key === input.key ? { ...p, ...changes } : p))
            : [...list, { id: uuid(), user_id: userId, key: input.key, enabled: true, time: null, time_end: null, ...changes }],
        ),
      }
    },
    onError: (_error, _input, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the notification setting. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, prefsMutationKey, prefsKey),
  })
}

// ===========================================================================
// Profile settings
// ===========================================================================

/** Changes profile settings, e.g. mutate({ theme: 'dark' }) or mutate({ weekly_targets: {...} }). */
export function useUpdateProfileSettings() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const profileKey = queryKeys.profile.me(user?.id ?? 'anonymous')
  return useMutation({
    mutationKey: profileMutationKey,
    mutationFn: async (patch: ProfileSettingsPatch) => {
      const { error } = await supabase.from('profiles').update(patch).eq('user_id', requireUserId(user?.id))
      if (error) throw error
    },
    onMutate: async (patch): Promise<Rollback> => ({
      snapshot: await patchCachedValue<Profile | null>(queryClient, profileKey, (profile) =>
        profile ? { ...profile, ...patch } : undefined,
      ),
    }),
    onError: (_error, _patch, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error("Couldn't save the setting. Try again.")
    },
    onSettled: () => invalidateWhenIdle(queryClient, profileMutationKey, profileKey),
  })
}
