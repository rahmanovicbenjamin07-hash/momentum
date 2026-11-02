import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

type WeekHeaderProps = {
  /** "This week", "Next week", "Last week" or "Week". */
  title: string
  /** "2 – 8 Nov 2026". */
  range: string
  isThisWeek: boolean
  onPrevWeek: () => void
  onThisWeek: () => void
  onNextWeek: () => void
  onDayView: () => void
}

/** Week view header: range + title, with ‹ This week › and a Day view button on the right. */
export function WeekHeader({ title, range, isThisWeek, onPrevWeek, onThisWeek, onNextWeek, onDayView }: WeekHeaderProps) {
  return (
    <PageHeader
      eyebrow={range}
      title={title}
      actions={
        <>
          <div role="group" aria-label="Change week" className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="glass-button" aria-label="Previous week" onClick={onPrevWeek}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="glass-button"
              aria-label={isThisWeek ? undefined : `${title}, go back to this week`}
              title={isThisWeek ? undefined : 'Go back to this week'}
              onClick={onThisWeek}
            >
              This week
            </Button>
            <Button variant="outline" size="icon" className="glass-button" aria-label="Next week" onClick={onNextWeek}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <Button variant="outline" className="glass-button" onClick={onDayView}>
            <CalendarDays aria-hidden="true" />
            Day view
          </Button>
        </>
      }
    />
  )
}
