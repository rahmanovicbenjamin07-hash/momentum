import { CalendarDays, Mail } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { comingLaterClass, sectionClass, settingsSectionId } from './meta'

/** "Integrations" card. Nothing is connectable yet, so both rows say "Coming later". */
export function IntegrationsSettings() {
  const id = useId()
  return (
    <section
      id={settingsSectionId('integrations')}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className={cn(sectionClass, 'p-5')}
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
        Integrations
      </h2>
      <p className="text-[13px] text-ink-2">Connect the apps you already use</p>

      <ul className="mt-4 flex flex-col gap-3">
        <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-background p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-brand">
            <CalendarDays aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Google Calendar</p>
            <p className="text-xs text-ink-2">Not connected</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className={comingLaterClass}>Coming later</Badge>
            <Button disabled>Connect</Button>
          </div>
        </li>
        <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-dashed border-border p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-ink-2">
            <Mail aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Gmail</p>
            <p className="text-xs text-ink-2">Log sent emails to contacts automatically</p>
          </div>
          <Badge className={cn('ml-auto', comingLaterClass)}>Coming later</Badge>
        </li>
      </ul>
    </section>
  )
}
