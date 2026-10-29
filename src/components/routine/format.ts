/** "1 day", "182 days". */
export function daysText(n: number): string {
  const rounded = Math.round(n)
  return `${rounded.toLocaleString('en-IE')} ${rounded === 1 ? 'day' : 'days'}`
}

/** "85%" from 0.85; "—" when there's nothing to rate. */
export function rateText(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`
}

/** Colour for a completion rate, as in the design: 80%+ green, 50–79% amber, under 50% red. */
export function rateTone(rate: number | null): 'text-good' | 'text-warn' | 'text-bad' | 'text-ink-2' {
  if (rate === null) return 'text-ink-2'
  if (rate >= 0.8) return 'text-good'
  if (rate >= 0.5) return 'text-warn'
  return 'text-bad'
}
