import { describe, expect, it } from 'vitest'
import { goalUpdateFormSchema, newGoalFormSchema } from './goals'

const today = '2026-10-28'
const valid = {
  title: 'Have €10,000 saved by May',
  short_label: '',
  unit: 'eur',
  start_value: '3,000',
  target: '10 000',
  start_date: today,
  deadline: '2027-05-03',
}

describe('newGoalFormSchema', () => {
  const schema = newGoalFormSchema(today)

  it('accepts any number goal and reads "10 000" and "3,000"', () => {
    const result = schema.safeParse(valid)
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ unit: 'eur', start_value: 3000, target: 10000, deadline: '2027-05-03' })
  })

  it('uses the name as the short label when left empty', () => {
    expect(schema.parse(valid).short_label).toBe('Have €10,000 saved by Ma')
    expect(schema.parse({ ...valid, short_label: '€10k' }).short_label).toBe('€10k')
  })

  it('treats an empty starting point as 0 and allows Bosnian marks', () => {
    expect(schema.parse({ ...valid, start_value: '', unit: 'bam' })).toMatchObject({ start_value: 0, unit: 'bam' })
  })

  it('needs a target above the starting point', () => {
    const result = schema.safeParse({ ...valid, start_value: '12000' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({ path: ['target'], message: 'The target must be more than the starting point' })
  })

  it('rejects a missing target, a start in the future and a past deadline', () => {
    expect(schema.safeParse({ ...valid, target: '' }).error?.issues[0]?.message).toBe('Enter a target')
    expect(schema.safeParse({ ...valid, start_date: '2026-10-29' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, deadline: today }).error?.issues[0]?.message).toBe('Pick a date after today')
  })

  it('rejects unknown units', () => {
    expect(schema.safeParse({ ...valid, unit: 'usd' }).success).toBe(false)
  })
})

describe('goalUpdateFormSchema', () => {
  const schema = goalUpdateFormSchema('2026-05-01', today)

  it('accepts a value for today, with an optional note', () => {
    expect(schema.parse({ value: '4,200', date: today, note: '' })).toEqual({ value: 4200, date: today, note: null })
    expect(schema.parse({ value: '1,5', date: today, note: ' Bonus ' }).note).toBe('Bonus')
    expect(schema.parse({ value: '1,5', date: today }).value).toBe(1.5)
  })

  it('rejects dates before the start or after today, and empty or negative values', () => {
    expect(schema.safeParse({ value: '1', date: '2026-04-30' }).success).toBe(false)
    expect(schema.safeParse({ value: '1', date: '2026-10-29' }).success).toBe(false)
    expect(schema.safeParse({ value: '', date: today }).error?.issues[0]?.message).toBe('Enter the current number')
    expect(schema.safeParse({ value: '-5', date: today }).success).toBe(false)
  })

  it('limits the note to 200 characters', () => {
    expect(schema.safeParse({ value: '1', date: today, note: 'x'.repeat(201) }).success).toBe(false)
  })
})
