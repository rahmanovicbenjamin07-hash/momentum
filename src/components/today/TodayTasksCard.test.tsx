import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockRoutineItems, mockTodayItems } from '@/mocks/today'
import type { TodayItem } from '@/schemas/today'
import { TodayTasksCard } from './TodayTasksCard'

function setup(items: TodayItem[] = mockTodayItems) {
  const handlers = {
    onToggle: vi.fn<(item: TodayItem, done: boolean) => void>(),
    onChangeDays: vi.fn<(id: string, days: boolean[]) => void>(),
    onChangeTime: vi.fn<(id: string, time: string | null) => void>(),
    onRemove: vi.fn<(id: string) => void>(),
  }
  render(<TodayTasksCard items={items} routineItems={mockRoutineItems} {...handlers} />)
  return handlers
}

const rowTitles = () =>
  within(screen.getByRole('list', { name: 'Tasks' }))
    .getAllByRole('listitem')
    .map((row) => row.querySelector('label')?.textContent)

describe('TodayTasksCard', () => {
  it('shows the done count, progress and filter counts', () => {
    setup()
    expect(screen.getByRole('heading', { name: /Today’s tasks.*5\/11/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Today’s progress: 45%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All 11' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Repeating 5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'One-off 6' })).toBeInTheDocument()
  })

  it('lists unfinished first, then by time, done at the bottom (as in the design)', () => {
    setup()
    expect(rowTitles()).toEqual([
      'Follow up with Emir Kovač (Bloom Studio)',
      'Prepare demo for Thursday call',
      'Read 20 pages',
      'Send 10 outreach messages',
      'Call accountant about October invoice',
      'Review Q4 goals',
      'Wake up',
      'Morning workout',
      'Plan today’s top 3 tasks',
      'Plan weekly content calendar',
      'Update portfolio case study',
    ])
  })

  it('filters by kind', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Repeating 5' }))
    expect(rowTitles()).toHaveLength(5)
    await user.click(screen.getByRole('button', { name: 'One-off 6' }))
    expect(rowTitles()).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'One-off 6' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('passes ticks up', async () => {
    const user = userEvent.setup()
    const h = setup()
    await user.click(screen.getByRole('checkbox', { name: 'Read 20 pages' }))
    expect(h.onToggle).toHaveBeenCalledWith(expect.objectContaining({ title: 'Read 20 pages' }), true)
  })

  it('switches to Edit repeating and back with Done', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Edit repeating' }))
    expect(screen.getByRole('group', { name: 'Days for Long run' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'All 11' })).toBeNull()
    await user.click(screen.getAllByRole('button', { name: 'Done' })[0]!)
    expect(screen.getByRole('list', { name: 'Tasks' })).toBeInTheDocument()
  })

  it('shows an empty message', () => {
    setup([])
    expect(screen.getByText('Nothing planned for today. Add a task above.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /0\/0/ })).toBeInTheDocument()
  })
})
