import { Check } from 'lucide-react'
import { cn } from 'cn'
import { STAGE_META } from '@/components/outreach/meta'
import type { Stage } from '@/schemas/outreach'

/** The steps shown, in order. "Lost" is not a step; it's set from the ⋯ menu. */
const STEPS = ['new', 'contacted', 'replied', 'meeting', 'proposal', 'won'] as const satisfies readonly Stage[]

type StageStepperProps = {
  stage: Stage
  /** Called with the clicked stage (not called for the current one). */
  onChange: (stage: Stage) => void
  disabled?: boolean
}

/** New → Contacted → Replied → Meeting booked → Proposal → Won. Click a step to move the lead there. */
export function StageStepper({ stage, onChange, disabled }: StageStepperProps) {
  const currentIndex = STEPS.indexOf(stage as (typeof STEPS)[number])
  const lost = stage === 'lost'

  return (
    <nav aria-label="Stage">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((step, index) => {
          const done = !lost && index < currentIndex
          const current = index === currentIndex
          const label = STAGE_META[step].label
          return (
            <li key={step}>
              <button
                type="button"
                disabled={disabled}
                aria-current={current ? 'step' : undefined}
                aria-label={`${label}${current ? ' (current stage)' : done ? ' (done)' : ''}`}
                onClick={() => {
                  if (!current) onChange(step)
                }}
                className={cn(
                  'flex h-11 w-full items-center gap-2.5 rounded-lg border px-3 text-left text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
                  current
                    ? 'border-brand bg-brand-tint font-semibold text-brand'
                    : 'border-border bg-card text-foreground hover:bg-background',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums',
                    done || current ? 'bg-brand text-white' : 'bg-muted text-ink-2',
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          )
        })}
      </ol>
      {lost && (
        <p className="mt-2 text-[13px] text-bad">This lead is marked as lost. Click a stage to bring it back.</p>
      )}
    </nav>
  )
}
