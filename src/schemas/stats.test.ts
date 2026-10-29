import { describe, expect, it } from 'vitest'
import { entryDateForMonth, logValueFormSchema, metricEntrySchema, metricSchema, newMetricFormSchema } from './stats'

const base = {
  id: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  user_id: '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4',
  created_at: '2026-10-28T19:19:45.123456+00:00',
}

describe('metric rows', () => {
  it('accepts a metric with or without a goal', () => {
    const metric = { ...base, name: 'Money earned', unit: 'eur', log_every: 'monthly', yearly_goal: 18000 }
    expect(metricSchema.parse(metric)).toEqual(metric)
    expect(metricSchema.safeParse({ ...metric, yearly_goal: null }).success).toBe(true)
    expect(metricSchema.safeParse({ ...metric, unit: 'miles' }).success).toBe(false)
    expect(metricSchema.safeParse({ ...metric, log_every: 'yearly' }).success).toBe(false)
  })

  it('accepts an entry, rejects negative values and bad dates', () => {
    const entry = {
      ...base,
      metric_id: base.id,
      entry_date: '2026-10-01',
      value: 2200,
      note: '2 new clients',
      contact_id: null,
    }
    expect(metricEntrySchema.safeParse(entry).success).toBe(true)
    expect(metricEntrySchema.safeParse({ ...entry, value: -1 }).success).toBe(false)
    expect(metricEntrySchema.safeParse({ ...entry, entry_date: '2026-02-30' }).success).toBe(false)
  })
})

describe('newMetricFormSchema', () => {
  it('trims the name and makes an empty goal undefined', () => {
    expect(newMetricFormSchema.parse({ name: '  Trainings ', unit: 'count', log_every: 'weekly', yearly_goal: '' })).toEqual({
      name: 'Trainings',
      unit: 'count',
      log_every: 'weekly',
      yearly_goal: undefined,
    })
  })

  it('reads the goal from text and defaults unit and frequency', () => {
    expect(newMetricFormSchema.parse({ name: 'Hours worked', yearly_goal: '1700' })).toMatchObject({
      unit: 'count',
      log_every: 'monthly',
      yearly_goal: 1700,
    })
  })

  it('explains what is wrong', () => {
    const result = newMetricFormSchema.safeParse({ name: ' ', yearly_goal: '0' })
    expect(result.success).toBe(false)
    const messages = result.error?.issues.map((i) => i.message)
    expect(messages).toContain('Name the metric')
    expect(messages).toContain('The goal must be more than 0')
  })
})

describe('logValueFormSchema', () => {
  it('parses month, value and optional note', () => {
    expect(logValueFormSchema.parse({ month: '2026-10', value: '2200', note: ' 2 new clients ' })).toEqual({
      month: '2026-10',
      value: 2200,
      note: '2 new clients',
    })
    expect(logValueFormSchema.parse({ month: '2026-10', value: 0, note: '' }).note).toBeUndefined()
  })

  it('needs a month and a non-negative value', () => {
    expect(logValueFormSchema.safeParse({ month: '2026-13', value: 5 }).success).toBe(false)
    const empty = logValueFormSchema.safeParse({ month: '2026-10', value: '' })
    expect(empty.error?.issues[0]?.message).toBe('Enter a value')
    expect(logValueFormSchema.safeParse({ month: '2026-10', value: '-5' }).success).toBe(false)
  })

  it('stores a month under its first day', () => {
    expect(entryDateForMonth('2026-10')).toBe('2026-10-01')
  })
})
