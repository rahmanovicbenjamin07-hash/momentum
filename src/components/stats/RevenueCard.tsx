import { useId } from 'react'
import { cn } from 'cn'
import { formatEuro } from '@/components/outreach/format'
import { CHART } from './chartTheme'

export type RevenueByChannel = { label: string; amount: number }
export type RevenueByTemplate = { name: string; amount: number; deals: number }

type RevenueCardProps = {
  /** Won amounts added up, in €. */
  total: number
  deals: number
  /** € per message sent, or null when nothing was sent. */
  perMessage: number | null
  byChannel: readonly RevenueByChannel[]
  byTemplate: readonly RevenueByTemplate[]
  /** e.g. "This year · from won deals". */
  caption?: string
}

const perMessageFormat = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** "Revenue from outreach": the total, then bars by channel and chips by template. */
export function RevenueCard({ total, deals, perMessage, byChannel, byTemplate, caption = 'This year · from won deals' }: RevenueCardProps) {
  const id = useId()
  const max = Math.max(1, ...byChannel.map((c) => c.amount))

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Revenue from outreach
        </h2>
        <span className="text-[13px] text-ink-2">{caption}</span>
      </div>

      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[32px] leading-tight font-bold tracking-tight text-foreground">{formatEuro(total)}</span>
        <span className="text-sm text-ink-2">
          from {deals} won {deals === 1 ? 'deal' : 'deals'}
          {perMessage !== null && ` · about ${perMessageFormat.format(perMessage)} per message sent`}
        </span>
      </p>

      {byChannel.length > 0 && (
        <>
          <h3 className="mt-4 mb-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">By channel</h3>
          <ul className="flex flex-col gap-1.5">
            {byChannel.map((row) => (
              <li key={row.label} className="grid grid-cols-[80px_minmax(0,1fr)_64px] items-center gap-3 text-sm sm:grid-cols-[90px_minmax(0,1fr)_72px]">
                <span className="truncate text-foreground">{row.label}</span>
                <span aria-hidden="true" className="h-3.5 overflow-hidden rounded-[4px]" style={{ background: CHART.track }}>
                  <span
                    className="block h-full rounded-r-[4px] bg-good"
                    style={{ width: row.amount === 0 ? 0 : `max(4px, ${(row.amount / max) * 100}%)` }}
                  />
                </span>
                <span className={cn('text-right font-semibold tabular-nums', row.amount === 0 ? 'text-ink-2' : 'text-foreground')}>
                  {formatEuro(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {byTemplate.length > 0 && (
        <>
          <h3 className="mt-4 mb-2 text-xs font-semibold tracking-wider text-ink-2 uppercase">By template</h3>
          <ul className="flex flex-wrap gap-2">
            {byTemplate.map((t) => (
              <li
                key={t.name}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-[13px]',
                  t.amount > 0 ? 'border-good/25 bg-good-tint text-foreground' : 'border-border bg-card text-ink-2',
                )}
              >
                <span className="font-semibold text-foreground">{t.name}</span> · {formatEuro(t.amount)}
                {t.deals > 0 && ` · ${t.deals} ${t.deals === 1 ? 'deal' : 'deals'}`}
              </li>
            ))}
          </ul>
        </>
      )}

      {total === 0 && byChannel.length === 0 && (
        <p className="mt-3 text-sm text-ink-3">No won deals yet. Mark a lead as Won to see it here.</p>
      )}
    </section>
  )
}
