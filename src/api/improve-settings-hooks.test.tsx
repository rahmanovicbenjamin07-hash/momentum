import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { AuthContext } from '@/app/auth-context'
import type { Idea, Lesson, Review } from '@/schemas/improve'
import type { Notification, NotificationPref } from '@/schemas/settings'
import { useCreateLesson, useSaveReview, useUpdateIdea } from './improve'
import { queryKeys } from './keys'
import { useMarkAllRead, useMarkRead, useUnreadCount } from './notifications'
import type { Profile } from './profile'
import { useNotificationPrefs, useSetNotificationPref, useUpdateProfileSettings } from './settings'

// --- fake Supabase: every query is recorded; `db.respond` decides the result ---
type Call = { table: string; ops: [string, unknown[]][] }
type Result = { data?: unknown; count?: number; error: { message: string } | null }
const db = vi.hoisted(() => ({
  calls: [] as Call[],
  respond: (_call: Call): Result | Promise<Result> => ({ data: [], error: null }),
}))
vi.mock('@/lib/supabase', () => {
  const builder = (call: Call): unknown =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'then'
            ? (onOk: (r: Result) => unknown, onFail: (e: unknown) => unknown) =>
                Promise.resolve(db.respond(call)).then(onOk, onFail)
            : (...args: unknown[]) => {
                call.ops.push([String(prop), args])
                return builder(call)
              },
      },
    )
  return {
    supabase: {
      from: (table: string) => {
        const call: Call = { table, ops: [] }
        db.calls.push(call)
        return builder(call)
      },
    },
  }
})
vi.mock('sonner', () => ({ toast: { error: vi.fn<(message: string) => void>() } }))

const USER_ID = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'
const ROUTINE_ID = '5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e9f'
const SNAPSHOT = { task_completion: 81, outreach_sent: 24, replies: 5, meetings: 2 }

/** A promise the test resolves itself, to look at the screen while saving is still going on. */
function deferred() {
  let resolve: (r: Result) => void = () => {}
  const promise = new Promise<Result>((r) => (resolve = r))
  return { promise, resolve }
}

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

function review(fields: Partial<Review>): Review {
  return {
    id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    user_id: USER_ID,
    created_at: '2026-10-18T18:00:00+00:00',
    week_start: '2026-10-12',
    wins: '',
    misses: '',
    lesson: '',
    focus: 'plan top 3 the night before',
    status: 'saved',
    stats_snapshot: { task_completion: 76, outreach_sent: 20, replies: 4, meetings: 1 },
    ...fields,
  }
}

function notification(fields: Partial<Notification>): Notification {
  return {
    id: 'n1',
    user_id: USER_ID,
    created_at: '2026-10-28T08:00:00+00:00',
    kind: 'followup_due',
    title: 'Follow up with Emir Kovač',
    body: 'Due today · LinkedIn',
    link: null,
    read_at: null,
    dedupe_key: 'followup_due:x:2026-10-28',
    ...fields,
  }
}

const opsOf = (table: string) => db.calls.filter((c) => c.table === table).map((c) => c.ops)

beforeEach(() => {
  db.calls = []
  db.respond = () => ({ data: [], error: null })
  vi.mocked(toast.error).mockClear()
})

