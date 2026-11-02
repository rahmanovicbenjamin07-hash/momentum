import { BellRing } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { comingLaterClass, sectionClass, settingsSectionId } from './meta'

/** "Notifications" card while reminders aren't built yet: nothing to switch on, just a note that it's on the way. */
export function NotificationsComingSoon() {
  const id = useId()
  return (
    <section
      id={settingsSectionId('notifications')}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className={cn(sectionClass, 'p-5')}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
          Notifications
        </h2>
        <Badge className={comingLaterClass}>Coming soon</Badge>
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed border-border p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-ink-2">
          <BellRing aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Reminders aren’t working yet</p>
          <p className="text-[13px] text-ink-2">
            Reminders for your routine, follow-ups and closing the day are on the way. There’s nothing to set up for now.
          </p>
        </div>
      </div>
    </section>
  )
}
