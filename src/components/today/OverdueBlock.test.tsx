import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MOCK_TODAY, mockOverdueTasks } from '@/mocks/today'
import type { Task } from '@/schemas/today'
import { OverdueBlock } from './OverdueBlock'

const older: Task = { ...mockOverdueTasks[0]!, id: '00000000-0000-4000-8000-000000000999', title: 'Old invoice', due_date: '2026-10-20', tag: null }

function setup(tasks: Task[]) {
  const onMoveToToday = vi.fn<(t: Task) => void>()
  const onDrop = vi.fn<(t: Task) => void>()
  const view = render(<OverdueBlock tasks={tasks} today={MOCK_TODAY} onMoveToToday={onMoveToToday} onDrop={onDrop} />)
  return { onMoveToToday, onDrop, ...view }
}

describe('OverdueBlock', () => {
  it('shows the count, title and how late each task is', () => {
    setup([...mockOverdueTasks, older])
    expect(screen.getByRole('heading', { name: 'Overdue · 2' })).toBeInTheDocument()
    expect(screen.getByText('Send proposal to Lejla Hodžić')).toBeInTheDocument()
    expect(screen.getByText('Due yesterday · Outreach')).toBeInTheDocument()
    expect(screen.getByText('Due 20 Oct 2026')).toBeInTheDocument()
  })

  it('moves or drops the right task (buttons are described by the task title)', async () => {
    const user = userEvent.setup()
    const { onMoveToToday, onDrop } = setup([...mockOverdueTasks, older])
    const rows = screen.getAllByRole('listitem')
    const move = within(rows[0]!).getByRole('button', { name: 'Move to today' })
    expect(move).toHaveAccessibleDescription('Send proposal to Lejla Hodžić')
    await user.click(move)
    expect(onMoveToToday).toHaveBeenCalledWith(mockOverdueTasks[0])
    await user.click(within(rows[1]!).getByRole('button', { name: 'Drop' }))
    expect(onDrop).toHaveBeenCalledWith(older)
  })

  it('renders nothing when there is nothing overdue', () => {
    const { container } = setup([])
    expect(container).toBeEmptyDOMElement()
  })
})
