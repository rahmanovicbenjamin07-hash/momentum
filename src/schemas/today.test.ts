import { describe, expect, it } from 'vitest'
import {
  dailyLogSchema,
  dailyNoteFormSchema,
  quickAddFormSchema,
  routineCheckSchema,
  routineItemSchema,
  taskSchema,
  todayItemSchema,
} from './today'

const base = {
  id: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  user_id: '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4',
  created_at: '2026-10-28T19:19:45.123456+00:00',
}
const otherId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const week = [true, true, true, true, true, false, false]

describe('routineItemSchema', () => {
  const valid = { ...base, title: 'Wake up', days: week, time: '06:00:00', position: 0, active: true }

  it('accepts a database row (time as HH:MM:SS)', () => {
    expect(routineItemSchema.safeParse(valid).success).toBe(true)
    expect(routineItemSchema.safeParse({ ...valid, time: null }).success).toBe(true)
  })

  it('requires exactly 7 days', () => {
    expect(routineItemSchema.safeParse({ ...valid, days: [true, false] }).success).toBe(false)
  })

  it('rejects an invalid time or empty title', () => {
    expect(routineItemSchema.safeParse({ ...valid, time: '24:00' }).success).toBe(false)
    expect(routineItemSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false)
  })
})

describe('routineCheckSchema', () => {
  const valid = { ...base, routine_item_id: otherId, date: '2026-10-27', done: false, miss_reason: 'No time' }

  it('accepts a check with a miss reason or none', () => {
    expect(routineCheckSchema.safeParse(valid).success).toBe(true)
    expect(routineCheckSchema.safeParse({ ...valid, miss_reason: null }).success).toBe(true)
  })

  it('rejects unknown reasons and bad dates', () => {
    expect(routineCheckSchema.safeParse({ ...valid, miss_reason: 'Lazy' }).success).toBe(false)
    expect(routineCheckSchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false)
  })
})

describe('taskSchema', () => {
  const valid = {
    ...base,
    title: 'Send proposal to Lejla Hodžić',
    notes: null,
    due_date: '2026-10-28',
    time: null,
    tag: 'outreach',
    priority: 'high',
    status: 'todo',
    completed_at: null,
    position: 3,
    contact_id: null,
  }

  it('accepts a task row', () => {
    expect(taskSchema.safeParse(valid).success).toBe(true)
    expect(
      taskSchema.safeParse({ ...valid, status: 'done', completed_at: '2026-10-28T09:00:00+00:00', contact_id: otherId })
        .success,
    ).toBe(true)
  })

  it('rejects unknown priority / status and bad tags', () => {
    expect(taskSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, status: 'archived' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, tag: '#outreach' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, tag: 'two words' }).success).toBe(false)
  })

  it('limits title and notes length', () => {
    expect(taskSchema.safeParse({ ...valid, title: 'x'.repeat(201) }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, notes: 'x'.repeat(5001) }).success).toBe(false)
  })
})

describe('dailyLogSchema', () => {
  const valid = { ...base, date: '2026-10-28', note: 'Good focus', energy: 4 }

  it('accepts energy 1–5 or null', () => {
    expect(dailyLogSchema.safeParse(valid).success).toBe(true)
    expect(dailyLogSchema.safeParse({ ...valid, energy: null, note: null }).success).toBe(true)
  })

  it('rejects energy outside 1–5 or not whole', () => {
    for (const energy of [0, 6, 2.5]) {
      expect(dailyLogSchema.safeParse({ ...valid, energy }).success).toBe(false)
    }
  })
})

describe('quickAddFormSchema', () => {
  it('trims text, turns an empty time into undefined and defaults repeat', () => {
    expect(quickAddFormSchema.parse({ text: '  Call Amir #outreach !high ', time: '' })).toEqual({
      text: 'Call Amir #outreach !high',
      time: undefined,
      repeat: 'just_today',
    })
  })

  it('keeps a valid time and repeat', () => {
    expect(quickAddFormSchema.parse({ text: 'Read', time: '21:30', repeat: 'every_day' })).toEqual({
      text: 'Read',
      time: '21:30',
      repeat: 'every_day',
    })
  })

  it('rejects empty or too long text', () => {
    expect(quickAddFormSchema.safeParse({ text: '   ' }).error?.issues[0]?.message).toBe('Type a task')
    expect(quickAddFormSchema.safeParse({ text: 'x'.repeat(201) }).success).toBe(false)
  })

  it('rejects a bad time or repeat', () => {
    expect(quickAddFormSchema.safeParse({ text: 'Read', time: '9:30' }).success).toBe(false)
    expect(quickAddFormSchema.safeParse({ text: 'Read', time: '25:00' }).success).toBe(false)
    expect(quickAddFormSchema.safeParse({ text: 'Read', repeat: 'monthly' }).success).toBe(false)
  })
})

describe('dailyNoteFormSchema', () => {
  it('accepts an empty note and no energy', () => {
    expect(dailyNoteFormSchema.safeParse({ note: '', energy: null }).success).toBe(true)
  })

  it('limits the note to 5000 characters and energy to 1–5', () => {
    expect(dailyNoteFormSchema.safeParse({ note: 'x'.repeat(5000), energy: 5 }).success).toBe(true)
    expect(dailyNoteFormSchema.safeParse({ note: 'x'.repeat(5001), energy: 3 }).success).toBe(false)
    expect(dailyNoteFormSchema.safeParse({ note: '', energy: 6 }).success).toBe(false)
  })
})

describe('todayItemSchema', () => {
  it('accepts a routine item and a one-off task', () => {
    expect(
      todayItemSchema.safeParse({ kind: 'routine', id: base.id, title: 'Read 20 pages', time: '21:30', done: false, days: week })
        .success,
    ).toBe(true)
    expect(
      todayItemSchema.safeParse({
        kind: 'task',
        id: otherId,
        title: 'Review Q4 goals',
        time: null,
        done: true,
        tag: 'personal',
        priority: 'low',
      }).success,
    ).toBe(true)
  })

  it('rejects an unknown kind or a time with seconds', () => {
    expect(todayItemSchema.safeParse({ kind: 'note', id: base.id, title: 'x', time: null, done: false }).success).toBe(
      false,
    )
    expect(
      todayItemSchema.safeParse({ kind: 'task', id: base.id, title: 'x', time: '09:00:00', done: false }).success,
    ).toBe(false)
  })
})