describe('useSaveReview', () => {
  it('upserts the week as saved and shows it in the list at once', async () => {
    const { wrapper, queryClient } = setup()
    queryClient.setQueryData(queryKeys.improve.reviews(), [review({})])
    const pending = deferred()
    db.respond = () => pending.promise

    const { result } = renderHook(() => useSaveReview(), { wrapper })
    act(() =>
      result.current.mutate({
        week_start: '2026-10-19',
        wins: 'Booked 2 meetings.',
        misses: '',
        lesson: '',
        focus: 'Send follow-ups on day 3 instead of day 7.',
        stats_snapshot: SNAPSHOT,
      }),
    )

    // Optimistic: the new week sits on top, before the server answers.
    await waitFor(() =>
      expect(queryClient.getQueryData<Review[]>(queryKeys.improve.reviews())?.map((r) => r.week_start)).toEqual([
        '2026-10-19',
        '2026-10-12',
      ]),
    )
    const [ops] = opsOf('reviews')
    const upsert = ops?.find(([op]) => op === 'upsert')
    expect(upsert?.[1][0]).toMatchObject({
      user_id: USER_ID,
      week_start: '2026-10-19',
      status: 'saved',
      stats_snapshot: SNAPSHOT,
    })
    expect(upsert?.[1][1]).toEqual({ onConflict: 'user_id,week_start' })

    pending.resolve({ data: review({ id: 'server-id', week_start: '2026-10-19' }), error: null })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData<Review>(queryKeys.improve.review('2026-10-19'))?.id).toBe('server-id')
  })

  it('rolls back and shows a toast when saving fails', async () => {
    const { wrapper, queryClient } = setup()
    const before = [review({})]
    queryClient.setQueryData(queryKeys.improve.reviews(), before)
    db.respond = () => ({ data: null, error: { message: 'nope' } })

    const { result } = renderHook(() => useSaveReview(), { wrapper })
    act(() =>
      result.current.mutate({
        week_start: '2026-10-12',
        wins: 'changed',
        misses: '',
        lesson: '',
        focus: '',
        stats_snapshot: SNAPSHOT,
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(queryKeys.improve.reviews())).toEqual(before)
    expect(toast.error).toHaveBeenCalledWith("Couldn't save the review. Try again.")
  })
})

describe('lessons and ideas', () => {
  it('adds a lesson on top and changes an idea right away', async () => {
    const { wrapper, queryClient } = setup()
    const old: Lesson = { id: 'l1', user_id: USER_ID, created_at: '2026-10-01T10:00:00Z', area: 'Work', text: 'Old' }
    queryClient.setQueryData(queryKeys.improve.lessons(), [old])
    const idea: Idea = { id: 'i1', user_id: USER_ID, created_at: '2026-10-01T10:00:00Z', text: 'Try Loom', status: 'new' }
    queryClient.setQueryData(queryKeys.improve.ideas(), [idea])
    const pending = deferred()
    db.respond = () => pending.promise

    const lesson = renderHook(() => useCreateLesson(), { wrapper })
    act(() => lesson.result.current.mutate({ area: 'Outreach', text: 'Name one specific thing' }))
    const ideaUpdate = renderHook(() => useUpdateIdea(), { wrapper })
    act(() => ideaUpdate.result.current.mutate({ id: 'i1', patch: { status: 'testing' } }))

    await waitFor(() =>
      expect(queryClient.getQueryData<Lesson[]>(queryKeys.improve.lessons())?.map((l) => l.text)).toEqual([
        'Name one specific thing',
        'Old',
      ]),
    )
    await waitFor(() => expect(queryClient.getQueryData<Idea[]>(queryKeys.improve.ideas())?.[0]?.status).toBe('testing'))
    const insert = opsOf('lessons')[0]?.find(([op]) => op === 'insert')
    expect(insert?.[1][0]).toMatchObject({ area: 'Outreach', text: 'Name one specific thing' })
    expect(opsOf('ideas')[0]).toContainEqual(['eq', ['id', 'i1']])
    pending.resolve({ error: null })
  })
})

describe('notification settings', () => {
  it('reads times as HH:MM and adds a routine reminder optimistically', async () => {
    db.respond = () => ({
      data: [{ id: 'p1', user_id: USER_ID, created_at: 'x', key: 'close_day', enabled: true, time: '21:00:00', time_end: null }],
      error: null,
    })
    const { wrapper, queryClient } = setup()
    const prefs = renderHook(() => useNotificationPrefs(), { wrapper })
    await waitFor(() => expect(prefs.result.current.isSuccess).toBe(true))
    expect(prefs.result.current.data?.[0]).toMatchObject({ key: 'close_day', time: '21:00', time_end: null })

    const pending = deferred()
    db.respond = () => pending.promise
    const set = renderHook(() => useSetNotificationPref(), { wrapper })
    act(() => set.result.current.mutate({ key: `routine:${ROUTINE_ID}`, time: '06:00' }))
    await waitFor(() =>
      expect(queryClient.getQueryData<NotificationPref[]>(queryKeys.settings.notificationPrefs())?.[1]).toMatchObject({
        key: `routine:${ROUTINE_ID}`,
        enabled: true,
        time: '06:00',
      }),
    )
    const upsert = opsOf('notification_prefs').at(-1)?.find(([op]) => op === 'upsert')
    expect(upsert?.[1]).toEqual([
      { user_id: USER_ID, key: `routine:${ROUTINE_ID}`, time: '06:00:00' },
      { onConflict: 'user_id,key' },
    ])
    pending.resolve({ error: null })
  })

  it('updates profile settings optimistically and rolls back on failure', async () => {
    const { wrapper, queryClient } = setup()
    const profileKey = queryKeys.profile.me(USER_ID)
    const profile = { user_id: USER_ID, theme: 'light', backup_enabled: true } as Profile
    queryClient.setQueryData(profileKey, profile)
    const pending = deferred()
    db.respond = () => pending.promise

    const { result } = renderHook(() => useUpdateProfileSettings(), { wrapper })
    act(() => result.current.mutate({ theme: 'dark' }))
    await waitFor(() => expect(queryClient.getQueryData<Profile>(profileKey)?.theme).toBe('dark'))
    expect(opsOf('profiles')[0]).toContainEqual(['eq', ['user_id', USER_ID]])

    pending.resolve({ error: { message: 'nope' } })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData<Profile>(profileKey)?.theme).toBe('light')
  })
})

describe('notifications', () => {
  it('counts unread ones with a head-only count', async () => {
    db.respond = () => ({ data: null, count: 3, error: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useUnreadCount(), { wrapper })
    await waitFor(() => expect(result.current.data).toBe(3))
    const [ops] = opsOf('notifications')
    expect(ops).toContainEqual(['select', ['id', { count: 'exact', head: true }]])
    expect(ops).toContainEqual(['is', ['read_at', null]])
  })

  it('marks all read, and one read, straight away', async () => {
    const { wrapper, queryClient } = setup()
    const listKey = queryKeys.notifications.notifications()
    const countKey = queryKeys.notifications.unreadCount()
    queryClient.setQueryData(listKey, [notification({ id: 'n1' }), notification({ id: 'n2' })])
    queryClient.setQueryData(countKey, 2)
    const pending = deferred()
    db.respond = () => pending.promise

    const one = renderHook(() => useMarkRead(), { wrapper })
    act(() => one.result.current.mutate('n1'))
    await waitFor(() => expect(queryClient.getQueryData(countKey)).toBe(1))
    expect(queryClient.getQueryData<Notification[]>(listKey)?.[0]?.read_at).not.toBeNull()

    const all = renderHook(() => useMarkAllRead(), { wrapper })
    act(() => all.result.current.mutate())
    await waitFor(() => expect(queryClient.getQueryData(countKey)).toBe(0))
    expect(queryClient.getQueryData<Notification[]>(listKey)?.every((n) => n.read_at)).toBe(true)
    expect(opsOf('notifications').at(-1)).toContainEqual(['is', ['read_at', null]])
    pending.resolve({ error: null })
  })
})
