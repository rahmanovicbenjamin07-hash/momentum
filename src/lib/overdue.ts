import { daysBetween, formatDate, type DateKey } from './dates'

/** "Due yesterday", "Due 3 days ago", or "Due 21 Oct 2026" when a week or more late. */
export function formatOverdue(dueDate: DateKey, today: DateKey): string {
  const late = daysBetween(dueDate, today)
  if (late <= 0) return 'Due today'
  if (late === 1) return 'Due yesterday'
  if (late < 7) return `Due ${late} days ago`
  return `Due ${formatDate(dueDate)}`
}
