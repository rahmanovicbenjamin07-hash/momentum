/**
 * Finance maths: money earned and spent, summed up by month, and what is saved.
 * Pure functions; amounts are in € (KM entries are converted at the fixed rate).
 */
import type { DateKey } from './dates'

/** The fixed rate of the Bosnian convertible mark: 1 € = 1.95583 KM. */
export const BAM_PER_EUR = 1.95583

export type FinanceCurrency = 'eur' | 'bam'
export type FinanceKind = 'income' | 'expense'
/** "2026-11". */
export type MonthKey = string

export type FinanceEntryLike = {
  date: DateKey
  kind: FinanceKind
  /** Already in € (the database works it out for KM entries). */
  amount_eur: number
  category: string
}

export type StartingSavings = {
  /** In €. */
  amount_eur: number
  /** Entries before this day are already in the amount. */
  date: DateKey
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Same rounding as the database's amount_eur column. */
export function toEur(amount: number, currency: FinanceCurrency): number {
  return round2(currency === 'bam' ? amount / BAM_PER_EUR : amount)
}

export const monthOf = (date: DateKey): MonthKey => date.slice(0, 7)

/** "2026-11" → "2026-12"; also goes back with a negative step. */
export function addMonths(month: MonthKey, step: number): MonthKey {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + step
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** "2026-11" → "November 2026". */
export function formatMonthLong(month: MonthKey): string {
  return `${MONTHS[Number(month.slice(5, 7)) - 1] ?? ''} ${month.slice(0, 4)}`
}

/** "2026-11" → "Nov". */
export function formatMonthShort(month: MonthKey): string {
  return (MONTHS[Number(month.slice(5, 7)) - 1] ?? '').slice(0, 3)
}

export type MoneyTotals = { earned: number; spent: number; profit: number }

export function totals(entries: readonly FinanceEntryLike[]): MoneyTotals {
  let earned = 0
  let spent = 0
  for (const entry of entries) {
    if (entry.kind === 'income') earned += entry.amount_eur
    else spent += entry.amount_eur
  }
  return { earned: round2(earned), spent: round2(spent), profit: round2(earned - spent) }
}

export function entriesInMonth<T extends FinanceEntryLike>(entries: readonly T[], month: MonthKey): T[] {
  return entries.filter((entry) => monthOf(entry.date) === month)
}

/** Saved at the end of `date`: the starting savings plus everything earned minus spent since then. */
export function savedOn(entries: readonly FinanceEntryLike[], start: StartingSavings | null, date: DateKey): number {
  const from = start?.date ?? ''
  const counted = entries.filter((entry) => entry.date >= from && entry.date <= date)
  return round2((start?.amount_eur ?? 0) + totals(counted).profit)
}

/** Last day of the month, e.g. "2026-02" → "2026-02-28". */
export function monthEnd(month: MonthKey): DateKey {
  const next = addMonths(month, 1)
  const last = new Date(Date.UTC(Number(next.slice(0, 4)), Number(next.slice(5, 7)) - 1, 0))
  return `${month}-${String(last.getUTCDate()).padStart(2, '0')}`
}

export type MonthRow = MoneyTotals & {
  month: MonthKey
  /** Saved at the end of the month (or today, for the current month); null for months still ahead. */
  saved: number | null
}

/** January–December of `year`: earned, spent, profit and saved by month. */
export function yearByMonth(
  entries: readonly FinanceEntryLike[],
  start: StartingSavings | null,
  year: number,
  today: DateKey,
): MonthRow[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`
    const ahead = month > monthOf(today)
    const end = monthEnd(month)
    return {
      month,
      ...totals(entriesInMonth(entries, month)),
      saved: ahead ? null : savedOn(entries, start, end < today ? end : today),
    }
  })
}

export type CategoryTotal = { category: string; total: number; /** 0–100 of the kind's total. */ percent: number }

/** Totals by category for one kind, biggest first. Category names match ignoring case. */
export function byCategory(entries: readonly FinanceEntryLike[], kind: FinanceKind): CategoryTotal[] {
  const sums = new Map<string, { category: string; total: number }>()
  for (const entry of entries) {
    if (entry.kind !== kind) continue
    const key = entry.category.trim().toLowerCase()
    const row = sums.get(key) ?? { category: entry.category.trim(), total: 0 }
    row.total += entry.amount_eur
    sums.set(key, row)
  }
  const all = [...sums.values()].reduce((sum, row) => sum + row.total, 0)
  return [...sums.values()]
    .map((row) => ({ ...row, total: round2(row.total), percent: all > 0 ? Math.round((row.total / all) * 100) : 0 }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category))
}

export const DEFAULT_CATEGORIES: Record<FinanceKind, readonly string[]> = {
  income: ['Salary', 'Client work', 'Other income'],
  expense: ['Rent', 'Food', 'Transport', 'Bills', 'Fun', 'Other'],
}

/** Category suggestions: the defaults, then the ones you made up yourself (newest first), no repeats. */
export function categoryOptions(entries: readonly FinanceEntryLike[], kind: FinanceKind): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  const add = (name: string) => {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    result.push(name.trim())
  }
  DEFAULT_CATEGORIES[kind].forEach(add)
  for (const entry of entries) if (entry.kind === kind) add(entry.category)
  return result
}

/**
 * Reads what people type: "1250", "1250.5", "1,250.50", "1.250,50", "12,5", "€ 30".
 * The last "." or "," followed by 1–2 digits is the decimal mark; other dots, commas and spaces are dropped.
 * Returns null when it isn't a number.
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[€\s]|KM/gi, '')
  if (!/^-?[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) return null
  const decimal = /[.,](\d{1,2})$/.exec(cleaned)
  const whole = (decimal ? cleaned.slice(0, decimal.index) : cleaned).replace(/[.,]/g, '')
  const value = Number(decimal ? `${whole}.${decimal[1]}` : whole)
  return Number.isFinite(value) ? value : null
}

const eurFormat = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
const plainFormat = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 2 })

/** "€1,250", "€12.50", "−€80". */
export function formatEur(value: number): string {
  const text = eurFormat.format(Math.abs(value)).replace(/\.00$/, '')
  return value < 0 ? `−${text}` : text
}

/** An entry's own amount: "€12.50" or "250 KM". */
export function formatAmount(amount: number, currency: FinanceCurrency): string {
  return currency === 'bam' ? `${plainFormat.format(amount)} KM` : formatEur(amount)
}
