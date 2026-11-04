import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { mockTodayItems } from '@/mocks/today'
import type { TodayItem, TodayItemStatus } from '@/schemas/today'
import { TodayTasksCard } from './TodayTasksCard'

function setup(items: TodayItem[] = mockTodayItems, extra: Partial<ComponentProps<typeof TodayTasksCard>> = {}) {
  const handlers = {
    onStatus: vi.fn<(item: TodayItem, status: TodayItemStatus) => void>(),
    onRemove: vi.fn<(id: string) => void>(),
  }
  render(<TodayTasksCard items={items} {...handlers} {...extra} />)
  return handlers
}

const rowTitles = () =>
  within(screen.getByRole('list', { name: 'Tasks' }))
    .getAllByRole('listitem')
    .map((row) => row.querySelector('span[id]')?.textContent)

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

  it('passes ✓ / ✗ up', async () => {
    const user = userEvent.setup()
    const h = setup()
    await user.click(screen.getByRole('button', { name: 'Done', description: 'Read 20 pages' }))
    expect(h.onStatus).toHaveBeenCalledWith(expect.objectContaining({ title: 'Read 20 pages' }), 'done')
    await user.click(screen.getByRole('button', { name: 'Not done', description: 'Read 20 pages' }))
    expect(h.onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Read 20 pages' }), 'missed')
  })

  it('shows Edit and Delete on every row when given', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn<(item: TodayItem) => void>()
    setup(mockTodayItems, { onEdit, onDeleteTask: vi.fn<(item: TodayItem) => void>() })
    expect(screen.getAllByRole('button', { name: 'Edit task' })).toHaveLength(11)
    expect(screen.getAllByRole('button', { name: 'Delete task' })).toHaveLength(11)
    await user.click(screen.getByRole('button', { name: 'Edit task', description: 'Review Q4 goals' }))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Review Q4 goals' }))
  })

  it('puts “Not done” items at the bottom with the done ones', () => {
    setup(mockTodayItems.map((i) => (i.title === 'Read 20 pages' ? { ...i, missed: true } : i)))
    expect(rowTitles().indexOf('Read 20 pages (not done)')).toBeGreaterThan(rowTitles().indexOf('Wake up'))
  })

  it('folds down to the heading with the arrow and back', async () => {
    const user = userEvent.setup()
    const onCollapsedChange = vi.fn<(collapsed: boolean) => void>()
    setup(mockTodayItems, { onCollapsedChange })
    const toggle = screen.getByRole('button', { name: /Today’s tasks/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true)
    expect(screen.getByRole('heading', { name: /Today’s tasks.*5\/11/ })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Tasks' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'All 11' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit repeating' })).toBeNull()

    await user.click(toggle)
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false)
    expect(screen.getByRole('list', { name: 'Tasks' })).toBeInTheDocument()
  })

  it('can start folded', () => {
    setup(mockTodayItems, { defaultCollapsed: true })
    expect(screen.getByRole('button', { name: /Today’s tasks/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Tasks' })).toBeNull()
  })

  it('works as tomorrow’s card', () => {
    setup([], { day: 'tomorrow' })
    expect(screen.getByRole('heading', { name: /Tomorrow’s tasks.*0\/0/ })).toBeInTheDocument()
    expect(screen.getByText('Nothing planned for tomorrow. Add a task above.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit repeating' })).toBeNull()
  })

  it('shows an empty message', () => {
    setup([])
    expect(screen.getByText('Nothing planned for today. Add a task above.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /0\/0/ })).toBeInTheDocument()
  })
})
