import { MeterBar } from '@/components/MeterBar'
import { getStreakTier } from '@/lib/streak'
import { streakCaption } from '@/lib/todayCards'
import { Flame } from './Flame'

type StreakCardProps = {
  /** Current streak in days. */
  days: number
}

/** "Current streak" top card: level badge, days, progress to the next level, and the flame. */
export function StreakCard({ days }: StreakCardProps) {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 0
  const tier = getStreakTier(safeDays)
  const { level } = tier

  return (
    <section
      aria-label="Current streak"
      data-level={level.id}
      className="flex h-full items-center gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm text-ink-2">Current streak</h2>
          <span
            className="rounded-lg px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase"
            style={{ backgroundColor: level.colors.core, color: level.textColor }}
          >
            {level.name}
          </span>
        </div>
        <p className="mt-1 flex items-baseline gap-2 text-foreground">
          <span className="text-[34px] leading-tight font-bold tracking-tight">{safeDays}</span>
          <span className="text-base font-medium text-ink-2">{safeDays === 1 ? 'day' : 'days'}</span>
        </p>
        <MeterBar
          value={tier.progress * 100}
          label={`Progress to ${tier.nextLevel.name}`}
          color={level.colors.outer}
          trackColor="#F3F4F6"
          className="mt-2"
        />
        <p className="mt-2 text-[13px] text-ink-2">{streakCaption(safeDays, tier)}</p>
      </div>
      <Flame level={level.id} />
    </section>
  )
}
