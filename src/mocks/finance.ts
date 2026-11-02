import type { FinanceEntry } from '@/schemas/finance'

const base = { user_id: '00000000-0000-4000-8000-000000000001', created_at: '2026-10-01T08:00:00+00:00' }

function entry(
  n: number,
  date: string,
  kind: FinanceEntry['kind'],
  amount: number,
  name: string,
  category: string,
  note: string | null = null,
  currency: FinanceEntry['currency'] = 'eur',
): FinanceEntry {
  return {
    ...base,
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    date,
    kind,
    name,
    amount,
    currency,
    amount_eur: currency === 'bam' ? Math.round((amount / 1.95583) * 100) / 100 : amount,
    category,
    note,
  }
}

/** A few months of money, newest first. Mock "today" is 2 Nov 2026. */
export const mockFinanceEntries: FinanceEntry[] = [
  entry(1, '2026-11-02', 'expense', 18.4, 'Lunch', 'Food', 'Pasta near the office'),
  entry(2, '2026-11-01', 'income', 2200, 'November salary', 'Salary'),
  entry(3, '2026-11-01', 'expense', 450, 'Rent', 'Rent'),
  entry(4, '2026-10-28', 'expense', 120, 'Electricity + internet', 'Bills', null, 'bam'),
  entry(5, '2026-10-20', 'income', 650, 'Bloom Studio website', 'Client work', 'Second half of the invoice'),
  entry(6, '2026-10-15', 'expense', 210.5, 'Groceries', 'Food'),
  entry(7, '2026-10-10', 'expense', 60, 'Bus pass', 'Transport'),
  entry(8, '2026-10-05', 'expense', 85, 'Concert', 'Fun', 'Tickets for two'),
  entry(9, '2026-10-01', 'income', 2200, 'October salary', 'Salary'),
  entry(10, '2026-10-01', 'expense', 450, 'Rent', 'Rent'),
  entry(11, '2026-09-01', 'income', 2200, 'September salary', 'Salary'),
  entry(12, '2026-09-01', 'expense', 450, 'Rent', 'Rent'),
  entry(13, '2026-09-12', 'expense', 380, 'Groceries', 'Food'),
  entry(14, '2026-08-01', 'income', 2100, 'August salary', 'Salary'),
  entry(15, '2026-08-03', 'expense', 1900, 'Summer trip', 'Fun', 'Hotel and flights'),
]

export const mockStartingSavings = { amount: 3000, currency: 'eur' as const, date: '2026-08-01' }
