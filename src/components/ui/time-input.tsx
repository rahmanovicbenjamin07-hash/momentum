import { Clock } from 'lucide-react'
import type { ChangeEvent, ComponentProps } from 'react'
import { cn } from 'cn'
import { parseTimeText } from '@/lib/timeText'
import { Input } from './input'

type TimeInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  /**
   * Called on blur / Enter with "HH:MM", or null when emptied, if what was typed is a time.
   * Something that isn't a time goes back to the last value instead.
   */
  onCommit?: (time: string | null) => void
  /** Classes for the outer box (width etc.). */
  className?: string
  /** Classes for the text box itself (e.g. a smaller height). */
  inputClassName?: string
}

/**
 * 24-hour time box (no AM/PM): type "9", "930", "21:30"… and it becomes "09:00", "09:30", "21:30"
 * when you leave the box or press Enter. Works with React Hook Form's register() and on its own with onCommit.
 */
export function TimeInput({ className, inputClassName, onBlur, onKeyDown, onChange, onCommit, ...props }: TimeInputProps) {
  /** Writes the tidy "HH:MM" into the box (telling onChange, so forms see it) and reports it. */
  function settle(input: HTMLInputElement) {
    const parsed = parseTimeText(input.value)
    if (!parsed.ok) {
      if (onCommit) input.value = input.defaultValue
      return
    }
    if (parsed.value !== input.value) {
      input.value = parsed.value
      onChange?.({ target: input, currentTarget: input, type: 'change' } as unknown as ChangeEvent<HTMLInputElement>)
    }
    onCommit?.(parsed.value || null)
  }

  return (
    <div className={cn('relative', className)}>
      <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH:MM"
        maxLength={5}
        className={cn('pl-9 tabular-nums', inputClassName)}
        onChange={onChange}
        onBlur={(event) => {
          settle(event.currentTarget)
          onBlur?.(event)
        }}
        onKeyDown={(event) => {
          // Tidy up before Enter submits the form.
          if (event.key === 'Enter') settle(event.currentTarget)
          onKeyDown?.(event)
        }}
        {...props}
      />
    </div>
  )
}
