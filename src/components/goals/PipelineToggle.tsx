import { useId } from 'react'
import { DEAL_STAGE_LABELS, formatEur, formatPercent, type PipelineDeal } from './meta'

type PipelineToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Sum of all deals' expected values. */
  total: number
  deals: PipelineDeal[]
}

/** Amber box on money goals: count open Outreach deals (weighted by stage) towards the goal. */
export function PipelineToggle({ checked, onChange, total, deals }: PipelineToggleProps) {
  const id = useId()
  const explainId = `${id}-explain`

  // One "Stage NN%" per stage, in the order the deals come in.
  const stageRates = [...new Map(deals.map((d) => [d.stage, d.probability])).entries()]
    .map(([stage, p]) => `${DEAL_STAGE_LABELS[stage]} ${formatPercent(p)}`)
    .join(', ')

  return (
    <div className="rounded-[10px] border border-warn/30 bg-warn-tint px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={deals.length > 0 ? explainId : undefined}
          className="size-4 shrink-0 cursor-pointer accent-warn"
        />
        <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-foreground">
          Count open deals from Outreach{' '}
          <span className="font-medium text-warn tabular-nums">≈ {formatEur(total)} expected</span>
        </label>
      </div>

      {deals.length > 0 ? (
        <>
          <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Open deals">
            {deals.map((deal) => (
              <li
                key={deal.id}
                className="rounded-lg border border-warn/30 bg-card px-2.5 py-1 text-[13px] text-foreground tabular-nums"
              >
                <span className="font-semibold">{deal.name}</span>
                {` · ${DEAL_STAGE_LABELS[deal.stage]} · ${formatEur(deal.amount)} × ${formatPercent(deal.probability)} = `}
                <span className="font-semibold">{formatEur(deal.expected)}</span>
              </li>
            ))}
          </ul>
          <p id={explainId} className="mt-2.5 text-xs text-warn">
            Each open deal counts by how likely its stage is to close: {stageRates}.
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-warn">No open deals in Outreach right now.</p>
      )}
    </div>
  )
}
