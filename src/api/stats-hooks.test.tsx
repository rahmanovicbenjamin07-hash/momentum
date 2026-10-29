import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/app/auth-context'
import type { MetricEntry } from '@/schemas/stats'
import { queryKeys } from './keys'
import {
  dealEntryFields,
  nextMonthStart,
  normaliseYears,
  replaceMonthValue,
  useCreateMetric,
  useLogValue,
  useMetricEntries,
  useSaveWonDeal,
  type MetricRow,
} from './metrics'
import { splitRange, useOutreachFunnel, useRoutineDays } from './stats'

// --- fake Supabase: every query/rpc is recorded; `db.respond` decides the result ---
type Call = { table: string; ops: [string, unknown[]][] }
type Result = { data?: unknown; error: { message: string; code?: string } | null }
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
  const start = (table: string, ops: [string, unknown[]][] = []) => {
    const call: Call = { table, ops }
    db.calls.push(call)
    return builder(call)
  }
  return {
    supabase: {
      from: (table: string) => start(table),
      rpc: (name: string, args: unknown) => start(`rpc:${name}`, [['args', [args]]]),
    },
  }
})
const toastError = vi.hoisted(() => vi.fn<(message: string) => void>())
vi.mock('sonner', () => ({ toast: { error: toastError } }))

const USER_ID = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'
const METRIC_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const MONEY_ID = '2b3c4d5e-6f70-4b8c-9d0e-1f2a3b4c5d6e'
const CONTACT_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b'

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

function entry(overrides: Partial<MetricEntry> = {}): MetricEntry {
  return {
    id: crypto.randomUUID(),
    user_id: USER_ID,
    created_at: '2026-10-01T10:00:00+00:00',
    metric_id: METRIC_ID,
    entry_date: '2026-10-01',
    value: 100,
    note: null,
    contact_id: null,
    ...overrides,
  }
}

const opsOf = (call: Call | undefined) => call?.ops.map(([name]) => name)
const argsOf = (call: Call | undefined, op: string) => call?.ops.find(([name]) => name === op)?.[1]

beforeEach(() => {
  db.calls.length = 0
  db.respond = () => ({ data: [], error: null })
  toastError.mockClear()
})

// ===========================================================================
// Pure helpers
// ===========================================================================

describe('splitRange', () => {
  it('splits into back-to-back parts of at most n days', () => {
    expect(splitRange('2026-01-01', '2026-01-10', 4)).toEqual([
      ['2026-01-01', '2026-01-04'],
      ['2026-01-05', '2026-01-08'],
      ['2026-01-09', '2026-01-10'],
    ])
  })
  it('keeps a short range in one part and returns nothing for a reversed range', () => {
    expect(splitRange('2026-10-28', '2026-10-28', 31)).toEqual([['2026-10-28', '2026-10-28']])
    expect(splitRange('2026-10-28', '2026-10-01', 31)).toEqual([])
  })
  it('covers a whole year with 31-day parts', () => {
    const parts = splitRange('2026-01-01', '2026-12-31', 31)
    expect(parts).toHaveLength(12)
    expect(parts.at(-1)).toEqual(['2026-12-08', '2026-12-31'])
  })
})

describe('metric helpers', () => {
  it('nextMonthStart rolls over the year', () => {
    expect(nextMonthStart('2026-10')).toBe('2026-11-01')
    expect(nextMonthStart('2026-12')).toBe('2027-01-01')
  })
  it('normaliseYears sorts and removes repeats', () => {
    expect(normaliseYears([2026, 2025, 2026])).toEqual([2025, 2026])
  })
  it('replaceMonthValue swaps the hand-logged entries of that month and keeps deal entries', () => {
    const week1 = entry({ entry_date: '2026-10-05', value: 30 })
    const week2 = entry({ entry_date: '2026-10-12', value: 31 })
    const deal = entry({ entry_date: '2026-10-01', value: 3000, contact_id: CONTACT_ID })
    const september = entry({ entry_date: '2026-09-01', value: 900 })
    const other = entry({ metric_id: MONEY_ID, entry_date: '2026-10-01' })
    const row = entry({ entry_date: '2026-10-01', value: 120 })

    const result = replaceMonthValue([week1, week2, deal, september, other], row)
    expect(result.map((e) => e.id)).toEqual([september.id, deal.id, other.id, row.id])
  })
  it('dealEntryFields makes the Money earned entry for a won deal', () => {
    expect(
      dealEntryFields(
        { contactId: CONTACT_ID, contactName: 'Fitbox Gym', amount: 3000, month: '2026-08', addToMoneyEarned: true },
        MONEY_ID,
      ),
    ).toEqual({ metric_id: MONEY_ID, contact_id: CONTACT_ID, entry_date: '2026-08-01', value: 3000, note: 'Won: Fitbox Gym' })
  })
})

