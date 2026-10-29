import type { User } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/app/auth-context'
import type { Contact, Template, Touch } from '@/schemas/outreach'
import { buildContact, stagePatch, useCreateContact, useDeleteContact, useSetStage } from './contacts'
import { queryKeys } from './keys'
import { useDeleteTemplate } from './templates'
import { addToTimeline, buildTouch, contactAfterTouch, useLogTouch, weekRange } from './touches'

// --- fake Supabase: each test decides what the next write resolves to -------
type WriteResult = Promise<{ error: { message: string } | null }>
const db = vi.hoisted(() => ({
  insert: vi.fn<(table: string, row: unknown) => WriteResult>(),
  update: vi.fn<(table: string, patch: unknown, id: string) => WriteResult>(),
  delete: vi.fn<(table: string, id: string) => WriteResult>(),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: unknown) => db.insert(table, row),
      update: (patch: unknown) => ({ eq: (_col: string, id: string) => db.update(table, patch, id) }),
      delete: () => ({ eq: (_col: string, id: string) => db.delete(table, id) }),
    }),
  },
}))
const toastError = vi.hoisted(() => vi.fn<(message: string) => void>())
vi.mock('sonner', () => ({ toast: { error: toastError } }))

const USER_ID = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'
const CONTACT_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b'
const TODAY = '2026-10-28'
const ok = { error: null }
const fail = { error: { message: 'network down' } }

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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

function contact(overrides: Partial<Contact> = {}): Contact {
  const row = buildContact(
    { source: 'linkedin', name: 'Emir Kovač', stage: 'new', next_follow_up: null, tags: [] },
    { id: CONTACT_ID, userId: USER_ID },
  )
  return { ...row, ...overrides }
}

