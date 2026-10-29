import { useId } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cardClass, TONE } from './meta'

/** Placeholder for the AI weekly summary; the button stays disabled until it's built. */
export function AiSummaryCard() {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cardClass}>
      <h2 id={id} className="text-base font-semibold text-foreground">
        AI weekly summary
      </h2>
      <p className="mt-2 text-[13px] text-ink-2">
        Reads this week’s numbers and notes, then suggests three observations and one experiment to try next.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" className="bg-card" disabled>
          Generate summary
        </Button>
        <Badge className={TONE.neutral}>Coming later</Badge>
      </div>
    </section>
  )
}
