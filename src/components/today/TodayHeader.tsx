import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { DEFAULT_TIME_ZONE, daysBetween, formatDate, formatLongDate, getToday, toDateKey, type DateKey } from '@/lib/dates'

type TodayHeaderProps = {
  /** The day being shown. */
  date: Date
  /** The real today, so the label can say "Tomorrow" etc. Defaults to today in `timeZone`. */
  today?: DateKey
  timeZone?: string
  onPrevDay: () => void
  onToday: () => void
  onNextDay: () => void
  onWeekView: () => void
  /** Opens the Add task pop-up; the button is left out without it. */
  onAddTask?: () => void
}

/** "Today" / "Tomorrow" / "Yesterday", or the short date for any other day. */
function dayLabel(day: DateKey, today: DateKey): string {
  const offset = daysBetween(today, day)
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  if (offset === -1) return 'Yesterday'
  return formatDate(day)
}

/** "Wednesday, 28 October 2026" + day title, with Add task, ‹ day › and Week view buttons on the right. */
export function TodayHeader({
  date,
  today,
  timeZone = DEFAULT_TIME_ZONE,
  onPrevDay,
  onToday,
  onNextDay,
  onWeekView,
  onAddTask,
}: TodayHeaderProps) {
  const realToday = today ?? getToday({ timeZone })
  const label = dayLabel(toDateKey(date, timeZone), realToday)
  const isToday = label === 'Today'

  return (
    <PageHeader
      eyebrow={formatLongDate(date, timeZone)}
      title={label}
      actions={
        <>
          {onAddTask && (
            <Button className="glass-button glass-button-primary" onClick={onAddTask}>
              <Plus aria-hidden="true" />
              Add task
            </Button>
          )}
          <div role="group" aria-label="Change day" className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="glass-button" aria-label="Previous day" onClick={onPrevDay}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="glass-button"
              aria-label={isToday ? undefined : `${label}, go back to today`}
              title={isToday ? undefined : 'Go back to today'}
              onClick={onToday}
            >
              {label}
            </Button>
            <Button variant="outline" size="icon" className="glass-button" aria-label="Next day" onClick={onNextDay}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <Button variant="outline" className="glass-button" onClick={onWeekView}>
            Week view
          </Button>
        </>
      }
    />
  )
}
