import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/app/auth-context'
import type { RoutineCheck, Task } from '@/schemas/today'
import { toDailyLogPatch } from './dailyLog'
import { queryKeys } from './keys'
import { nextPosition, toDbTime } from './optimistic'
import { applyCheckChange, checksKeyCovers, useToggleRoutineCheck } from './routine'
import { buildTask, patchTask, restoreIntoList, useCreateTask, useDeleteTask, useMoveToToday, withoutTask } from './tasks'

// --- fake Supabase: each test decides what the next write resolves to -------
type WriteResult = Promise<{ error: { message: string; code?: string } | null }>
const db = vi.hoisted(() => ({
  upsert: vi.fn<(row: unknown, options?: unknown) => WriteResult>(),
  insert: vi.fn<(row: unknown) => WriteResult>(),
  update: vi.fn<(patch: unknown, id: string) => WriteResult>(),
  delete: vi.fn<(id: string) => WriteResult>(),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert: db.upsert,
      insert: db.insert,
      update: (patch: unknown) => ({ eq: (_col: string, id: string) => db.update(patch, id) }),
      delete: () => ({ eq: (_col: string, id: string) => db.delete(id) }),
    }),
  },
}))
const toastError = vi.hoisted(() => vi.fn<(message: string) => void>())
vi.mock('sonner', () => ({ toast: { error: toastError } }))

const USER_ID = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'
const ITEM_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b'

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const auth = { session: null, user: { id: USER_ID } as User, loading: false }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  )
  return { queryClient, wrapper }
}

