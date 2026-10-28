import type { Priority, Repeat } from '@/schemas/today'

export type ParsedQuickAdd = {
  /** Text with the #tag, !priority and time removed. Can be empty, so validate it. */
  title: string
  /** Lower-case tag without "#", e.g. "outreach". */
  tag: string | null
  priority: Priority | null
  /** "HH:MM" */
  time: string | null
}

// Each token must stand on its own (start of text or after a space, then a space or the end).
const TAG_RE = /(^|\s)#([^\s#]{1,32})(?=\s|$)/
const PRIORITY_RE = /(^|\s)!(high|medium|low)(?=\s|$)/i
const TIME_RE = /(^|\s)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/

/**
 * Reads shortcuts from the quick-add text:
 * "Call Amir 10:00 #outreach !high" → title "Call Amir", time "10:00", tag "outreach", priority "high".
 * Only the first of each kind is used; any others stay in the title.
 */
export function parseQuickAdd(text: string): ParsedQuickAdd {
  let rest = text

  let tag: string | null = null
  const tagMatch = TAG_RE.exec(rest)
  if (tagMatch) {
    tag = (tagMatch[2] ?? '').toLowerCase()
    rest = rest.replace(TAG_RE, '$1')
  }

  let priority: Priority | null = null
  const priorityMatch = PRIORITY_RE.exec(rest)
  if (priorityMatch) {
    priority = (priorityMatch[2] ?? '').toLowerCase() as Priority
    rest = rest.replace(PRIORITY_RE, '$1')
  }

  let time: string | null = null
  const timeMatch = TIME_RE.exec(rest)
  if (timeMatch) {
    time = `${(timeMatch[2] ?? '').padStart(2, '0')}:${timeMatch[3] ?? ''}`
    rest = rest.replace(TIME_RE, '$1')
  }

  const title = rest.replace(/\s+/g, ' ').trim()
  return { title, tag, priority, time }
}

/** Mon..Sun for the Repeat select. "Just today" is a one-off task, so no routine days. */
export function repeatToDays(repeat: Repeat): boolean[] {
  switch (repeat) {
    case 'every_day':
      return [true, true, true, true, true, true, true]
    case 'weekdays':
      return [true, true, true, true, true, false, false]
    case 'weekends':
      return [false, false, false, false, false, true, true]
    case 'just_today':
      return [false, false, false, false, false, false, false]
  }
}
