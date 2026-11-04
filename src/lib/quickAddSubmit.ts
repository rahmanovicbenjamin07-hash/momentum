import { TZDate } from '@date-fns/tz'
import { timeRangeIssue, type Priority, type QuickAddDay, type QuickAddFormValues } from '@/schemas/today'
import { addDays, DEFAULT_TIME_ZONE, getToday, type DateKey } from './dates'
import { parseQuickAdd, repeatToDays } from './quickAdd'

/** What the quick-add bar hands to the page: a one-off task (with its day) or a new repeating (routine) item. */
export type QuickAddResult =
  | {
      kind: 'task'
      title: string
      time: string | null
      /** End of a range (time–endTime), null = just a start time. */
      endTime: string | null
      tag: string | null
      priority: Priority | null
      dueDate: DateKey
    }
  | { kind: 'routine'; title: string; time: string | null; endTime: string | null; days: boolean[] }

export type QuickAddOutcome = { ok: true; value: QuickAddResult } | { ok: false; message: string }

/** Today / Tomorrow / the picked date → the task's day. */
export function quickAddDueDate(day: QuickAddDay, date: DateKey | undefined, today: DateKey): DateKey {
  if (day === 'tomorrow') return addDays(today, 1)
  if (day === 'date' && date) return date
  return today
}

/** From this hour on, a task added while looking at today defaults to tomorrow (planning the next day). */
export const PLAN_TOMORROW_FROM_HOUR = 13

/**
 * What the Day field starts on when you're looking at `viewed`: Today, Tomorrow, or that date.
 * Looking at today: Today before 1 PM, Tomorrow from 1 PM (in `timeZone`).
 */
export function defaultQuickAddDay(
  viewed: DateKey,
  today: DateKey,
  { now = new Date(), timeZone = DEFAULT_TIME_ZONE }: { now?: Date; timeZone?: string } = {},
): { day: QuickAddDay; date: DateKey | '' } {
  if (viewed === today) {
    const hour = new TZDate(now, timeZone).getHours()
    return { day: hour < PLAN_TOMORROW_FROM_HOUR ? 'today' : 'tomorrow', date: '' }
  }
  if (viewed === addDays(today, 1)) return { day: 'tomorrow', date: '' }
  return { day: 'date', date: viewed }
}

/**
 * Turns validated form values into a task or routine item.
 * The time field wins over a time typed in the text; an end time makes it a range (08:00–11:00).
 * Repeating items have no tag, priority or day;
 * "every week" uses the chosen day's weekday.
 */
export function buildQuickAdd(values: QuickAddFormValues, today: DateKey = getToday()): QuickAddOutcome {
  const parsed = parseQuickAdd(values.text)
  if (parsed.title === '') {
    return { ok: false, message: 'Add a few words besides the #tag, !priority or time' }
  }
  const time = values.time ?? parsed.time
  const endTime = values.endTime ?? null
  // The form checks the range against the Time field; this also covers a time typed in the name.
  const rangeIssue = timeRangeIssue(time, endTime)
  if (rangeIssue) return { ok: false, message: rangeIssue }

  if (values.repeat === 'just_today') {
    return {
      ok: true,
      value: {
        kind: 'task',
        title: parsed.title,
        time,
        endTime,
        tag: parsed.tag,
        priority: parsed.priority,
        dueDate: quickAddDueDate(values.day, values.date, today),
      },
    }
  }
  const days = repeatToDays(values.repeat, quickAddDueDate(values.day, values.date, today))
  return { ok: true, value: { kind: 'routine', title: parsed.title, time, endTime, days } }
}