/** A promise the test resolves by hand, to look at the cache while a save is in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

function task(overrides: Partial<Task> = {}): Task {
  const row = buildTask({ title: 'Send invoice', dueDate: '2026-10-28' }, { id: ITEM_ID, userId: USER_ID, position: 0 })
  return { ...row, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// Pure helpers
// ===========================================================================

describe('optimistic helpers', () => {
  it('toDbTime matches the Postgres format', () => {
    expect(toDbTime('09:30')).toBe('09:30:00')
    expect(toDbTime('09:30:00')).toBe('09:30:00')
    expect(toDbTime('')).toBeNull()
    expect(toDbTime(undefined)).toBeNull()
  })

  it('nextPosition goes after the highest position', () => {
    expect(nextPosition(undefined)).toBe(0)
    expect(nextPosition([])).toBe(0)
    expect(nextPosition([{ position: 0 }, { position: 4 }, { position: 2 }])).toBe(5)
  })
})

describe('routine check cache helpers', () => {
  const base = () => ({ id: 'new', user_id: USER_ID, created_at: '2026-10-28T10:00:00Z' })

  it('checksKeyCovers checks the date against the key range', () => {
    const key = queryKeys.today.routineChecks('2026-10-26', '2026-11-01')
    expect(checksKeyCovers(key, '2026-10-26')).toBe(true)
    expect(checksKeyCovers(key, '2026-11-01')).toBe(true)
    expect(checksKeyCovers(key, '2026-11-02')).toBe(false)
    expect(checksKeyCovers(queryKeys.today.routineChecksAll(), '2026-10-28')).toBe(false)
  })

  it('adds a check when there is none for that item and day', () => {
    const result = applyCheckChange(
      [],
      { routineItemId: ITEM_ID, date: '2026-10-28', done: true, missReason: null },
      base,
    )
    expect(result).toEqual([{ ...base(), routine_item_id: ITEM_ID, date: '2026-10-28', done: true, miss_reason: null }])
  })

  it('updates the existing check instead of adding a second one', () => {
    const existing: RoutineCheck = {
      ...base(),
      id: 'old',
      routine_item_id: ITEM_ID,
      date: '2026-10-27',
      done: false,
      miss_reason: null,
    }
    const result = applyCheckChange(
      [existing],
      { routineItemId: ITEM_ID, date: '2026-10-27', done: false, missReason: 'Tired' },
      base,
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'old', miss_reason: 'Tired', done: false })
  })
})

describe('task cache helpers', () => {
  it('buildTask fills defaults and trims the title', () => {
    const row = buildTask(
      { title: '  Call Ana  ', dueDate: '2026-10-28', time: '14:00', tag: 'outreach' },
      { id: ITEM_ID, userId: USER_ID, position: 3 },
    )
    expect(row).toMatchObject({
      title: 'Call Ana',
      time: '14:00:00',
      tag: 'outreach',
      priority: 'medium',
      status: 'todo',
      completed_at: null,
      position: 3,
    })
  })

  it('patchTask and withoutTask only touch the matching task', () => {
    const a = task()
    const b = task({ id: 'other' })
    expect(patchTask([a, b], ITEM_ID, { status: 'done' }).map((t) => t.status)).toEqual(['done', 'todo'])
    expect(withoutTask([a, b], ITEM_ID)).toEqual([b])
  })
})

describe('toDailyLogPatch', () => {
  it('sends only the given fields; empty note becomes null', () => {
    expect(toDailyLogPatch({ date: '2026-10-28', energy: 4 })).toEqual({ energy: 4 })
    expect(toDailyLogPatch({ date: '2026-10-28', note: '' })).toEqual({ note: null })
    expect(toDailyLogPatch({ date: '2026-10-28', note: 'Good day', energy: null })).toEqual({
      note: 'Good day',
      energy: null,
    })
  })
})

// ===========================================================================
// Hooks
// ===========================================================================

describe('useToggleRoutineCheck', () => {
  const key = queryKeys.today.routineChecks('2026-10-26', '2026-11-01')
  const otherWeek = queryKeys.today.routineChecks('2026-10-19', '2026-10-25')

  it('ticks instantly and rolls back with a toast when saving fails', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData<RoutineCheck[]>(key, [])
    queryClient.setQueryData<RoutineCheck[]>(otherWeek, [])
    const save = deferred<{ error: { message: string } | null }>()
    db.upsert.mockReturnValue(save.promise)

    const { result } = renderHook(() => useToggleRoutineCheck(), { wrapper })
    act(() => result.current.mutate({ routineItemId: ITEM_ID, date: '2026-10-28', done: true }))

    // Instant: the tick is in the cache before the save finishes, only in the week that covers the day.
    await waitFor(() => expect(queryClient.getQueryData<RoutineCheck[]>(key)).toHaveLength(1))
    expect(queryClient.getQueryData<RoutineCheck[]>(key)?.[0]).toMatchObject({ done: true, user_id: USER_ID })
    expect(queryClient.getQueryData(otherWeek)).toEqual([])
    expect(db.upsert).toHaveBeenCalledWith(
      { routine_item_id: ITEM_ID, date: '2026-10-28', done: true, miss_reason: null },
      { onConflict: 'routine_item_id,date' },
    )

    save.resolve({ error: { message: 'network down' } })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(key)).toEqual([])
    expect(toastError).toHaveBeenCalledWith("Couldn't save that tick. Try again.")
  })

  it('keeps the tick when saving works', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData<RoutineCheck[]>(key, [])
    db.upsert.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useToggleRoutineCheck(), { wrapper })
    act(() => result.current.mutate({ routineItemId: ITEM_ID, date: '2026-10-28', done: true }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData<RoutineCheck[]>(key)?.[0]).toMatchObject({ done: true })
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe('useCreateTask', () => {
  it('shows the task instantly and saves it with the same id', async () => {
    const { queryClient, wrapper } = setup()
    const key = queryKeys.today.tasks('2026-10-28')
    queryClient.setQueryData<Task[]>(key, [task({ position: 2 })])
    db.insert.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useCreateTask(), { wrapper })
    act(() => result.current.mutate({ title: 'Write proposal', dueDate: '2026-10-28', priority: 'high' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const added = queryClient.getQueryData<Task[]>(key)?.[1]
    expect(added).toMatchObject({ title: 'Write proposal', priority: 'high', position: 3, status: 'todo' })
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ id: added?.id, position: 3 }))
  })

  it('removes the task again when saving fails', async () => {
    const { queryClient, wrapper } = setup()
    const key = queryKeys.today.tasks('2026-10-28')
    queryClient.setQueryData<Task[]>(key, [])
    db.insert.mockResolvedValue({ error: { message: 'check violation' } })

    const { result } = renderHook(() => useCreateTask(), { wrapper })
    act(() => result.current.mutate({ title: 'Write proposal', dueDate: '2026-10-28' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(key)).toEqual([])
    expect(toastError).toHaveBeenCalledWith("Couldn't add the task. Try again.")
  })
})

describe('useMoveToToday', () => {
  it("moves an overdue task into today's list", async () => {
    const { queryClient, wrapper } = setup()
    const old = task({ due_date: '2026-10-25' })
    queryClient.setQueryData<Task[]>(queryKeys.today.overdueTasks('2026-10-28'), [old])
    queryClient.setQueryData<Task[]>(queryKeys.today.tasks('2026-10-28'), [])
    db.update.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useMoveToToday(), { wrapper })
    act(() => result.current.mutate({ task: old, today: '2026-10-28' }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(queryKeys.today.overdueTasks('2026-10-28'))).toEqual([])
    expect(queryClient.getQueryData<Task[]>(queryKeys.today.tasks('2026-10-28'))).toEqual([
      { ...old, due_date: '2026-10-28' },
    ])
    expect(db.update).toHaveBeenCalledWith({ due_date: '2026-10-28' }, ITEM_ID)
  })
})

describe('restoreIntoList', () => {
  const t = task({ due_date: '2026-10-25', contact_id: 'c-1' })

  it('puts the task back into its day, its lead and the overdue list only', () => {
    expect(restoreIntoList([], queryKeys.today.tasks('2026-10-25'), t)).toEqual([t])
    expect(restoreIntoList([], queryKeys.today.tasks('2026-10-28'), t)).toEqual([])
    expect(restoreIntoList([], queryKeys.today.contactTasks('c-1'), t)).toEqual([t])
    expect(restoreIntoList([], queryKeys.today.contactTasks('c-2'), t)).toEqual([])
    expect(restoreIntoList([], queryKeys.today.overdueTasks('2026-10-28'), t)).toEqual([t])
    expect(restoreIntoList([], queryKeys.today.overdueTasks('2026-10-25'), t)).toEqual([])
    expect(restoreIntoList([], queryKeys.today.overdueTasks('2026-10-28'), { ...t, status: 'done' })).toEqual([])
  })

  it('never adds it twice', () => {
    expect(restoreIntoList([t], queryKeys.today.tasks('2026-10-25'), t)).toEqual([t])
  })
})

describe('useDeleteTask', () => {
  const dayKey = queryKeys.today.tasks('2026-10-28')
  const leadKey = queryKeys.today.contactTasks('c-1')
  const done = task({ status: 'done', completed_at: '2026-10-28T08:00:00.000Z', contact_id: 'c-1' })
  const other = task({ id: '11111111-2222-4333-8444-555555555555', title: 'Other' })

  it('removes the task everywhere at once, and undo puts back the exact same row', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData<Task[]>(dayKey, [done, other])
    queryClient.setQueryData<Task[]>(leadKey, [done])
    db.delete.mockResolvedValue({ error: null })
    db.insert.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useDeleteTask(), { wrapper })
    let undo: (() => void) | null = null
    act(() => {
      undo = result.current.remove(ITEM_ID)
    })

    await waitFor(() => expect(queryClient.getQueryData<Task[]>(dayKey)).toEqual([other]))
    expect(queryClient.getQueryData<Task[]>(leadKey)).toEqual([])
    await waitFor(() => expect(db.delete).toHaveBeenCalledWith(ITEM_ID))

    act(() => undo?.())
    await waitFor(() => expect(db.insert).toHaveBeenCalled())
    expect(queryClient.getQueryData<Task[]>(dayKey)?.map((t) => t.id)).toEqual([other.id, ITEM_ID])
    expect(queryClient.getQueryData<Task[]>(leadKey)).toEqual([done])
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ITEM_ID,
        created_at: done.created_at,
        status: 'done',
        completed_at: '2026-10-28T08:00:00.000Z',
        contact_id: 'c-1',
      }),
    )
  })

  it('brings the task back with a toast when the delete fails', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData<Task[]>(dayKey, [done])
    db.delete.mockResolvedValue({ error: { message: 'network down' } })

    const { result } = renderHook(() => useDeleteTask(), { wrapper })
    act(() => {
      result.current.remove(ITEM_ID)
    })

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Couldn't delete the task. Try again."))
    expect(queryClient.getQueryData<Task[]>(dayKey)).toEqual([done])
  })

  it('undo waits for a delete that is still saving', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData<Task[]>(dayKey, [done])
    const slowDelete = deferred<{ error: null }>()
    db.delete.mockReturnValue(slowDelete.promise)
    db.insert.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useDeleteTask(), { wrapper })
    let undo: (() => void) | null = null
    act(() => {
      undo = result.current.remove(ITEM_ID)
    })
    await waitFor(() => expect(queryClient.getQueryData<Task[]>(dayKey)).toEqual([]))
    act(() => undo?.())

    // Not inserted before the delete has landed.
    await new Promise((r) => setTimeout(r, 20))
    expect(db.insert).not.toHaveBeenCalled()

    slowDelete.resolve({ error: null })
    await waitFor(() => expect(db.insert).toHaveBeenCalledTimes(1))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('returns null for a task that is not loaded', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useDeleteTask(), { wrapper })
    expect(result.current.remove(ITEM_ID)).toBeNull()
    expect(db.delete).not.toHaveBeenCalled()
  })
})
