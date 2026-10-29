import { cn } from 'cn'
import type { KeyNumber } from '@/lib/reports'
import { changeLine, formatKeyValue } from './format'

type KeyNumbersProps = {
  numbers: readonly KeyNumber[]
  /** "September" or "2025", for "vs September". */
  previousLabel: string
}

const TONE = { good: 'text-good', bad: 'text-warn', neutral: 'text-ink-2' } as const

/** Up to 8 numbers of the period, each with its change vs the period before. */
export function KeyNumbers({ numbers, previousLabel }: KeyNumbersProps) {
  return (
    <section aria-label="Key numbers" className="rounded-xl border border-border bg-card p-5 print:break-inside-avoid">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        {numbers.map((n) => {
          const change = changeLine(n, previousLabel)
          const value = n.extra
            ? `${formatKeyValue(n.value, n.unit)} · ${formatKeyValue(n.extra.value, n.extra.unit)}`
            : formatKeyValue(n.value, n.unit)
          return (
            <div key={n.id} className="flex min-w-0 flex-col">
              <dt className="text-xs text-ink-2">{n.label}</dt>
              <dd className="text-[22px] leading-tight font-bold text-foreground">{value}</dd>
              {change && (
                <dd className={cn('text-xs font-semibold', n.detail ? 'font-medium text-foreground' : TONE[change.tone])}>
                  {change.text}
                </dd>
              )}
            </div>
          )
        })}
      </dl>
    </section>
  )
}
