import { useId } from 'react'
import { cn } from 'cn'
import { Repeat } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatRepeatDays, tagLabel, tagTone, type TagTone } from '@/lib/today-list'
import type { Priority, TodayItem } from '@/schemas/today'

const TONE_CLASSES: Record<TagTone, string> = {
  brand: 'bg-brand-tint text-brand',
  info: 'bg-info-tint text-info',
  neutral: 'bg-muted text-ink-2',
  pink: 'bg-[#FCE7F3] text-[#BE185D]',
  good: 'bg-good-tint text-good',
  warn: 'bg-warn-tint text-warn',
}

const PRIORITY: Record<Priority, { label: string; className: string }> = {
  high: { label: 'High', className: 'text-bad' },
  medium: { label: 'Medium', className: 'text-warn' },
  low: { label: 'Low', className: 'text-ink-3' },
}

const chip = 'inline-flex h-6 items-center gap-1 rounded-lg px-2 text-xs font-medium whitespace-nowrap'

type TaskRowProps = {
  item: TodayItem
  onToggle: (item: TodayItem, done: boolean) => void
}

/** One line in "Today's tasks": checkbox, title, repeating chip or tag + priority, time. */
export function TaskRow({ item, onToggle }: TaskRowProps) {
  const checkboxId = useId()

  return (
    <li className="flex min-h-16 items-center gap-3 border-t border-border px-4 py-3" data-done={item.done || undefined}>
      <Checkbox
        id={checkboxId}
        checked={item.done}
        onCheckedChange={(checked) => onToggle(item, checked === true)}
        className="size-[18px] border-ink-3"
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
        <label
          htmlFor={checkboxId}
          className={cn(
            'min-w-0 flex-1 basis-56 cursor-pointer text-[15px] break-words',
            item.done ? 'text-ink-3 line-through' : 'text-foreground',
          )}
        >
          {item.title}
        </label>
        <div className="flex items-center gap-3">
          {item.kind === 'routine' ? (
            <span className={cn(chip, TONE_CLASSES.brand)}>
              <Repeat className="size-3" aria-hidden="true" />
              Repeating · {formatRepeatDays(item.days ?? [])}
            </span>
          ) : (
            <>
              {item.tag && <span className={cn(chip, TONE_CLASSES[tagTone(item.tag)])}>{tagLabel(item.tag)}</span>}
              {item.priority && (
                <span className={cn('text-[13px] font-medium sm:w-14', PRIORITY[item.priority].className)}>
                  <span className="sr-only">Priority: </span>
                  {PRIORITY[item.priority].label}
                </span>
              )}
            </>
          )}
          <span className={cn('text-[15px] sm:w-16 sm:text-right', item.time ? 'text-foreground' : 'text-ink-3')}>
            {item.time ?? 'Anytime'}
          </span>
        </div>
      </div>
    </li>
  )
}
