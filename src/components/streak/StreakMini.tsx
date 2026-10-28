import { streakLevelForDays } from '@/lib/streak-levels'
import { daysLabel } from '@/lib/todayCards'
import { Flame } from './Flame'

/** Small sidebar card: "Current streak · 12 days", coloured by level. */
export function StreakMini({ days }: { days: number }) {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 0
  const level = streakLevelForDays(safeDays)

  return (
    <div data-level={level.id} className="rounded-xl border border-border px-4 py-3">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: level.textColor }}>
        <Flame level={level.id} circle={false} size={16} />
        Current streak
      </p>
      <p className="mt-0.5 text-xl font-semibold text-foreground">{daysLabel(safeDays)}</p>
    </div>
  )
}
