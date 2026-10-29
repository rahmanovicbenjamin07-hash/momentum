import { cn } from 'cn'

type ToggleSwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** Give it a name: aria-label, or aria-labelledby pointing at the row title. */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

/** 44×24 on/off switch; accent when on. */
export function ToggleSwitch({ checked, onCheckedChange, disabled = false, ...aria }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-ink-3 dark:bg-input',
      )}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-5 rounded-full bg-white transition-transform motion-reduce:transition-none',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
