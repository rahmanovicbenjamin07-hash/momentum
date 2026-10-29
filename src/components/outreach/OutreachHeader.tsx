import { Plus } from 'lucide-react'
import { cn } from 'cn'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export type OutreachView = 'table' | 'board'

type OutreachHeaderProps = {
  leadCount: number
  followUpsDue: number
  /** Sum of deal values of open leads, in euro. */
  openPipeline: number
  view: OutreachView
  onViewChange: (view: OutreachView) => void
  onTemplates: () => void
  onImportCsv: () => void
  /** Downloads every lead as a CSV file. Button hidden without it. */
  onExportCsv?: () => void
  onAddLead: () => void
}

const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const VIEWS: { value: OutreachView; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'board', label: 'Board' },
]

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "38 leads · 4 follow-ups due · €18,400 open pipeline", title, Table/Board toggle and actions. */
export function OutreachHeader({
  leadCount,
  followUpsDue,
  openPipeline,
  view,
  onViewChange,
  onTemplates,
  onImportCsv,
  onExportCsv,
  onAddLead,
}: OutreachHeaderProps) {
  const summary = [
    plural(leadCount, 'lead', 'leads'),
    `${plural(followUpsDue, 'follow-up', 'follow-ups')} due`,
    `${euro.format(openPipeline)} open pipeline`,
  ].join(' · ')

  return (
    <PageHeader
      eyebrow={summary}
      title="Outreach"
      actions={
        <>
          <div role="group" aria-label="View" className="flex rounded-lg border border-border bg-muted p-1">
            {VIEWS.map(({ value, label }) => {
              const selected = view === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onViewChange(value)}
                  className={cn(
                    'h-8 rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected ? 'bg-card text-foreground' : 'text-ink-2 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <Button variant="outline" className="bg-card" onClick={onTemplates}>
            Templates
          </Button>
          <Button variant="outline" className="bg-card" onClick={onImportCsv}>
            Import CSV
          </Button>
          {onExportCsv && (
            <Button variant="outline" className="bg-card" onClick={onExportCsv}>
              Export CSV
            </Button>
          )}
          <Button onClick={onAddLead}>
            <Plus aria-hidden="true" />
            Add lead
          </Button>
        </>
      }
    />
  )
}
