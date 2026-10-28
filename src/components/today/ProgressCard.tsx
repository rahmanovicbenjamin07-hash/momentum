import { MeterBar } from '@/components/MeterBar'
import type { TodayProgress } from '@/lib/progress'

/** "Today's progress" top card: 45% · 5 of 11 done · Repeating 3/5 · One-off 2/6. */
export function ProgressCard({ progress }: { progress: TodayProgress }) {
  const { percent, done, total, routine, oneOff } = progress

  return (
    <section aria-label="Today’s progress" className="flex h-full flex-col justify-center rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm text-ink-2">Today’s progress</h2>
      <p className="mt-1 flex items-baseline gap-2 text-foreground">
        <span className="text-[34px] leading-tight font-bold tracking-tight">{percent}%</span>
        <span className="text-sm text-ink-2">{total === 0 ? 'nothing planned yet' : `${done} of ${total} done`}</span>
      </p>
      <MeterBar value={percent} label="Today’s progress" className="mt-2" />
      <p className="mt-2 text-[13px] text-ink-2">
        Repeating {routine.done}/{routine.total} · One-off {oneOff.done}/{oneOff.total}
      </p>
    </section>
  )
}
