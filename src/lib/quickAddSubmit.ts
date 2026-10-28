import type { Priority, QuickAddFormValues } from '@/schemas/today'
import { parseQuickAdd, repeatToDays } from './quickAdd'

/** What the quick-add bar hands to the page: a one-off task or a new repeating (routine) item. */
export type QuickAddResult =
  | { kind: 'task'; title: string; time: string | null; tag: string | null; priority: Priority | null }
  | { kind: 'routine'; title: string; time: string | null; days: boolean[] }

export type QuickAddOutcome = { ok: true; value: QuickAddResult } | { ok: false; message: string }

/**
 * Turns validated form values into a task or routine item.
 * The time field wins over a time typed in the text. Repeating items have no tag or priority.
 */
export function buildQuickAdd(values: QuickAddFormValues): QuickAddOutcome {
  const parsed = parseQuickAdd(values.text)
  if (parsed.title === '') {
    return { ok: false, message: 'Add a few words besides the #tag, !priority or time' }
  }
  const time = values.time ?? parsed.time

  if (values.repeat === 'just_today') {
    return {
      ok: true,
      value: { kind: 'task', title: parsed.title, time, tag: parsed.tag, priority: parsed.priority },
    }
  }
  return { ok: true, value: { kind: 'routine', title: parsed.title, time, days: repeatToDays(values.repeat) } }
}
