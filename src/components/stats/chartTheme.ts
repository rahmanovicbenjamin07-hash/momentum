/**
 * Chart colours as CSS variables (values for light and dark live in src/index.css), so
 * every chart follows the theme. Light values were checked with the dataviz palette
 * validator against the white card. The daily line is below 3:1 contrast, so every chart
 * that uses it also has a legend, a tooltip and a hidden data table.
 */
export const CHART = {
  /** 7-day average, funnel bars, trusted reply-rate bars. */
  strong: 'var(--chart-strong)',
  /** Daily line. */
  soft: 'var(--chart-soft)',
  /** Reply-rate bars with too few sends to trust. */
  faded: 'var(--chart-faded)',
  /** Bar tracks and empty heatmap cells. */
  track: 'var(--chart-track)',
  /** Hairline grid and axis. */
  grid: 'var(--chart-grid)',
  gridFaint: 'var(--chart-grid-faint)',
  /** Hover crosshair. */
  crosshair: 'var(--chart-muted)',
  /** Comparison lines (last year, perfect year). */
  muted: 'var(--chart-muted)',
  /** Goal lines. */
  goal: 'var(--good)',
  /** Halo around dots so they stand out from lines: the card colour. */
  halo: 'var(--card)',
  /** Heatmap: one hue, light → dark in light mode, dark → bright in dark mode. Index 0 = nothing done / nothing scheduled. */
  heat: ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'] as const,
} as const

/** "75%" from 0.75. */
export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`
}

/** Colour step 0–4 for a day's rate. 0 = nothing done or nothing planned. */
export function heatLevel(rate: number | null): 0 | 1 | 2 | 3 | 4 {
  if (rate === null || rate <= 0) return 0
  if (rate < 0.5) return 1
  if (rate < 0.75) return 2
  if (rate < 1) return 3
  return 4
}
