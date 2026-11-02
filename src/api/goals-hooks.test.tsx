import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/app/auth-context'
import type { Goal } from '@/schemas/goals'
import { keyResultRow, useGoalSeries } from './goals'

// --- fake Supabase: every query is recorded; `db.respond` decides the result ---
type Call = { table: string; ops: [string, unknown[]][] }
type Result = { data?: unknown; error: { message: string } | null }
const db = vi.hoisted(() => ({
  calls: [] as Call[],
  respond: (_call: Call): Result => ({ data: [], error: null }),
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

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const auth = { session: null, user: { id: USER_ID } as User, loading: false }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  )
  return { wrapper }
}

function goal(fields: Partial<Goal>): Goal {
  return {
    id: '5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e9f',
    user_id: USER_ID,
    objective_id: '5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e9f',
    kind: 'number',
    completed_on: null,
    title: 'Goal',
    short_label: 'Goal',
    type: 'total',
    source_kind: 'metric',
    source_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    unit: null,
    target: 100,
    start_value: 0,
    start_date: '2026-01-01',
    deadline: '2026-12-31',
    include_pipeline: false,
    created_at: '2026-01-01T10:00:00+00:00',
    ...fields,
  }
}

describe('useGoalSeries', () => {
  it('groups metric entries and routine ticks per month and works out the current value', async () => {
    db.respond = (call) =>
      call.table === 'metric_entries'
        ? {
            data: [
              { entry_date: '2026-01-05', value: 2, note: null },
              { entry_date: '2026-01-12', value: 3, note: 'Gym' },
              { entry_date: '2026-02-02', value: 4, note: null },
            ],
            error: null,
          }
        : { data: [{ date: '2026-01-02' }, { date: '2026-01-03' }, { date: '2026-03-10' }], error: null }
    const { wrapper } = setup()

    // Metric, total goal: months added up, current = sum of everything.
    const metric = renderHook(() => useGoalSeries(goal({ id: 'g-metric' })), { wrapper })
    await waitFor(() => expect(metric.result.current.isSuccess).toBe(true))
    expect(metric.result.current.data).toEqual({
      months: [
        { month: '2026-01', value: 5, note: 'Gym', entries: 2 },
        { month: '2026-02', value: 4, note: null, entries: 1 },
      ],
      current: 9,
    })
    const metricCall = db.calls.find((c) => c.table === 'metric_entries')
    expect(metricCall?.ops).toContainEqual(['eq', ['metric_id', '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d']])
    expect(metricCall?.ops).toContainEqual(['gte', ['entry_date', '2026-01-01']])

    // Routine, level goal: done days counted per month, current = best month.
    const routine = renderHook(() => useGoalSeries(goal({ id: 'g-routine', source_kind: 'routine', type: 'level' })), {
      wrapper,
    })
    await waitFor(() => expect(routine.result.current.isSuccess).toBe(true))
    expect(routine.result.current.data).toEqual({
      months: [
        { month: '2026-01', value: 2, note: null, entries: 2 },
        { month: '2026-03', value: 1, note: null, entries: 1 },
      ],
      current: 2,
    })
    const routineCall = db.calls.find((c) => c.table === 'routine_checks')
    expect(routineCall?.ops).toContainEqual(['eq', ['done', true]])
  })

  it('a hand-updated goal reads its typed-in values: latest value, chart points, newest first', async () => {
    db.calls = []
    db.respond = (call) =>
      call.table === 'goal_updates'
        ? {
            data: [
              { id: 'u1', user_id: USER_ID, goal_id: 'g-manual', date: '2026-01-10', value: 3500, note: null, created_at: '2026-01-10T10:00:00+00:00' },
              { id: 'u2', user_id: USER_ID, goal_id: 'g-manual', date: '2026-02-10', value: 4200, note: 'Bonus', created_at: '2026-02-10T10:00:00+00:00' },
            ],
            error: null,
          }
        : { data: [], error: null }
    const { wrapper } = setup()
    const manual = renderHook(
      () => useGoalSeries(goal({ id: 'g-manual', source_kind: 'manual', source_id: null, unit: 'bam', start_value: 3000 })),
      { wrapper },
    )
    await waitFor(() => expect(manual.result.current.isSuccess).toBe(true))
    const data = manual.result.current.data
    expect(data?.current).toBe(4200)
    expect(data?.manual?.updates.map((u) => u.id)).toEqual(['u2', 'u1'])
    expect(data?.manual?.points[0]).toEqual({ date: '2026-01-01', value: 3000 })
    expect(data?.manual?.lastUpdate).toBe('2026-02-10')
    expect(db.calls.map((c) => c.table)).toEqual(['goal_updates'])
    expect(db.calls[0]?.ops).toContainEqual(['eq', ['goal_id', 'g-manual']])
  })
})

describe('other key result kinds', () => {
  it('a habit ticked by hand reads its ticks; one linked to a routine item reads routine ticks up to the deadline', async () => {
    db.calls = []
    db.respond = (call) =>
      call.table === 'goal_updates'
        ? {
            data: [{ id: 't1', user_id: USER_ID, goal_id: 'g-habit', date: '2026-01-05', value: 1, note: null, created_at: '2026-01-05T10:00:00+00:00' }],
            error: null,
          }
        : { data: [{ date: '2026-01-02' }, { date: '2026-01-03' }], error: null }
    const { wrapper } = setup()
    const manual = renderHook(() => useGoalSeries(goal({ id: 'g-habit', kind: 'habit', source_kind: 'manual', source_id: null, target: 3 })), { wrapper })
    await waitFor(() => expect(manual.result.current.isSuccess).toBe(true))
    expect(manual.result.current.data?.habit?.doneDates).toEqual(['2026-01-05'])
    expect(manual.result.current.data?.current).toBe(1)

    const linked = renderHook(() => useGoalSeries(goal({ id: 'g-habit-r', kind: 'habit', source_kind: 'routine', target: 3, deadline: '2026-01-31' })), { wrapper })
    await waitFor(() => expect(linked.result.current.isSuccess).toBe(true))
    expect(linked.result.current.data?.habit?.doneDates).toEqual(['2026-01-02', '2026-01-03'])
    expect(db.calls.find((c) => c.table === 'routine_checks')?.ops).toContainEqual(['lte', ['date', '2026-01-31']])
  })

  it('steps come in position order; done / not done reads nothing', async () => {
    db.calls = []
    const step = (id: string, position: number, done_on: string | null) => ({
      id, user_id: USER_ID, goal_id: 'g-steps', title: id, due_date: null, done_on, position, created_at: '2026-01-01T10:00:00+00:00',
    })
    db.respond = () => ({ data: [step('b', 1, null), step('a', 0, '2026-01-04')], error: null })
    const { wrapper } = setup()
    const steps = renderHook(() => useGoalSeries(goal({ id: 'g-steps', kind: 'milestones', source_kind: 'manual', source_id: null, target: 1 })), { wrapper })
    await waitFor(() => expect(steps.result.current.isSuccess).toBe(true))
    expect(steps.result.current.data?.milestones?.map((m) => m.id)).toEqual(['a', 'b'])
    expect(steps.result.current.data?.current).toBe(1)

    db.calls = []
    const done = renderHook(() => useGoalSeries(goal({ id: 'g-done', kind: 'done', source_kind: 'manual', source_id: null, target: 1, completed_on: '2026-02-01' })), { wrapper })
    await waitFor(() => expect(done.result.current.isSuccess).toBe(true))
    expect(done.result.current.data).toEqual({ months: [], current: 1 })
    expect(db.calls).toEqual([])
  })
})

describe('keyResultRow', () => {
  const base = { id: 'kr', user_id: USER_ID, created_at: '2026-10-28T10:00:00+00:00' }
  const dates = { start_date: '2026-10-28', deadline: '2027-05-03' }

  it('stores each kind in the shared columns', () => {
    expect(keyResultRow({ kind: 'number', title: '€10,000 saved', unit: 'eur', start_value: 3000, target: 10000, ...dates }, 'obj', base)).toMatchObject({
      objective_id: 'obj', kind: 'number', source_kind: 'manual', unit: 'eur', start_value: 3000, target: 10000, short_label: '€10,000 saved',
    })
    expect(keyResultRow({ kind: 'habit', title: 'Gym', per_week: 3, routine_item_id: 'r1', ...dates }, 'obj', base)).toMatchObject({
      kind: 'habit', source_kind: 'routine', source_id: 'r1', target: 3, unit: null,
    })
    expect(keyResultRow({ kind: 'habit', title: 'Gym', per_week: 3, routine_item_id: null, ...dates }, 'obj', base)).toMatchObject({
      source_kind: 'manual', source_id: null, target: 3,
    })
    expect(keyResultRow({ kind: 'done', title: 'Get the driving licence', ...dates }, 'obj', base)).toMatchObject({
      kind: 'done', source_kind: 'manual', target: 1, completed_on: null, short_label: 'Get the driving licence',
    })
  })
})
