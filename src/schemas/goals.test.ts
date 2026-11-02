import { describe, expect, it } from 'vitest'
import {
  goalSchema,
  goalUpdateFormSchema,
  keyResultFormSchema,
  milestoneFormSchema,
  newObjectiveFormSchema,
  objectiveFormSchema,
} from './goals'

const today = '2026-10-28'
const ROUTINE_ID = '44444444-4444-4444-8444-444444444444'

/** Every key result field, as the form sends them (strings). */
const fields = {
  kind: 'number',
  kr_title: '',
  unit: 'eur',
  start_value: '3,000',
  target: '10 000',
  per_week: '',
  habit_source: 'manual',
  start_date: today,
  deadline: '2027-05-03',
  steps: [],
}
const objective = { title: 'Be debt-free and have savings', why: '' }

describe('newObjectiveFormSchema', () => {
  const schema = newObjectiveFormSchema(today)

  it('a number key result reads "10 000" and "3,000" and takes the goal’s name when left empty', () => {
    expect(schema.parse({ ...objective, ...fields })).toEqual({
      objective: { title: 'Be debt-free and have savings', why: null },
      keyResult: {
        kind: 'number',
        title: 'Be debt-free and have savings',
        unit: 'eur',
        start_value: 3000,
        target: 10000,
        start_date: today,
        deadline: '2027-05-03',
      },
    })
  })

  it('keeps why it matters and the key result’s own name', () => {
    const values = schema.parse({ ...objective, why: ' Freedom ', ...fields, kr_title: '€10k saved', start_value: '' })
    expect(values.objective.why).toBe('Freedom')
    expect(values.keyResult).toMatchObject({ title: '€10k saved', start_value: 0 })
  })

  it('a number needs a target above the starting point', () => {
    const issue = (patch: object) => schema.safeParse({ ...objective, ...fields, ...patch }).error?.issues[0]
    expect(issue({ target: '' })).toMatchObject({ path: ['target'], message: 'Enter a target' })
    expect(issue({ start_value: '12000' })).toMatchObject({ message: 'The target must be more than the starting point' })
  })

  it('a habit needs 1–7 times a week and can be linked to a routine item', () => {
    const habit = { ...objective, ...fields, kind: 'habit', target: '' }
    expect(schema.parse({ ...habit, per_week: '3' }).keyResult).toEqual({
      kind: 'habit',
      title: objective.title,
      per_week: 3,
      routine_item_id: null,
      start_date: today,
      deadline: '2027-05-03',
    })
    expect(schema.parse({ ...habit, per_week: '5', habit_source: ROUTINE_ID }).keyResult).toMatchObject({ routine_item_id: ROUTINE_ID })
    expect(schema.safeParse({ ...habit, per_week: '' }).error?.issues[0]?.message).toBe('How many times a week?')
    expect(schema.safeParse({ ...habit, per_week: '8' }).error?.issues[0]?.message).toBe('Use a whole number from 1 to 7')
    expect(schema.safeParse({ ...habit, per_week: '2.5' }).success).toBe(false)
  })

  it('steps: empty rows are left out, at least one is needed, due dates by the deadline', () => {
    const steps = { ...objective, ...fields, kind: 'milestones', target: '' }
    const parsed = schema.parse({
      ...steps,
      steps: [
        { title: 'Buy domain', due_date: '2026-11-15' },
        { title: ' ', due_date: '' },
        { title: 'Go live', due_date: '' },
      ],
    })
    expect(parsed.keyResult).toMatchObject({
      kind: 'milestones',
      steps: [
        { title: 'Buy domain', due_date: '2026-11-15' },
        { title: 'Go live', due_date: null },
      ],
    })
    expect(schema.safeParse({ ...steps, steps: [{ title: '', due_date: '' }] }).error?.issues[0]?.message).toBe('Add at least one step')
    expect(schema.safeParse({ ...steps, steps: [{ title: 'Late', due_date: '2027-06-01' }] }).error?.issues[0]).toMatchObject({
      path: ['steps', 0, 'due_date'],
    })
  })

  it('done / not done only needs a deadline', () => {
    expect(schema.parse({ ...objective, ...fields, kind: 'done', target: '' }).keyResult).toEqual({
      kind: 'done',
      title: objective.title,
      start_date: today,
      deadline: '2027-05-03',
    })
  })

  it('rejects a start in the future, a past deadline and unknown kinds', () => {
    expect(schema.safeParse({ ...objective, ...fields, start_date: '2026-10-29' }).success).toBe(false)
    expect(schema.safeParse({ ...objective, ...fields, deadline: today }).error?.issues[0]?.message).toBe('Pick a date after today')
    expect(schema.safeParse({ ...objective, ...fields, kind: 'vibes' }).success).toBe(false)
    expect(schema.safeParse({ ...objective, ...fields, unit: 'usd' }).success).toBe(false)
  })
})

describe('keyResultFormSchema', () => {
  it('needs its own name', () => {
    const schema = keyResultFormSchema(today)
    expect(schema.safeParse(fields).error?.issues[0]).toMatchObject({ path: ['kr_title'], message: 'Name the key result' })
    expect(schema.parse({ ...fields, kr_title: '€10k saved' })).toMatchObject({ kind: 'number', title: '€10k saved' })
  })
})

describe('small goal forms', () => {
  it('edit goal: name required, empty why → null', () => {
    expect(objectiveFormSchema.parse({ title: ' Get fit ', why: '' })).toEqual({ title: 'Get fit', why: null })
    expect(objectiveFormSchema.safeParse({ title: '', why: '' }).success).toBe(false)
    expect(objectiveFormSchema.safeParse({ title: 'x', why: 'y'.repeat(301) }).success).toBe(false)
  })

  it('add step: name required, optional due date', () => {
    expect(milestoneFormSchema.parse({ title: 'Design', due_date: '' })).toEqual({ title: 'Design', due_date: null })
    expect(milestoneFormSchema.parse({ title: 'Design', due_date: '2026-12-01' }).due_date).toBe('2026-12-01')
    expect(milestoneFormSchema.safeParse({ title: ' ', due_date: '' }).error?.issues[0]?.message).toBe('Name the step')
  })
})

describe('goalSchema', () => {
  it('reads key results from older backups (no objective, kind or completed_on)', () => {
    const old = goalSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      user_id: '00000000-0000-4000-8000-000000000001',
      title: 'Earn €18,000',
      short_label: '€18k',
      type: 'total',
      source_kind: 'manual',
      source_id: null,
      unit: 'eur',
      target: 18000,
      start_date: '2026-01-01',
      deadline: '2027-01-01',
      include_pipeline: false,
      created_at: '2026-01-01T08:00:00+00:00',
    })
    expect(old).toMatchObject({ objective_id: null, kind: 'number', completed_on: null, start_value: 0 })
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
