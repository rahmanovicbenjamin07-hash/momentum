import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { percent } from './chartTheme'

export type TemplateStat = {
  id: string
  name: string
  sent: number
  replies: number
  /** Replies ÷ sent, 0–1 (computed in src/lib). */
  rate: number
}

type TemplatesTableProps = {
  templates: readonly TemplateStat[]
  /** Opens the templates editor. "Manage" is hidden without it. */
  onManage?: () => void
  /** Fewer sends than this: "Too few sends", and it can't be "Best". Default 10 (as in the design). */
  minSends?: number
}

const badge = 'ml-2 inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-semibold whitespace-nowrap'

/**
 * "Message templates": sent, replies and reply rate per template. Trusted templates
 * come first by reply rate; the best trusted one gets "Best".
 */
export function TemplatesTable({ templates, onManage, minSends = 10 }: TemplatesTableProps) {
  const id = useId()
  const trusted = templates.filter((t) => t.sent >= minSends).sort((a, b) => b.rate - a.rate)
  const tooFew = templates.filter((t) => t.sent < minSends).sort((a, b) => b.sent - a.sent)
  const rows = [...trusted, ...tooFew]
  const bestId = trusted[0] && trusted[0].replies > 0 ? trusted[0].id : null

  return (
    <section aria-labelledby={`${id}-title`} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Message templates
        </h2>
        {onManage && (
          <Button variant="link" className="h-auto p-0 font-semibold" onClick={onManage}>
            Manage
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-3">No templates used yet. Pick one when you log a touch.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-background text-left text-xs font-semibold tracking-wider text-ink-2 uppercase">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Template
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Sent
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Replies
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold">
                  Reply rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((t) => (
                <tr key={t.id}>
                  <th scope="row" className="px-5 py-3 text-left font-semibold text-foreground">
                    {t.name}
                    {t.id === bestId && <span className={`${badge} bg-good-tint text-good`}>Best</span>}
                    {t.sent < minSends && <span className={`${badge} bg-warn-tint text-warn`}>Too few sends</span>}
                  </th>
                  <td className="px-3 py-3 text-right text-foreground tabular-nums">{t.sent}</td>
                  <td className="px-3 py-3 text-right text-foreground tabular-nums">{t.replies}</td>
                  <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{percent(t.rate, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
