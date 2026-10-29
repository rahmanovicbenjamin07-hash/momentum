import type { Priority, QuickAddDay, QuickAddFormValues } from '@/schemas/today'
import { addDays, getToday, type DateKey } from './dates'
import { parseQuickAdd, repeatToDays } from './quickAdd'

/** What the quick-add bar hands to the page: a one-off task (with its day) or a new repeating (routine) item. */
export type QuickAddResult =
  | { kind: 'task'; title: string; time: string | null; tag: string | null; priority: Priority | null; dueDate: DateKey }
  | { kind: 'routine'; title: string; time: string | null; days: boolean[] }

export type QuickAddOutcome = { ok: true; value: QuickAddResult } | { ok: false; message: string }

/** Today / Tomorrow / the picked date → the task's day. */
export function quickAddDueDate(day: QuickAddDay, date: DateKey | undefined, today: DateKey): DateKey {
  if (day === 'tomorrow') return addDays(today, 1)
  if (day === 'date' && date) return date
  return today
}

/** What the Day field starts on when you're looking at `viewed`: Today, Tomorrow, or that date. */
export function defaultQuickAddDay(viewed: DateKey, today: DateKey): { day: QuickAddDay; date: DateKey | '' } {
  if (viewed === today) return { day: 'today', date: '' }
  if (viewed === addDays(today, 1)) return { day: 'tomorrow', date: '' }
  return { day: 'date', date: viewed }
}

/**
 * Turns validated form values into a task or routine item.
 * The time field wins over a time typed in the text. Repeating items have no tag, priority or day.
 */
export function buildQuickAdd(values: QuickAddFormValues, today: DateKey = getToday()): QuickAddOutcome {
  const parsed = parseQuickAdd(values.text)
  if (parsed.title === '') {
    return { ok: false, message: 'Add a few words besides the #tag, !priority or time' }
  }
  const time = values.time ?? parsed.time

  if (values.repeat === 'just_today') {
    return {
      ok: true,
      value: {
        kind: 'task',
        title: parsed.title,
        time,
        tag: parsed.tag,
        priority: parsed.priority,
        dueDate: quickAddDueDate(values.day, values.date, today),
      },
    }
  }
  return { ok: true, value: { kind: 'routine', title: parsed.title, time, days: repeatToDays(values.repeat) } }
}
