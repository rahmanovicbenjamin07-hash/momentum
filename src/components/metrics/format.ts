import type { MonthKey } from '@/lib/metrics'
import type { Unit } from '@/schemas/stats'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

const whole = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 1 })
const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

/** "€13,950", "1,371 h", "117", "320 km", "45 days". */
export function formatMetricValue(value: number, unit: Unit): string {
  switch (unit) {
    case 'eur':
      return euro.format(value)
    case 'hours':
      return `${oneDecimal.format(value)} h`
    case 'km':
      return `${oneDecimal.format(value)} km`
    case 'days':
      return `${whole.format(value)} ${value === 1 ? 'day' : 'days'}`
    case 'count':
      return oneDecimal.format(value)
  }
}

/** Short axis label: "€15k", "1.5k h", "120". */
export function formatAxisValue(value: number, unit: Unit): string {
  const short = value >= 1000 ? `${oneDecimal.format(value / 1000)}k` : whole.format(value)
  if (unit === 'eur') return `€${short}`
  if (unit === 'hours') return `${short} h`
  if (unit === 'km') return `${short} km`
  return short
}

/** "Amount (€) for the month", "Hours for the month"… */
export function valueLabel(unit: Unit): string {
  return {
    eur: 'Amount (€) for the month',
    hours: 'Hours for the month',
    km: 'Kilometres for the month',
    days: 'Days for the month',
    count: 'Count for the month',
  }[unit]
}

/** "+13%", "−5.3%", "+8.2%", "0%". One decimal under 10%, a real minus sign. */
export function formatChange(change: number): string {
  const pct = change * 100
  const abs = Math.abs(pct)
  const digits = abs > 0 && abs < 10 ? 1 : 0
  const text = abs.toFixed(digits).replace(/\.0$/, '')
  if (text === '0') return '0%'
  return `${pct > 0 ? '+' : '−'}${text}%`
}

/** "October" for "2026-10" ("October 2026" with `withYear`). */
export function monthName(month: MonthKey, withYear = false): string {
  const [year, m] = month.split('-').map(Number) as [number, number]
  return withYear ? `${MONTHS[m - 1]} ${year}` : MONTHS[m - 1]!
}

/** "Oct" for "2026-10". */
export function monthShort(month: MonthKey): string {
  return monthName(month).slice(0, 3)
}

/** The 12 month keys of a year. */
export function yearMonths(year: number): MonthKey[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
}

/**
 * A round top for the y axis and its tick step, e.g. 18,000 → { max: 20,000, step: 5,000 }.
 * Aims for about 4 steps, using steps of 1, 2, 2.5 or 5 × a power of ten.
 */
export function niceScale(maxValue: number): { max: number; step: number } {
  if (!(maxValue > 0)) return { max: 4, step: 1 }
  const rough = maxValue / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((f) => f * power).find((s) => s >= rough) ?? 10 * power
  return { max: Math.ceil(maxValue / step) * step, step }
}
