import { cn } from 'cn'

type StatTileProps = {
  label: string
  value: string
  /** Grey by default; green / red to show better or worse. */
  tone?: 'neutral' | 'good' | 'bad'
}

const TILE_TONE = {
  neutral: 'border-border bg-background text-foreground',
  good: 'border-good-tint bg-good-tint text-good',
  bad: 'border-bad-tint bg-bad-tint text-bad',
} as const

/** Small number tile: label on top, big value under it. */
export function StatTile({ label, value, tone = 'neutral' }: StatTileProps) {
  return (
    <div className={cn('flex min-w-0 flex-col rounded-lg border px-4 py-3', TILE_TONE[tone])}>
      <p className={cn('truncate text-xs', tone === 'neutral' ? 'text-ink-2' : 'font-medium')}>{label}</p>
      <p className="mt-0.5 text-[22px] leading-tight font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  )
}
