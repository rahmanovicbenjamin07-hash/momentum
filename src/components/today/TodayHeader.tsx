import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { DEFAULT_TIME_ZONE, formatLongDate } from '@/lib/dates'

type TodayHeaderProps = {
  /** The day being shown. */
  date: Date
  timeZone?: string
  onPrevDay: () => void
  onToday: () => void
  onNextDay: () => void
  onWeekView: () => void
}

/** "Wednesday, 28 October 2026" + "Today" title, with ‹ Today › and Week view buttons on the right. */
export function TodayHeader({
  date,
  timeZone = DEFAULT_TIME_ZONE,
  onPrevDay,
  onToday,
  onNextDay,
  onWeekView,
}: TodayHeaderProps) {
  return (
    <PageHeader
      eyebrow={formatLongDate(date, timeZone)}
      title="Today"
      actions={
        <>
          <div role="group" aria-label="Change day" className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="bg-card" aria-label="Previous day" onClick={onPrevDay}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button variant="outline" className="bg-card" onClick={onToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="bg-card" aria-label="Next day" onClick={onNextDay}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <Button variant="outline" className="bg-card" onClick={onWeekView}>
            Week view
          </Button>
        </>
      }
    />
  )
}
