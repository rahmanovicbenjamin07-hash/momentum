import { useId } from 'react'
import { cn } from 'cn'
import type { TemplateItem } from '@/components/outreach/TemplatesDialog'
import { DEFAULT_TIME_ZONE, toDateKey, type DateKey } from '@/lib/dates'
import { CHANNEL_LABELS, type Direction, type Touch } from '@/schemas/outreach'
import { shortDay, touchWhen } from './format'

export type TimelineTouch = Pick<Touch, 'id' | 'occurred_at' | 'channel' | 'direction' | 'template_id' | 'body' | 'got_reply'>

type TimelineProps = {
  touches: readonly TimelineTouch[]
  /** To show the template name next to a touch. */
  templates?: readonly Pick<TemplateItem, 'id' | 'name'>[]
  today: DateKey
  timeZone?: string
}

const MARKERS: Record<Direction, { text: string; className: string; label: string }> = {
  received: { text: 'IN', className: 'bg-good-tint text-good', label: 'Received' },
  sent: { text: 'OUT', className: 'bg-brand-tint text-brand', label: 'Sent' },
  note: { text: 'N', className: 'bg-muted text-ink-2', label: 'Note' },
}

const chip = 'inline-flex h-5 items-center rounded-md px-1.5 text-xs font-semibold whitespace-nowrap'

/** Every touch with the lead, newest first. Sent = OUT, received = IN, note = N. */
export function Timeline({ touches, templates = [], today, timeZone = DEFAULT_TIME_ZONE }: TimelineProps) {
  const id = useId()
  const sorted = [...touches].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
  const touchCount = touches.filter((t) => t.direction !== 'note').length
  const templateName = new Map(templates.map((t) => [t.id, t.name]))

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Timeline
        </h2>
        <span className="text-[13px] text-ink-2 tabular-nums">
          {touchCount} {touchCount === 1 ? 'touch' : 'touches'}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-ink-3">Nothing here yet. Log your first touch above.</p>
      ) : (
        <ol className="relative flex flex-col gap-5">
          <span aria-hidden="true" className="absolute top-4 bottom-4 left-4 w-px bg-border" />
          {sorted.map((touch) => {
            const marker = MARKERS[touch.direction]
            const isNote = touch.direction === 'note'
            const template = touch.template_id ? templateName.get(touch.template_id) : undefined
            const when = isNote
              ? shortDay(toDateKey(new Date(touch.occurred_at), timeZone), today)
              : touchWhen(touch.occurred_at, today, timeZone)
            return (
              <li key={touch.id} className="relative flex gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ring-4 ring-card',
                    marker.className,
                  )}
                >
                  {marker.text}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {isNote ? marker.label : `${marker.label} · ${CHANNEL_LABELS[touch.channel]}`}
                    </h3>
                    <time dateTime={touch.occurred_at} className="text-xs text-ink-2 tabular-nums">
                      {when}
                    </time>
                    {touch.got_reply && <span className={cn(chip, 'bg-good-tint text-good')}>Reply received</span>}
                    {template && <span className={cn(chip, 'bg-muted font-medium text-ink-2')}>{template}</span>}
                  </div>
                  <div className="mt-2 rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm leading-relaxed whitespace-pre-line text-foreground">
                    {touch.body ?? <span className="text-ink-3 italic">No message saved</span>}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
