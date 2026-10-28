import { describe, expect, it } from 'vitest'
import { formatOverdue } from './overdue'

describe('formatOverdue', () => {
  it.each([
    ['2026-10-28', 'Due today'],
    ['2026-10-27', 'Due yesterday'],
    ['2026-10-25', 'Due 3 days ago'],
    ['2026-10-22', 'Due 6 days ago'],
    ['2026-10-21', 'Due 21 Oct 2026'],
    ['2026-09-30', 'Due 30 Sep 2026'],
  ])('%s → %s', (due, label) => {
    expect(formatOverdue(due, '2026-10-28')).toBe(label)
  })
})