function touch(overrides: Partial<Touch> = {}): Touch {
  const row = buildTouch(
    { channel: 'linkedin', direction: 'sent', template_id: undefined, body: undefined, got_reply: false },
    { id: 'touch-1', userId: USER_ID, contactId: CONTACT_ID, occurredAt: '2026-10-28T09:00:00.000Z' },
  )
  return { ...row, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// Pure helpers
// ===========================================================================

describe('contact helpers', () => {
  it('buildContact fills defaults and trims the name', () => {
    const row = buildContact(
      { source: 'maps', name: '  Smile Dental  ', stage: 'new', next_follow_up: '2026-10-31', tags: ['no-website'] },
      { id: CONTACT_ID, userId: USER_ID },
    )
    expect(row).toMatchObject({
      id: CONTACT_ID,
      user_id: USER_ID,
      name: 'Smile Dental',
      priority: 'medium',
      notes: [],
      email: null,
      last_touch_at: null,
      tags: ['no-website'],
    })
  })

  it('stagePatch sets the follow-up from the stage', () => {
    expect(stagePatch({ id: CONTACT_ID, stage: 'contacted', today: TODAY })).toEqual({
      stage: 'contacted',
      next_follow_up: '2026-10-31',
    })
    expect(stagePatch({ id: CONTACT_ID, stage: 'meeting', today: TODAY }).next_follow_up).toBe('2026-10-29')
    expect(stagePatch({ id: CONTACT_ID, stage: 'new', today: TODAY }).next_follow_up).toBeNull()
  })

  it('stagePatch stores Won amount and month, and the Lost reason', () => {
    expect(stagePatch({ id: CONTACT_ID, stage: 'won', today: TODAY, won: { amount: 1200, month: '2026-10' } })).toEqual(
      { stage: 'won', next_follow_up: null, won_amount: 1200, won_month: '2026-10-01' },
    )
    expect(stagePatch({ id: CONTACT_ID, stage: 'lost', today: TODAY, lostReason: 'Too expensive' })).toMatchObject({
      lost_reason: 'Too expensive',
    })
    // Won details are ignored on other stages.
    expect(stagePatch({ id: CONTACT_ID, stage: 'replied', today: TODAY, won: { amount: 5, month: '2026-10' } })).toEqual(
      { stage: 'replied', next_follow_up: '2026-10-30' },
    )
  })
})

describe('touch helpers', () => {
  it('a sent touch pushes the follow-up to today + 3 and sets last touch', () => {
    const next = contactAfterTouch(contact({ next_follow_up: '2026-10-28' }), touch(), TODAY)
    expect(next.next_follow_up).toBe('2026-10-31')
    expect(next.last_touch_at).toBe('2026-10-28T09:00:00.000Z')
  })

  it('a received message updates last touch only; a note changes nothing', () => {
    const before = contact({ next_follow_up: '2026-10-29', last_touch_at: '2026-10-20T09:00:00.000Z' })
    const received = contactAfterTouch(before, touch({ direction: 'received' }), TODAY)
    expect(received).toMatchObject({ next_follow_up: '2026-10-29', last_touch_at: '2026-10-28T09:00:00.000Z' })
    expect(contactAfterTouch(before, touch({ direction: 'note' }), TODAY)).toEqual(before)
  })

  it('an older touch does not move last touch back', () => {
    const before = contact({ last_touch_at: '2026-10-28T12:00:00.000Z' })
    expect(contactAfterTouch(before, touch({ direction: 'received' }), TODAY).last_touch_at).toBe(
      '2026-10-28T12:00:00.000Z',
    )
  })

  it('addToTimeline keeps newest first', () => {
    const old = touch({ id: 'old', occurred_at: '2026-10-27T09:00:00.000Z' })
    const newer = touch({ id: 'new', occurred_at: '2026-10-28T10:00:00.000Z' })
    expect(addToTimeline([newer], old).map((t) => t.id)).toEqual(['new', 'old'])
    expect(addToTimeline([old], newer).map((t) => t.id)).toEqual(['new', 'old'])
  })

  it('weekRange is Monday to Monday, Sarajevo time, in winter and summer', () => {
    expect(weekRange('2026-10-28')).toEqual({ from: '2026-10-25T23:00:00.000Z', to: '2026-11-01T23:00:00.000Z' })
    expect(weekRange('2026-07-19')).toEqual({ from: '2026-07-12T22:00:00.000Z', to: '2026-07-19T22:00:00.000Z' })
  })
})

// ===========================================================================
// Hooks
// ===========================================================================

describe('useSetStage', () => {
  const listKey = queryKeys.outreach.contacts()
  const oneKey = queryKeys.outreach.contact(CONTACT_ID)

  it('moves the lead instantly everywhere and rolls back with a toast on failure', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData<Contact[]>(listKey, [contact()])
    queryClient.setQueryData<Contact>(oneKey, contact())
    const save = deferred<{ error: { message: string } | null }>()
    db.update.mockReturnValue(save.promise)

    const { result } = renderHook(() => useSetStage(), { wrapper })
    act(() => result.current.mutate({ id: CONTACT_ID, stage: 'contacted', today: TODAY }))

    await waitFor(() => expect(queryClient.getQueryData<Contact[]>(listKey)?.[0]?.stage).toBe('contacted'))
    expect(queryClient.getQueryData<Contact>(oneKey)).toMatchObject({ stage: 'contacted', next_follow_up: '2026-10-31' })
    expect(db.update).toHaveBeenCalledWith(
      'contacts',
      { stage: 'contacted', next_follow_up: '2026-10-31' },
      CONTACT_ID,
    )

    save.resolve(fail)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData<Contact[]>(listKey)?.[0]?.stage).toBe('new')
    expect(queryClient.getQueryData<Contact>(oneKey)?.stage).toBe('new')
    expect(toastError).toHaveBeenCalledWith("Couldn't move the lead. Try again.")
  })
})

describe('useCreateContact', () => {
  it('adds the lead to the top of the list and resolves with it', async () => {
    const { queryClient, wrapper } = setup()
    const listKey = queryKeys.outreach.contacts()
    queryClient.setQueryData<Contact[]>(listKey, [contact()])
    db.insert.mockResolvedValue(ok)

    const { result } = renderHook(() => useCreateContact(), { wrapper })
    let created: Contact | undefined
    await act(async () => {
      created = await result.current.mutateAsync({
        source: 'other',
        name: 'Lejla Hodžić',
        stage: 'new',
        next_follow_up: '2026-10-31',
        tags: [],
      })
    })

    expect(created).toMatchObject({ name: 'Lejla Hodžić', user_id: USER_ID })
    expect(queryClient.getQueryData<Contact[]>(listKey)?.map((c) => c.name)).toEqual(['Lejla Hodžić', 'Emir Kovač'])
    expect(db.insert).toHaveBeenCalledWith('contacts', expect.objectContaining({ id: created?.id, name: 'Lejla Hodžić' }))
  })
})

