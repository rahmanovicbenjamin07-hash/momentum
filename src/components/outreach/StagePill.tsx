import { cn } from 'cn'
import { STAGE_META, type LeadStage } from './meta'

/** Coloured stage label, e.g. "Meeting booked". */
export function StagePill({ stage, className }: { stage: LeadStage; className?: string }) {
  const { label, className: tone } = STAGE_META[stage]
  return (
    <span
      className={cn('inline-flex h-6 w-fit items-center rounded-lg px-2 text-xs font-semibold whitespace-nowrap', tone, className)}
    >
      {label}
    </span>
  )
}
