import { describe, expect, it } from 'vitest'
import {
  addMonths,
  byCategory,
  categoryOptions,
  formatAmount,
  formatEur,
  formatMonthLong,
  monthEnd,
  parseAmount,
  savedOn,
  toEur,
  totals,
  yearByMonth,
  type FinanceEntryLike,
} from './finance'

const entry = (date: string, kind: FinanceEntryLike['kind'], amount_eur: number, category = 'Other'): FinanceEntryLike => ({
  date,
  kind,
  amount_eur,
  category,
})

const ENTRIES = [
  entry('2026-10-01', 'income', 2000, 'Salary'),
  entry('2026-10-03', 'expense', 500, 'Rent'),
  entry('2026-10-15', 'expense', 120.5, 'Food'),
  entry('2026-10-20', 'expense', 79.5, 'food'),
  entry('2026-11-01', 'income', 2000, 'Salary'),
  entry('2026-11-02', 'expense', 40, 'Transport'),
]

describe('toEur', () => {
  it('converts KM at the fixed rate and rounds to cents', () => {
    expect(toEur(195.58, 'bam')).toBe(100)
    expect(toEur(100, 'bam')).toBe(51.13)
    expect(toEur(12.345, 'eur')).toBe(12.35)
  })
})

describe('months', () => {
  it('steps across years and knows month lengths', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(monthEnd('2026-02')).toBe('2026-02-28')
    expect(monthEnd('2028-02')).toBe('2028-02-29')
    expect(monthEnd('2026-12')).toBe('2026-12-31')
    expect(formatMonthLong('2026-11')).toBe('November 2026')
  })
})

describe('totals and savings', () => {
  it('adds up earned, spent and profit', () => {
    expect(totals(ENTRIES.slice(0, 4))).toEqual({ earned: 2000, spent: 700, profit: 1300 })
  })

  it('counts savings from the starting point only', () => {
    const start = { amount_eur: 5000, date: '2026-10-02' }
    // The salary on 1 Oct is already inside the 5,000.
    expect(savedOn(ENTRIES, start, '2026-10-31')).toBe(5000 - 700)
    expect(savedOn(ENTRIES, null, '2026-10-31')).toBe(1300)
  })

  it('builds the year month by month, with nothing saved for months ahead', () => {
    const rows = yearByMonth(ENTRIES, { amount_eur: 1000, date: '2026-01-01' }, 2026, '2026-11-02')
    expect(rows).toHaveLength(12)
    expect(rows[9]).toEqual({ month: '2026-10', earned: 2000, spent: 700, profit: 1300, saved: 2300 })
    expect(rows[10]).toMatchObject({ month: '2026-11', earned: 2000, spent: 40, saved: 4260 })
    expect(rows[0]).toMatchObject({ earned: 0, saved: 1000 })
    expect(rows[11]?.saved).toBeNull()
  })
})

describe('byCategory', () => {
  it('sums by category ignoring case, biggest first, with shares', () => {
    expect(byCategory(ENTRIES.slice(0, 4), 'expense')).toEqual([
      { category: 'Rent', total: 500, percent: 71 },
      { category: 'Food', total: 200, percent: 29 },
    ])
    expect(byCategory([], 'income')).toEqual([])
  })

  it('suggests the defaults first, then your own categories', () => {
    const own = [...ENTRIES, entry('2026-11-02', 'expense', 10, 'Gym'), entry('2026-11-02', 'expense', 5, 'gym')]
    expect(categoryOptions(own, 'expense')).toEqual(['Rent', 'Food', 'Transport', 'Bills', 'Fun', 'Other', 'Gym'])
  })
})

describe('parseAmount', () => {
  it.each([
    ['1250', 1250],
    ['1250.5', 1250.5],
    ['1,250.50', 1250.5],
    ['1.250,50', 1250.5],
    ['12,5', 12.5],
    ['1,250', 1250],
    ['€ 30', 30],
    ['250 KM', 250],
  ])('reads %s', (text, value) => {
    expect(parseAmount(text)).toBe(value)
  })

  it('says no to text that is not a number', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('12a')).toBeNull()
  })
})

describe('formatting', () => {
  it('shows € with cents only when needed, and KM as typed', () => {
    expect(formatEur(1250)).toBe('€1,250')
    expect(formatEur(12.5)).toBe('€12.50')
    expect(formatEur(-80)).toBe('−€80')
    expect(formatAmount(250, 'bam')).toBe('250 KM')
    expect(formatAmount(19.9, 'eur')).toBe('€19.90')
  })
})
