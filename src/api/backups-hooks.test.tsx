import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/app/auth-context'
import { backupLabel, toBackups, useBackups, useDeleteAccount, useRestoreBackup } from './backups'

const USER_ID = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'

const fake = vi.hoisted(() => ({
  list: vi.fn<(folder: string, options: unknown) => Promise<{ data: unknown[]; error: null }>>(),
  invoke: vi.fn<(name: string, options: unknown) => Promise<{ data: unknown; error: unknown }>>(),
  signOut: vi.fn<(options: unknown) => Promise<{ error: null }>>(),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: { from: () => ({ list: fake.list }) },
    functions: { invoke: fake.invoke },
    auth: { signOut: fake.signOut },
  },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn<(message: string) => void>() } }))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const auth = { session: null, user: { id: USER_ID } as User, loading: false }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  )
  return { wrapper, queryClient }
}

// Thursday 29 Oct 2026, 15:00 in Sarajevo (CET, UTC+1).
const NOW = new Date('2026-10-29T14:00:00Z')

describe('backupLabel', () => {
  it('says Today / Yesterday / a short date, in Sarajevo time', () => {
    expect(backupLabel(new Date('2026-10-29T02:00:00Z'), NOW)).toBe('Today, 03:00')
    expect(backupLabel(new Date('2026-10-28T02:00:00Z'), NOW)).toBe('Yesterday, 03:00')
    expect(backupLabel(new Date('2026-10-26T02:00:00Z'), NOW)).toBe('Mon 26 Oct, 03:00')
    // 23:30 UTC on the 28th is already the 29th in Sarajevo.
    expect(backupLabel(new Date('2026-10-28T23:30:00Z'), NOW)).toBe('Today, 00:30')
  })
})

describe('toBackups', () => {
  it('builds paths and sizes, skips folders, newest first', () => {
    const files = [
      { name: '2026-10-28.json', id: 'a', created_at: null, updated_at: '2026-10-28T02:00:00Z', metadata: { size: 1048576 } },
      { name: 'sub', id: null, created_at: null, updated_at: null, metadata: null },
      {
        name: 'before-restore-2026-10-29T10-00-00-000Z.json',
        id: 'b',
        created_at: null,
        updated_at: '2026-10-29T10:00:00Z',
        metadata: { size: 206978 },
      },
    ]
    expect(toBackups(USER_ID, files, NOW)).toEqual([
      {
        path: `${USER_ID}/before-restore-2026-10-29T10-00-00-000Z.json`,
        label: 'Today, 11:00',
        sizeMB: 0.2,
        savedAt: '2026-10-29T10:00:00Z',
        beforeRestore: true,
      },
      {
        path: `${USER_ID}/2026-10-28.json`,
        label: 'Yesterday, 03:00',
        sizeMB: 1,
        savedAt: '2026-10-28T02:00:00Z',
        beforeRestore: false,
      },
    ])
  })
})

describe('backup hooks', () => {
  it('lists my own folder', async () => {
    fake.list.mockResolvedValue({ data: [], error: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useBackups(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.list.mock.calls[0]?.[0]).toBe(USER_ID)
  })

  it('restores through the Edge Function and refreshes everything', async () => {
    fake.invoke.mockResolvedValue({ data: { restoredTables: 12, rows: 681 }, error: null })
    const { wrapper, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRestoreBackup(), { wrapper })
    act(() => result.current.mutate(`${USER_ID}/2026-10-28.json`))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.invoke).toHaveBeenCalledWith('restore', { body: { path: `${USER_ID}/2026-10-28.json` } })
    expect(result.current.data).toEqual({ restoredTables: 12, rows: 681 })
    expect(invalidate).toHaveBeenCalledWith()
  })

  it('deletes the account, then signs out locally', async () => {
    fake.invoke.mockResolvedValue({ data: null, error: null })
    fake.signOut.mockResolvedValue({ error: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useDeleteAccount(), { wrapper })
    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' })
    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
