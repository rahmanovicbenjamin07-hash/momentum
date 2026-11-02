import { describe, expect, it } from 'vitest'
import { financeEntryFormSchema, financeEntrySchema, startingSavingsFormSchema } from './finance'

const form = {
  kind: 'expense',
  name: ' Groceries ',
  amount: '12,50',
  currency: 'eur',
  category: ' Food ',
  date: '2026-11-02',
  note: '',
}

describe('financeEntryFormSchema', () => {
  it('reads the amount, trims the name and category and turns an empty note into null', () => {
    expect(financeEntryFormSchema.parse(form)).toEqual({ ...form, name: 'Groceries', amount: 12.5, category: 'Food', note: null })
  })

  it.each([
    ['', 'Enter an amount'],
    ['abc', 'Enter a number, e.g. 1250 or 12.50'],
    ['0', 'Enter an amount above 0'],
    ['-5', 'Enter an amount above 0'],
    ['100000000', 'That amount is too big'],
  ])('says no to amount %j', (amount, message) => {
    const result = financeEntryFormSchema.safeParse({ ...form, amount })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(message)
  })

  it('needs a name and a real date, and limits the name, category and note', () => {
    expect(financeEntryFormSchema.safeParse({ ...form, name: '  ' }).success).toBe(false)
    expect(financeEntryFormSchema.safeParse({ ...form, name: 'x'.repeat(61) }).success).toBe(false)
    expect(financeEntryFormSchema.safeParse({ ...form, category: 'x'.repeat(41) }).success).toBe(false)
    expect(financeEntryFormSchema.safeParse({ ...form, date: '2026-02-30' }).success).toBe(false)
    expect(financeEntryFormSchema.safeParse({ ...form, note: 'x'.repeat(201) }).success).toBe(false)
  })

  it('files a log without a category under Other', () => {
    expect(financeEntryFormSchema.parse({ ...form, category: '  ' }).category).toBe('Other')
  })
})

describe('startingSavingsFormSchema', () => {
  it('allows zero and a debt below zero', () => {
    expect(startingSavingsFormSchema.parse({ amount: '0', currency: 'eur', date: '2026-11-01' }).amount).toBe(0)
    expect(startingSavingsFormSchema.parse({ amount: '-1.500', currency: 'bam', date: '2026-11-01' }).amount).toBe(-1500)
  })
})

describe('financeEntrySchema', () => {
  it('accepts numeric columns sent as strings', () => {
    const row = financeEntrySchema.parse({
      id: '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4',
      user_id: '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c5',
      created_at: '2026-11-02T10:00:00Z',
      date: '2026-11-02',
      kind: 'income',
      name: 'October salary',
      amount: '195.58',
      currency: 'bam',
      amount_eur: '100.00',
      category: 'Salary',
      note: null,
    })
    expect(row.amount_eur).toBe(100)
  })
})
