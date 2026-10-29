import { TrendingUp } from 'lucide-react'
import type { Ref } from 'react'
import { formatEuro } from '@/components/outreach/format'
import type { ShareCard as ShareCardData } from '@/lib/reports'

type ShareCardProps = {
  share: ShareCardData
  /** The card element, so the page can turn it into a PNG ("Share image"). */
  ref?: Ref<HTMLDivElement>
}

/** Dark summary card meant for sharing: numbers only, never names, contacts or notes. */
export function ShareCard({ share, ref }: ShareCardProps) {
  const stats = [
    { value: String(share.tasksCompleted), label: 'tasks completed' },
    { value: `${share.longestStreak} ${share.longestStreak === 1 ? 'day' : 'days'}`, label: 'longest streak' },
    ...(share.earned !== null ? [{ value: formatEuro(share.earned), label: 'earned' }] : []),
    { value: String(share.outreachSent), label: 'outreach messages' },
  ]

  return (
    <figure className="flex flex-col gap-2 print:break-inside-avoid">
      <div
        ref={ref}
        className="rounded-xl bg-[#1E1B4B] p-6 text-white [print-color-adjust:exact]"
        role="group"
        aria-label={`${share.heading} summary card`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#C7D2FE] uppercase">{share.heading}</p>
          <p className="flex items-center gap-1 text-xs font-semibold text-white">
            <TrendingUp aria-hidden="true" className="size-3.5" />
            momentum
          </p>
        </div>
        <p className="mt-5 text-[56px] leading-none font-bold tracking-tight">
          {share.routinePercent === null ? '—' : `${Math.round(share.routinePercent * 100)}%`}
        </p>
        <p className="mt-2 text-base font-medium text-[#E0E7FF]">of my daily routine done</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-6">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse border-t border-white/20 py-3">
              <dt className="text-xs text-[#C7D2FE]">{s.label}</dt>
              <dd className="text-2xl font-bold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <figcaption className="text-xs text-ink-2">
        Ready to share as an image · no names, contacts or private notes included
      </figcaption>
    </figure>
  )
}
