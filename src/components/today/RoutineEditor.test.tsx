import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockRoutineItems } from '@/mocks/today'
import { RoutineEditor } from './RoutineEditor'

function setup(items = mockRoutineItems, withDone = false) {
  const handlers = {
    onChangeDays: vi.fn<(id: string, days: boolean[]) => void>(),
    onChangeTime: vi.fn<(id: string, time: string | null) => void>(),
    onRemove: vi.fn<(id: string) => void>(),
    onDone: withDone ? vi.fn<() => void>() : undefined,
  }
  render(<RoutineEditor items={items} {...handlers} />)
  return handlers
}

const wakeUp = mockRoutineItems[0]!

describe('RoutineEditor', () => {
  it('shows every routine item with its days pressed', () => {
    setup()
    expect(screen.getAllByRole('listitem')).toHaveLength(7)
    const days = within(screen.getByRole('group', { name: 'Days for Wake up' }))
    expect(days.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true')
    expect(days.getByRole('button', { name: 'Saturday' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('toggles a day', async () => {
    const user = userEvent.setup()
    const h = setup()
    const days = within(screen.getByRole('group', { name: 'Days for Wake up' }))
    await user.click(days.getByRole('button', { name: 'Saturday' }))
    expect(h.onChangeDays).toHaveBeenCalledWith(wakeUp.id, [true, true, true, true, true, true, false])
  })

  it('shows the time as HH:MM and saves a change on blur', async () => {
    const user = userEvent.setup()
    const h = setup()
    const time = screen.getByLabelText('Time for Wake up')
    expect(time).toHaveValue('06:00')
    await user.clear(time)
    await user.type(time, '07:15')
    expect(h.onChangeTime).not.toHaveBeenCalled()
    await user.tab()
    expect(h.onChangeTime).toHaveBeenCalledWith(wakeUp.id, '07:15')
  })

  it('does not save when the time did not change', async () => {
    const user = userEvent.setup()
    const h = setup()
    await user.click(screen.getByLabelText('Time for Wake up'))
    await user.tab()
    expect(h.onChangeTime).not.toHaveBeenCalled()
  })

  it('clears the time, and only items with a time have a clear button', async () => {
    const user = userEvent.setup()
    const h = setup()
    expect(screen.queryByRole('button', { name: 'Clear time for Send 10 outreach messages' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Clear time for Wake up' }))
    expect(h.onChangeTime).toHaveBeenCalledWith(wakeUp.id, null)
  })

  it('removes an item', async () => {
    const user = userEvent.setup()
    const h = setup()
    await user.click(screen.getByRole('button', { name: 'Remove Wake up' }))
    expect(h.onRemove).toHaveBeenCalledWith(wakeUp.id)
  })

  it('shows Done only when onDone is given', async () => {
    const user = userEvent.setup()
    const h = setup(mockRoutineItems, true)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(h.onDone).toHaveBeenCalledOnce()
  })

  it('has an empty state', () => {
    setup([])
    expect(screen.getByText('No repeating tasks yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
  })
})
