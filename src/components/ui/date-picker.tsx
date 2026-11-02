import { format } from 'date-fns'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { addMonths, clampDate, monthGrid, monthStart, sameMonth, shiftMonths } from '@/lib/calendar'
import { addDays, formatDate, formatLongDate, getToday, isDateKey, weekStart, type DateKey, type WeekStartsOn } from '@/lib/dates'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

type DatePickerProps = {
  id?: string
  /** "yyyy-MM-dd", or '' for no date. */
  value: string | undefined
  onChange: (value: string) => void
  onBlur?: () => void
  min?: DateKey
  max?: DateKey
  /** Shows a "Clear" button (for optional dates). */
  clearable?: boolean
  placeholder?: string
  /** Defaults to Sarajevo today. */
  today?: DateKey
  weekStartsOn?: WeekStartsOn
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

function monthTitle(month: DateKey): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return format(new Date(y, m - 1, 1), 'MMMM yyyy')
}

/**
 * A button that shows the date ("28 Oct 2026") and opens a month calendar.
 * Keyboard: arrows move a day / week, Home / End the week, Page Up / Down a month, Enter picks.
 */
export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  min,
  max,
  clearable = false,
  placeholder = 'Pick a date',
  today: todayProp,
  weekStartsOn = 1,
  className,
  ...aria
}: DatePickerProps) {
  const today = todayProp ?? getToday()
  const selected = isDateKey(value) ? value : null
  const [open, setOpen] = useState(false)
  // The day that keyboard focus sits on, and the month on screen.
  const [active, setActive] = useState<DateKey>(() => clampDate(selected ?? today, min, max))
  const [month, setMonth] = useState<DateKey>(() => monthStart(active))
  const gridRef = useRef<HTMLDivElement>(null)
  const moved = useRef(false)

  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${active}"]`)?.focus()
  }, [active])

  function handleOpenChange(next: boolean) {
    if (next) {
      const start = clampDate(selected ?? today, min, max)
      setActive(start)
      setMonth(monthStart(start))
    } else {
      onBlur?.()
    }
    setOpen(next)
  }

  function pick(day: DateKey) {
    onChange(day)
    setOpen(false)
    onBlur?.()
  }

  function moveTo(day: DateKey) {
    const next = clampDate(day, min, max)
    moved.current = true
    setActive(next)
    if (!sameMonth(next, month)) setMonth(monthStart(next))
  }

  function onDayKeyDown(event: KeyboardEvent) {
    const offsets: Record<string, () => DateKey> = {
      ArrowLeft: () => addDays(active, -1),
      ArrowRight: () => addDays(active, 1),
      ArrowUp: () => addDays(active, -7),
      ArrowDown: () => addDays(active, 7),
      Home: () => weekStart(active, weekStartsOn),
      End: () => addDays(weekStart(active, weekStartsOn), 6),
      PageUp: () => shiftMonths(active, event.shiftKey ? -12 : -1),
      PageDown: () => shiftMonths(active, event.shiftKey ? 12 : 1),
    }
    const target = offsets[event.key]
    if (!target) return
    event.preventDefault()
    moveTo(target())
  }

  const days = monthGrid(month, weekStartsOn)
  const weekdays = weekStartsOn === 1 ? WEEKDAYS : [WEEKDAYS[6], ...WEEKDAYS.slice(0, 6)]
  const outOfRange = (day: DateKey) => Boolean((min && day < min) || (max && day > max))
  const canPrev = !min || monthStart(min) < month
  const canNext = !max || monthStart(max) > month

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          data-slot="date-trigger"
          data-empty={selected ? undefined : ''}
          {...aria}
          className={cn(
            'flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm text-foreground outline-none',
            'transition-colors hover:border-ink-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/30 aria-invalid:border-bad',
            className,
          )}
        >
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-brand" />
          <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-3')}>
            {selected ? formatDate(selected) : placeholder}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="w-[18.5rem] gap-3 rounded-xl p-3"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          gridRef.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus()
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            disabled={!canPrev}
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <div aria-live="polite" className="text-sm font-semibold text-foreground">
            {monthTitle(month)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            disabled={!canNext}
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        <div aria-hidden="true" className="grid grid-cols-7 text-center text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
          {weekdays.map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>

        <div ref={gridRef} role="group" aria-label={monthTitle(month)} className="grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const isSelected = day === selected
            const isToday = day === today
            const inMonth = sameMonth(day, month)
            const disabled = outOfRange(day)
            // Roving focus: only one day is in the Tab order; the active one if it's on screen.
            const focusable = sameMonth(active, month) ? day === active : day === month
            return (
              <button
                key={day}
                type="button"
                data-day={day}
                tabIndex={focusable ? 0 : -1}
                disabled={disabled}
                aria-label={formatLongDate(day)}
                aria-pressed={isSelected}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => pick(day)}
                onFocus={() => setActive(day)}
                onKeyDown={onDayKeyDown}
                className={cn(
                  'relative grid h-9 place-items-center rounded-lg text-sm tabular-nums outline-none transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring',
                  inMonth ? 'text-foreground' : 'text-ink-3',
                  !isSelected && !disabled && 'hover:bg-brand-tint hover:text-brand',
                  isToday && !isSelected && 'font-semibold text-brand',
                  isSelected && 'bg-brand font-semibold text-white',
                  disabled && 'cursor-not-allowed opacity-35',
                )}
              >
                {Number(day.slice(8, 10))}
                {isToday && (
                  <span
                    aria-hidden="true"
                    className={cn('absolute bottom-1 size-1 rounded-full', isSelected ? 'bg-white' : 'bg-brand')}
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-brand"
            disabled={outOfRange(today)}
            onClick={() => pick(today)}
          >
            Today
          </Button>
          {clearable && selected && (
            <Button type="button" variant="ghost" size="sm" className="text-ink-2" onClick={() => pick('')}>
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
