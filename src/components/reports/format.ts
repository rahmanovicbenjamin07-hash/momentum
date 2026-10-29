import { formatChange, formatMetricValue } from '@/components/metrics/format'
import type { KeyNumber, KeyNumberUnit } from '@/lib/reports'

/** A key number's value: "€2,200", "148 h", "94%" (percent values are fractions). */
export function formatKeyValue(value: number, unit: KeyNumberUnit): string {
  return unit === 'percent' ? `${Math.round(value * 100)}%` : formatMetricValue(value, unit)
}

/** "+9", "−12 h", "+2 days", "+3 pts" — a signed difference in the number's unit. */
export function formatDelta(delta: number, unit: KeyNumberUnit): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  const abs = Math.abs(delta)
  if (unit === 'percent') return `${sign}${Math.round(abs * 100)} pts`
  return `${sign}${formatMetricValue(abs, unit)}`
}

export type ChangeLine = { text: string; tone: 'good' | 'bad' | 'neutral' }

/**
 * The line under a key number, e.g. "+13% vs September" (green) or "−2 vs September" (amber).
 * Small drops (under 10%) stay grey, like "−12 h vs September" in the design.
 */
export function changeLine(n: KeyNumber, previousLabel: string): ChangeLine | null {
  if (n.detail) return { text: n.detail, tone: 'neutral' }
  if (n.delta === null) return null
  const main = n.showAs === 'pct' && n.relative !== null ? formatChange(n.relative) : formatDelta(n.delta, n.unit)
  const extra =
    n.extra && n.extra.delta !== null && n.extra.delta !== 0
      ? ` · ${formatDelta(n.extra.delta, n.extra.unit)} ${n.extra.label.toLowerCase()}`
      : ''
  if (n.delta === 0 && !extra) return { text: `Same as ${previousLabel}`, tone: 'neutral' }
  const tone = n.delta > 0 ? 'good' : n.relative !== null && Math.abs(n.relative) < 0.1 ? 'neutral' : 'bad'
  return { text: `${main} vs ${previousLabel}${extra}`, tone }
}
