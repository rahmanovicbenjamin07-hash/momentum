import { MeterBar } from '@/components/MeterBar'
import { goalPercent, outreachCaption } from '@/lib/todayCards'

type OutreachWeekCardProps = {
  /** Outreaches sent this week (Mon–Sun). 0 until Phase 2. */
  sent: number
  /** Weekly goal. Default 20. */
  goal?: number
  replies: number
}

/** "Outreaches this week" top card: 11 of 20 goal · 3 replies so far · 9 more to hit your goal. */
export function OutreachWeekCard({ sent, goal = 20, replies }: OutreachWeekCardProps) {
  return (
    <section
      aria-label="Outreaches this week"
      className="flex h-full flex-col justify-center rounded-xl border border-border bg-card p-5"
    >
      <h2 className="text-sm text-ink-2">Outreaches this week</h2>
      <p className="mt-1 flex items-baseline gap-2 text-foreground">
        <span className="text-[34px] leading-tight font-bold tracking-tight">{sent}</span>
        <span className="text-sm text-ink-2">of {goal} goal</span>
      </p>
      <MeterBar value={goalPercent(sent, goal)} label="Outreach goal this week" className="mt-2" />
      <p className="mt-2 text-[13px] text-ink-2">{outreachCaption(sent, goal, replies)}</p>
    </section>
  )
}
