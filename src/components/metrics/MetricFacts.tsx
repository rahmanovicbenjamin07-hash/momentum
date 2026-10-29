import { cn } from 'cn'

export type MetricFact = {
  label: string
  /** Already formatted, e.g. "+71%", "Accelerating", "≈ €17,837". */
  value: string
  detail?: string
  /** good = green, bad = red, warn = amber (e.g. a forecast short of the goal). */
  tone?: 'good' | 'bad' | 'warn' | 'neutral'
}

const TONE = { good: 'text-good', bad: 'text-bad', warn: 'text-warn', neutral: 'text-foreground' } as const

/**
 * The six facts under the chart: year so far · vs same time last year · average growth
 * per month · growth shape · best month · year-end forecast.
 */
export function MetricFacts({ facts }: { facts: readonly MetricFact[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col rounded-lg border border-border bg-background/60 px-3.5 py-3">
          <dt className="text-xs text-ink-2">{fact.label}</dt>
          <dd className={cn('mt-0.5 text-lg leading-snug font-bold', TONE[fact.tone ?? 'neutral'])}>{fact.value}</dd>
          {fact.detail && <dd className="mt-0.5 text-xs text-ink-2">{fact.detail}</dd>}
        </div>
      ))}
    </dl>
  )
}
