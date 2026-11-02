import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { DateKey } from '@/lib/dates'
import { mockWeekColumns } from '@/mocks/week'
import type { TodayItem } from '@/schemas/today'
import { WeekGrid } from './WeekGrid'
import { WeekHeader } from './WeekHeader'

function setupGrid() {
  const onToggle = vi.fn<(item: TodayItem, done: boolean, date: DateKey) => void>()
  const onAdd = vi.fn<(date: DateKey) => void>()
  render(
    <MemoryRouter>
      <WeekGrid columns={mockWeekColumns} onToggle={onToggle} onAdd={onAdd} dayHref={(d) => `/?day=${d}`} />
    </MemoryRouter>,
  )
  return { onToggle, onAdd }
}

describe('WeekGrid', () => {
  it('shows a card per day, Monday to Sunday, with the day linking to Today', () => {
    setupGrid()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(7)
    expect(links[0]).toHaveAccessibleName('Monday, 2 November, open in day view')
    expect(links[0]).toHaveAttribute('href', '/?day=2026-11-02')
    expect(screen.getByRole('link', { name: 'Wednesday, 4 November (today), open in day view' })).toBeInTheDocument()
  })

  it("lists each day's tasks and progress; empty days say so", () => {
    setupGrid()
    const monday = screen.getByRole('list', { name: 'Tasks on Monday, 2 November' })
    expect(within(monday).getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('progressbar', { name: 'Monday, 2 November: 3 of 3 done' })).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('Nothing planned')).toBeInTheDocument() // Saturday
  })

  it('ticks an item on its own day and adds a task to a chosen day', async () => {
    const user = userEvent.setup()
    const { onToggle, onAdd } = setupGrid()
    const tuesday = screen.getByRole('list', { name: 'Tasks on Tuesday, 3 November' })
    await user.click(within(tuesday).getByRole('checkbox', { name: /Send invoice/ }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 't2', kind: 'task' }), true, '2026-11-03')
    await user.click(screen.getByRole('button', { name: 'Add task on Thursday, 5 November' }))
    expect(onAdd).toHaveBeenCalledWith('2026-11-05')
  })
})

describe('WeekHeader', () => {
  it('moves between weeks and back to the day view', async () => {
    const user = userEvent.setup()
    const h = { onPrevWeek: vi.fn<() => void>(), onThisWeek: vi.fn<() => void>(), onNextWeek: vi.fn<() => void>(), onDayView: vi.fn<() => void>() }
    render(<WeekHeader title="Next week" range="9 – 15 Nov 2026" isThisWeek={false} {...h} />)
    expect(screen.getByRole('heading', { name: 'Next week' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    await user.click(screen.getByRole('button', { name: 'Next week, go back to this week' }))
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    await user.click(screen.getByRole('button', { name: 'Day view' }))
    expect(h.onPrevWeek).toHaveBeenCalledOnce()
    expect(h.onThisWeek).toHaveBeenCalledOnce()
    expect(h.onNextWeek).toHaveBeenCalledOnce()
    expect(h.onDayView).toHaveBeenCalledOnce()
  })
})
