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
          <div role="group" aria-label="View" className="glass-input flex h-10 border p-1">
            {VIEWS.map(({ value, label }) => {
              const selected = view === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onViewChange(value)}
                  className={cn(
                    'h-full rounded-lg px-3 text-sm font-medium outline-none transition-[background-color,box-shadow] duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none',
                    selected
                      ? 'bg-white text-foreground shadow-[0_1px_2px_rgb(17_24_39/0.08),0_2px_8px_rgb(17_24_39/0.06)] dark:bg-white/10 dark:shadow-none'
                      : 'text-ink-2 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <Button variant="outline" className="glass-button" onClick={onTemplates}>
            Templates
          </Button>
          <Button variant="outline" className="glass-button" onClick={onImportCsv}>
            Import CSV
          </Button>
          {onExportCsv && (
            <Button variant="outline" className="glass-button" onClick={onExportCsv}>
              Export CSV
            </Button>
          )}
          <Button className="glass-button glass-button-primary" onClick={onAddLead}>
            <Plus aria-hidden="true" />
            Add lead
          </Button>
        </>
      }
    />
  )
}