describe('useDeleteContact', () => {
  it('removes the lead instantly and brings it back if deleting fails', async () => {
    const { queryClient, wrapper } = setup()
    const listKey = queryKeys.outreach.contacts()
    queryClient.setQueryData<Contact[]>(listKey, [contact()])
    const save = deferred<{ error: { message: string } | null }>()
    db.delete.mockReturnValue(save.promise)

    const { result } = renderHook(() => useDeleteContact(), { wrapper })
    act(() => result.current.mutate(CONTACT_ID))
    await waitFor(() => expect(queryClient.getQueryData<Contact[]>(listKey)).toEqual([]))

    save.resolve(fail)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData<Contact[]>(listKey)).toHaveLength(1)
    expect(toastError).toHaveBeenCalledWith("Couldn't delete the lead. Try again.")
  })
})

describe('useLogTouch', () => {
  it('a sent touch shows on the timeline and week, and sets the follow-up to today + 3', async () => {
    const { queryClient, wrapper } = setup()
    const timelineKey = queryKeys.outreach.touches(CONTACT_ID)
    const weekKey = queryKeys.outreach.weekTouches('2026-10-26')
    const otherWeek = queryKeys.outreach.weekTouches('2026-10-19')
    const listKey = queryKeys.outreach.contacts()
    queryClient.setQueryData<Touch[]>(timelineKey, [])
    queryClient.setQueryData<Touch[]>(weekKey, [])
    queryClient.setQueryData<Touch[]>(otherWeek, [])
    queryClient.setQueryData<Contact[]>(listKey, [contact({ stage: 'contacted', next_follow_up: '2026-10-28' })])
    db.insert.mockResolvedValue(ok)
    db.update.mockResolvedValue(ok)

    const { result } = renderHook(() => useLogTouch(), { wrapper })
    act(() =>
      result.current.mutate({
        contactId: CONTACT_ID,
        today: TODAY,
        occurredAt: '2026-10-28T09:00:00.000Z',
        values: { channel: 'linkedin', direction: 'sent', template_id: undefined, body: 'Hi Emir', got_reply: false },
      }),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData<Touch[]>(timelineKey)?.[0]).toMatchObject({ body: 'Hi Emir', direction: 'sent' })
    expect(queryClient.getQueryData<Touch[]>(weekKey)).toHaveLength(1)
    expect(queryClient.getQueryData(otherWeek)).toEqual([])
    expect(queryClient.getQueryData<Contact[]>(listKey)?.[0]?.next_follow_up).toBe('2026-10-31')
    expect(db.insert).toHaveBeenCalledWith('touches', expect.objectContaining({ contact_id: CONTACT_ID, body: 'Hi Emir' }))
    expect(db.update).toHaveBeenCalledWith('contacts', { next_follow_up: '2026-10-31' }, CONTACT_ID)
  })

  it('a note does not touch the follow-up', async () => {
    const { wrapper } = setup()
    db.insert.mockResolvedValue(ok)

    const { result } = renderHook(() => useLogTouch(), { wrapper })
    act(() =>
      result.current.mutate({
        contactId: CONTACT_ID,
        today: TODAY,
        values: { channel: 'other', direction: 'note', template_id: undefined, body: 'Prefers calls', got_reply: false },
      }),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(db.update).not.toHaveBeenCalled()
  })
})

describe('useDeleteTemplate', () => {
  it('removes the template instantly and restores it if deleting fails', async () => {
    const { queryClient, wrapper } = setup()
    const key = queryKeys.outreach.templates()
    const template: Template = {
      id: 'tpl-1',
      user_id: USER_ID,
      created_at: '2026-10-20T09:00:00.000Z',
      name: 'First message',
      channel: null,
      body: 'Hi {{first_name}}',
    }
    queryClient.setQueryData<Template[]>(key, [template])
    const save = deferred<{ error: { message: string } | null }>()
    db.delete.mockReturnValue(save.promise)

    const { result } = renderHook(() => useDeleteTemplate(), { wrapper })
    act(() => result.current.mutate('tpl-1'))
    await waitFor(() => expect(queryClient.getQueryData<Template[]>(key)).toEqual([]))

    save.resolve(fail)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData<Template[]>(key)).toEqual([template])
  })
})
