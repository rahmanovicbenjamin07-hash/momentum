import { useId, type ReactNode } from 'react'
import { cn } from 'cn'
import { TimeInput } from '@/components/ui/time-input'
import { ToggleSwitch } from './ToggleSwitch'

type SettingRowProps = {
  title: string
  subtitle: string
  /** "HH:MM"; leave out for a row without a time. null shows an empty time box. */
  time?: string | null
  onTimeChange?: (time: string | null) => void
  /** Second time box for a range, e.g. quiet hours "22:00 – 06:00". */
  timeEnd?: string | null
  onTimeEndChange?: (time: string | null) => void
  enabled: boolean
  onToggle: (enabled: boolean) => void
  /** Greys out the row and stops changes. */
  disabled?: boolean
  /** Shown before the time, e.g. a "Coming later" pill. */
  badge?: ReactNode
}

const timeClass = 'w-[110px]'

/** One settings line: title + faint subtitle on the left; optional time and a switch on the right. */
export function SettingRow({
  title,
  subtitle,
  time,
  onTimeChange,
  timeEnd,
  onTimeEndChange,
  enabled,
  onToggle,
  disabled = false,
  badge,
}: SettingRowProps) {
  const id = useId()
  const range = timeEnd !== undefined

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
      {/* The time boxes and switch fade themselves when disabled, so only the text fades here. */}
      <div className={cn('min-w-0 flex-1 basis-56', disabled && 'opacity-50')}>
        <p id={`${id}-title`} className="text-sm font-semibold text-foreground">
          {title}
        </p>
        <p id={`${id}-subtitle`} className="text-xs text-ink-2">
          {subtitle}
        </p>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
        {badge}
        {time !== undefined && (
          <div className="flex items-center gap-1.5">
            {/* 24-hour; saved on blur / Enter. Keyed by the saved time so it shows a change from elsewhere. */}
            <TimeInput
              key={time ?? ''}
              className={timeClass}
              inputClassName="h-9"
              aria-label={range ? `${title} start` : `${title} time`}
              defaultValue={time ?? ''}
              disabled={disabled}
              onCommit={(next) => next !== time && onTimeChange?.(next)}
            />
            {range && (
              <>
                <span aria-hidden="true" className="text-ink-2">
                  –
                </span>
                <TimeInput
                  key={timeEnd ?? ''}
                  className={timeClass}
                  inputClassName="h-9"
                  aria-label={`${title} end`}
                  defaultValue={timeEnd ?? ''}
                  disabled={disabled}
                  onCommit={(next) => next !== timeEnd && onTimeEndChange?.(next)}
                />
              </>
            )}
          </div>
        )}
        <ToggleSwitch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={disabled}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-subtitle`}
        />
      </div>
    </div>
  )
}
