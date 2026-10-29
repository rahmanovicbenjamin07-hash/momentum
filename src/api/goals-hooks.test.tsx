import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/app/auth-context'
import type { Goal } from '@/schemas/goals'
import { useGoalSeries } from './goals'

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
    title: 'Goal',
    short_label: 'Goal',
    type: 'total',
    source_kind: 'metric',
    source_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    target: 100,
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
})
