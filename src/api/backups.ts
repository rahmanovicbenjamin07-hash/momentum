/**
 * Settings → Data: the nightly backups in Storage, restoring one, and deleting the account.
 * The real work happens in the Edge Functions 'restore' and 'delete-account'.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import { addDays, DEFAULT_TIME_ZONE, toDateKey } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import { queryKeys } from './keys'
import { requireUserId } from './optimistic'

export type Backup = {
  /** "<user id>/2026-10-29.json": what useRestoreBackup takes. */
  path: string
  /** "Today, 03:00" · "Yesterday, 03:00" · "Mon 26 Oct, 03:00". */
  label: string
  /** Megabytes, 2 decimals. */
  sizeMB: number
  /** ISO timestamp of the last write. */
  savedAt: string
  /** The safety copy made just before a restore. */
  beforeRestore: boolean
}

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DEFAULT_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: DEFAULT_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** "Today, 03:00" / "Yesterday, 03:00" / "Mon 26 Oct, 03:00" (Europe/Sarajevo). */
export function backupLabel(savedAt: Date, now: Date = new Date()): string {
  const day = toDateKey(savedAt)
  const today = toDateKey(now)
  const time = timeFormat.format(savedAt)
  if (day === today) return `Today, ${time}`
  if (day === addDays(today, -1)) return `Yesterday, ${time}`
  return `${dayFormat.format(savedAt).replace(',', '')}, ${time}`
}

type StorageFile = {
  name: string
  id: string | null
  created_at: string | null
  updated_at: string | null
  metadata: Record<string, unknown> | null
}

/** Storage listing → backups, newest first. Folders (id null) are skipped. */
export function toBackups(userId: string, files: readonly StorageFile[], now: Date = new Date()): Backup[] {
  return files
    .filter((f) => f.id !== null && f.name.endsWith('.json'))
    .map((f) => {
      const savedAt = f.updated_at ?? f.created_at ?? now.toISOString()
      const size = typeof f.metadata?.size === 'number' ? f.metadata.size : 0
      return {
        path: `${userId}/${f.name}`,
        label: backupLabel(new Date(savedAt), now),
        sizeMB: Math.round((size / (1024 * 1024)) * 100) / 100,
        savedAt,
        beforeRestore: f.name.startsWith('before-restore-'),
      }
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

/** The signed-in user's backups (their own Storage folder), newest first. */
export function useBackups() {
  const { user } = useAuth()
  return useQuery({
    queryKey: queryKeys.settings.backups(),
    queryFn: async (): Promise<Backup[]> => {
      const userId = requireUserId(user?.id)
      const { data, error } = await supabase.storage
        .from('backups')
        .list(userId, { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } })
      if (error) throw error
      return toBackups(userId, data)
    },
    enabled: Boolean(user),
  })
}

/**
 * Restores a backup: mutate(backup.path). The server first saves the current data
 * as a "before-restore" backup, then swaps everything in one transaction.
 * Every cached query is refreshed afterwards.
 */
export function useRestoreBackup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (path: string): Promise<{ restoredTables: number; rows: number }> => {
      const { data, error } = await supabase.functions.invoke<{ restoredTables: number; rows: number }>('restore', {
        body: { path },
      })
      if (error) throw error
      if (!data) throw new Error('Empty response')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries(),
    onError: () => toast.error("Couldn't restore the backup. Your data was not changed."),
  })
}

/** Deletes the account, all its data and backups, then signs out on this device. */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
      if (error) throw error
      // The user no longer exists on the server, so only clear the local session.
      await supabase.auth.signOut({ scope: 'local' })
    },
    onError: () => toast.error("Couldn't delete the account. Try again."),
  })
}
