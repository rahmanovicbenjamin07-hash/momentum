/**
 * Chart colours, checked with the dataviz palette validator against the white card
 * (light mode). The daily line is below 3:1 contrast, so every chart that uses it also
 * has a legend, a tooltip and a hidden data table.
 */
export const CHART = {
  /** 7-day average, funnel bars, trusted reply-rate bars. */
  strong: '#4338CA',
  /** Daily line. */
  soft: '#8B93F8',
  /** Reply-rate bars with too few sends to trust. */
  faded: '#A5B4FC',
  /** Bar tracks and empty heatmap cells. */
  track: '#EEF0F4',
  /** Hairline grid and axis. */
  grid: '#E5E7EB',
  gridFaint: '#F3F4F6',
  /** Hover crosshair. */
  crosshair: '#9CA3AF',
  /** Heatmap: one hue, light → dark (ordinal check passed). Index 0 = nothing done / nothing scheduled. */
  heat: ['#EEF0F4', '#9AA5FA', '#6F74F0', '#4338CA', '#272369'] as const,
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
