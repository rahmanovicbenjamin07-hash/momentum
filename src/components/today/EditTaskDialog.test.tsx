import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockTodayItems } from '@/mocks/today'
import type { TodayItem } from '@/schemas/today'
import { EditTaskDialog, type EditTaskResult } from './EditTaskDialog'

const DAY = '2026-11-04'

function find(title: string): TodayItem {
  const item = mockTodayItems.find((i) => i.title === title)
  if (!item) throw new Error(`No mock item "${title}"`)
  return item
}

function setup(item: TodayItem) {
  const onSubmit = vi.fn<(result: EditTaskResult) => Promise<void>>().mockResolvedValue()
  render(<EditTaskDialog item={item} date={DAY} onOpenChange={vi.fn<(open: boolean) => void>()} onSubmit={onSubmit} />)
  return onSubmit
}

describe('EditTaskDialog', () => {
  it('shows status, tag, priority, name and description of a one-off task', () => {
    setup(find('Prepare demo for Thursday call'))
    const info = within(screen.getByRole('list', { name: 'Details' }))
    expect(info.getByText('Open')).toBeInTheDocument()
    expect(info.getByText('#Work')).toBeInTheDocument()
    expect(info.getByText('High priority')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Prepare demo for Thursday call')
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Show the booking flow and the new dashboard. Keep it under 15 minutes.',
    )
    expect(screen.getByLabelText('Day')).toHaveValue(DAY)
    expect(screen.getByLabelText('From')).toHaveValue('14:00')
  })

  it('saves a new description, day and time', async () => {
    const user = userEvent.setup()
    const item = find('Review Q4 goals')
    const onSubmit = setup(item)
    await user.type(screen.getByRole('textbox', { name: 'Description' }), '  Check the three numbers  ')
    await user.type(screen.getByLabelText('From'), '09:30')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'task',
      id: item.id,
      title: 'Review Q4 goals',
      notes: 'Check the three numbers',
      time: '09:30',
      dueDate: DAY,
    })
  })

  it('adds an end time to make a range, and Anytime clears both', async () => {
    const user = userEvent.setup()
    const item = find('Prepare demo for Thursday call')
    const onSubmit = setup(item)
    await user.type(screen.getByLabelText('Until (optional)'), '1530')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ time: '14:00', endTime: '15:30' }))

    await user.click(screen.getByRole('button', { name: 'Anytime' }))
    expect(screen.getByLabelText('From')).toHaveValue('')
    expect(screen.getByLabelText('Until (optional)')).toHaveValue('')
  })

  it('leaves the description out when it did not change', async () => {
    const user = userEvent.setup()
    const onSubmit = setup(find('Prepare demo for Thursday call'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('notes')
    expect(onSubmit.mock.calls[0]?.[0]).not.toHaveProperty('endTime')
  })

  it('shows a repeating task with its days, and needs at least one day', async () => {
    const user = userEvent.setup()
    const item = find('Wake up')
    const onSubmit = setup(item)
    expect(screen.getByRole('heading', { name: 'Repeating task' })).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Repeats · Mon–Fri')).toBeInTheDocument()
    expect(screen.queryByLabelText('Day')).toBeNull()

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      await user.click(screen.getByRole('button', { name: day }))
    }
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Pick at least one day')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