// ===========================================================================
// Stats queries
// ===========================================================================

describe('stats hooks', () => {
  it('useOutreachFunnel passes the range (null = all time)', async () => {
    db.respond = () => ({ data: [{ stage: 'contacted', step: 1, contacts: 5, pct_of_previous: null }], error: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useOutreachFunnel(null, '2026-10-28'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(db.calls[0]?.table).toBe('rpc:stats_outreach_funnel')
    expect(argsOf(db.calls[0], 'args')).toEqual([{ p_from: null, p_to: '2026-10-28' }])
    expect(result.current.data).toHaveLength(1)
  })

  it('useRoutineDays fetches long ranges in parts and joins them in order', async () => {
    db.respond = (call) => {
      const [args] = argsOf(call, 'args') as [{ p_from: string }]
      return { data: [{ day: args.p_from }], error: null }
    }
    const { wrapper } = setup()
    const { result } = renderHook(() => useRoutineDays('2026-01-01', '2026-03-31'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(db.calls).toHaveLength(3)
    expect(result.current.data?.map((r) => r.day)).toEqual(['2026-01-01', '2026-02-01', '2026-03-04'])
  })

  it('useRoutineDays fails when any part fails', async () => {
    let n = 0
    db.respond = () => (++n === 2 ? { error: { message: 'boom' } } : { data: [], error: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useRoutineDays('2026-01-01', '2026-03-31'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// ===========================================================================
// Metrics
// ===========================================================================

describe('useMetricEntries', () => {
  it('loads the given years of one metric, keyed by sorted years', async () => {
    db.respond = () => ({ data: [entry()], error: null })
    const { wrapper, queryClient } = setup()
    const { result } = renderHook(() => useMetricEntries(METRIC_ID, [2026, 2025]), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const call = db.calls[0]
    expect(argsOf(call, 'eq')).toEqual(['metric_id', METRIC_ID])
    expect(argsOf(call, 'gte')).toEqual(['entry_date', '2025-01-01'])
    expect(argsOf(call, 'lt')).toEqual(['entry_date', '2027-01-01'])
    expect(queryClient.getQueryData(queryKeys.stats.metricEntries(METRIC_ID, [2025, 2026]))).toHaveLength(1)
  })

  it('waits until there is a metric id', () => {
    const { wrapper } = setup()
    renderHook(() => useMetricEntries(undefined, [2026]), { wrapper })
    expect(db.calls).toHaveLength(0)
  })
})

describe('useLogValue', () => {
  const key = queryKeys.stats.metricEntries(METRIC_ID, [2025, 2026])

  it('replaces the month in the cache at once, saves, then removes the old hand-logged rows', async () => {
    const { wrapper, queryClient } = setup()
    const old = entry({ entry_date: '2026-10-05', value: 30 })
    queryClient.setQueryData(key, [old])
    const { result } = renderHook(() => useLogValue(), { wrapper })

    await act(() =>
      result.current.mutateAsync({ metricId: METRIC_ID, values: { month: '2026-10', value: 2200, note: '2 new clients' } }),
    )

    const [insert, cleanup] = db.calls
    expect(insert?.table).toBe('metric_entries')
    expect(argsOf(insert, 'insert')?.[0]).toMatchObject({ entry_date: '2026-10-01', value: 2200, note: '2 new clients' })
    expect(opsOf(cleanup)).toEqual(['delete', 'eq', 'is', 'gte', 'lt', 'neq'])
    expect(argsOf(cleanup, 'lt')).toEqual(['entry_date', '2026-11-01'])
  })

  it('shows the new value before the save finishes and rolls back with a toast on failure', async () => {
    const { wrapper, queryClient } = setup()
    const old = entry({ entry_date: '2026-10-05', value: 30 })
    queryClient.setQueryData(key, [old])
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    db.respond = () => gate.then(() => ({ error: { message: 'network down' } })) as unknown as Result
    const { result } = renderHook(() => useLogValue(), { wrapper })

    act(() => result.current.mutate({ metricId: METRIC_ID, values: { month: '2026-10', value: 2200, note: undefined } }))
    await waitFor(() =>
      expect(queryClient.getQueryData<MetricEntry[]>(key)?.map((e) => e.value)).toEqual([2200]),
    )
    release()
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Couldn't save the value. Try again."))
    expect(queryClient.getQueryData<MetricEntry[]>(key)).toEqual([old])
  })
})

describe('useCreateMetric', () => {
  it('adds the metric after the others and explains a duplicate name', async () => {
    const { wrapper, queryClient } = setup()
    queryClient.setQueryData<MetricRow[]>(queryKeys.stats.metrics(), [
      { ...entryBase(), name: 'Money earned', unit: 'eur', log_every: 'monthly', yearly_goal: null, builtin: 'money_earned', position: 2 },
    ])
    db.respond = () => ({ error: { message: 'duplicate', code: '23505' } })
    const { result } = renderHook(() => useCreateMetric(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ name: 'Km run', unit: 'km', log_every: 'weekly' }).catch(() => {})
    })
    expect(argsOf(db.calls[0], 'insert')?.[0]).toMatchObject({ name: 'Km run', position: 3, yearly_goal: null })
    expect(toastError).toHaveBeenCalledWith('You already have a metric with that name.')
  })
})

describe('useSaveWonDeal', () => {
  const deal = { contactId: CONTACT_ID, contactName: 'Fitbox Gym', amount: 3000, month: '2026-08' }

  function withMoneyMetric(queryClient: QueryClient) {
    queryClient.setQueryData<MetricRow[]>(queryKeys.stats.metrics(), [
      { ...entryBase(), id: MONEY_ID, name: 'Money earned', unit: 'eur', log_every: 'monthly', yearly_goal: null, builtin: 'money_earned', position: 0 },
    ])
  }

  it('saves the deal on the lead, then upserts one Money earned entry for it', async () => {
    const { wrapper, queryClient } = setup()
    withMoneyMetric(queryClient)
    const { result } = renderHook(() => useSaveWonDeal(), { wrapper })

    await act(() => result.current.mutateAsync({ ...deal, addToMoneyEarned: true }))

    const [contactUpdate, upsert] = db.calls
    expect(contactUpdate?.table).toBe('contacts')
    expect(argsOf(contactUpdate, 'update')?.[0]).toEqual({ won_amount: 3000, won_month: '2026-08-01' })
    expect(upsert?.table).toBe('metric_entries')
    expect(argsOf(upsert, 'upsert')).toEqual([
      { metric_id: MONEY_ID, contact_id: CONTACT_ID, entry_date: '2026-08-01', value: 3000, note: 'Won: Fitbox Gym' },
      { onConflict: 'metric_id,contact_id' },
    ])
  })

  it('removes the deal entry when "Add to Money earned" is unticked', async () => {
    const { wrapper, queryClient } = setup()
    withMoneyMetric(queryClient)
    const { result } = renderHook(() => useSaveWonDeal(), { wrapper })

    await act(() => result.current.mutateAsync({ ...deal, addToMoneyEarned: false }))

    expect(opsOf(db.calls[1])).toEqual(['delete', 'eq', 'eq'])
    expect(argsOf(db.calls[1], 'eq')).toEqual(['metric_id', MONEY_ID])
  })

  it('looks the metric up when it is not cached, and says so when it was deleted', async () => {
    db.respond = (call) => (call.table === 'metrics' ? { data: null, error: null } : { data: null, error: null })
    const { wrapper } = setup()
    const { result } = renderHook(() => useSaveWonDeal(), { wrapper })

    await expect(result.current.mutateAsync({ ...deal, addToMoneyEarned: true })).rejects.toThrow(
      'Deal saved. No "Money earned" metric. Add one in Stats → My metrics.',
    )
    expect(db.calls.map((c) => c.table)).toEqual(['contacts', 'metrics'])
  })
})

function entryBase() {
  return { id: METRIC_ID, user_id: USER_ID, created_at: '2026-01-01T00:00:00+00:00' }
}
