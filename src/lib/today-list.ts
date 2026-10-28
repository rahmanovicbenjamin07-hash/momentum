import type { TodayItem, TodayItemKind } from '@/schemas/today'

/** Mon..Sun, matching the `days boolean[7]` column. */
export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

/**
 * Short label for the days a routine item repeats:
 * "Every day", "Mon–Fri", "Weekends", "Mon–Thu" (3+ days in a row), "Mon, Wed, Fri", "No days".
 */
export function formatRepeatDays(days: readonly boolean[]): string {
  const on = WEEKDAY_SHORT.filter((_, i) => days[i])
  if (on.length === 0) return 'No days'
  if (on.length === 7) return 'Every day'
  const key = days.map((d) => (d ? '1' : '0')).join('')
  if (key === '1111100') return 'Mon–Fri'
  if (key === '0000011') return 'Weekends'

  // One unbroken run of 3+ days (within Mon..Sun) reads better as a range.
  const first = days.indexOf(true)
  const last = days.lastIndexOf(true)
  if (on.length >= 3 && last - first + 1 === on.length) {
    return `${WEEKDAY_SHORT[first]}–${WEEKDAY_SHORT[last]}`
  }
  return on.join(', ')
}

/** "06:00:00" (Postgres) or "06:00" → "06:00". Null stays null. */
export function toHHMM(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null
}

/**
 * Order for "Today's tasks": unfinished first, done at the bottom;
 * inside each group by time, with "Anytime" last. Ties keep their original order.
 */
export function sortTodayItems(items: readonly TodayItem[]): TodayItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.done !== b.item.done) return a.item.done ? 1 : -1
      const ta = a.item.time
      const tb = b.item.time
      if (ta !== tb) {
        if (ta === null) return 1
        if (tb === null) return -1
        return ta < tb ? -1 : 1
      }
      return a.index - b.index
    })
    .map(({ item }) => item)
}

export type TodayFilter = 'all' | TodayItemKind

export function filterTodayItems(items: readonly TodayItem[], filter: TodayFilter): TodayItem[] {
  return filter === 'all' ? [...items] : items.filter((item) => item.kind === filter)
}

export type TodayCounts = {
  all: number
  routine: number
  task: number
  done: number
  routineDone: number
  taskDone: number
}

export function countTodayItems(items: readonly TodayItem[]): TodayCounts {
  const counts: TodayCounts = { all: 0, routine: 0, task: 0, done: 0, routineDone: 0, taskDone: 0 }
  for (const item of items) {
    counts.all += 1
    counts[item.kind] += 1
    if (item.done) {
      counts.done += 1
      if (item.kind === 'routine') counts.routineDone += 1
      else counts.taskDone += 1
    }
  }
  return counts
}

/** Whole percent, 0 when there is nothing to do. */
export function percentDone(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

/** "outreach" → "Outreach". */
export function tagLabel(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1)
}

export type TagTone = 'brand' | 'info' | 'neutral' | 'pink' | 'good' | 'warn'

const KNOWN_TAG_TONES: Record<string, TagTone> = {
  outreach: 'brand',
  work: 'info',
  personal: 'neutral',
  marketing: 'pink',
  health: 'good',
  finance: 'warn',
}
const FALLBACK_TONES: readonly TagTone[] = ['info', 'good', 'warn', 'pink', 'brand', 'neutral']

/** Chip colour for a tag. Known tags have fixed colours; others always get the same colour from their name. */
export function tagTone(tag: string): TagTone {
  const key = tag.toLowerCase()
  const known = KNOWN_TAG_TONES[key]
  if (known) return known
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK_TONES[hash % FALLBACK_TONES.length] ?? 'neutral'
}
