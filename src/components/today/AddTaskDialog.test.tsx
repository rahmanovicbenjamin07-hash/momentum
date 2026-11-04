import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuickAddResult } from '@/lib/quickAddSubmit'
import { AddTaskDialog } from './AddTaskDialog'

// Wednesday.
const TODAY = '2026-10-28'

// The Day field starts on Tomorrow from 1 PM, so pin the clock: 09:00 in Sarajevo (UTC+1). Only Date is faked.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-28T08:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

function setup(onSubmit = vi.fn<(r: QuickAddResult) => void | Promise<void>>(), viewedDay?: string) {
  render(<AddTaskDialog open onOpenChange={() => {}} onSubmit={onSubmit} today={TODAY} viewedDay={viewedDay} />)
  return {
    onSubmit,
    name: screen.getByRole('textbox', { name: 'Task name' }),
    day: screen.getByRole('combobox', { name: 'Day' }),
    time: screen.getByLabelText('From'),
    endTime: screen.getByLabelText('Until'),
    submit: screen.getByRole('button', { name: 'Add task' }),
  }
}

describe('AddTaskDialog', () => {
  it('shows the three steps in order, with the name focused', () => {
    const { name } = setup()
    expect(name).toHaveFocus()
    expect(screen.getByRole('group', { name: 'Day and time (optional)' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Repeat' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Doesn’t repeat' })).toBeChecked()
  })

  it('needs a name', async () => {
    const user = userEvent.setup()
    const { onSubmit, submit } = setup()
    await user.click(submit)
    expect(screen.getByText('Type a task')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('adds a one-off task for today, reading #tag and !high', async () => {
    const user = userEvent.setup()
    const { onSubmit, name, submit } = setup()
    await user.type(name, 'Call Amir #outreach !high')
    await user.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({ kind: 'task', title: 'Call Amir', time: null, endTime: null, tag: 'outreach', priority: 'high', dueDate: TODAY })
  })

  it('plans a task for tomorrow at a time', async () => {
    const user = userEvent.setup()
    const { onSubmit, name, day, time, submit } = setup()
    await user.type(name, 'Send invoice')
    await user.selectOptions(day, 'Tomorrow')
    await user.type(time, '09:30')
    await user.click(submit)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'task', dueDate: '2026-10-29', time: '09:30' }))
  })

  it('adds a task with a time range, typed the quick 24-hour way', async () => {
    const user = userEvent.setup()
    const { onSubmit, name, time, endTime, submit } = setup()
    await user.type(name, 'Classes')
    await user.type(time, '8')
    await user.type(endTime, '11')
    await user.click(submit)
    expect(time).toHaveValue('08:00')
    expect(endTime).toHaveValue('11:00')
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Classes', time: '08:00', endTime: '11:00' }))
  })

  it('refuses an end time without a start, or before it', async () => {
    const user = userEvent.setup()
    const { onSubmit, name, time, endTime, submit } = setup()
    await user.type(name, 'Classes')
    await user.type(endTime, '11:00')
    await user.click(submit)
    expect(await screen.findByText('Set a start time first')).toBeInTheDocument()
    await user.type(time, '12:00')
    await user.click(submit)
    expect(await screen.findByText('End time must be after the start time')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('starts on Tomorrow from 1 PM when looking at today', () => {
    vi.setSystemTime(new Date('2026-10-28T12:30:00Z')) // 13:30 in Sarajevo
    const { day } = setup()
    expect(day).toHaveValue('tomorrow')
  })

  it('every day: Day is switched off; every week: repeats on the chosen weekday', async () => {
    const user = userEvent.setup()
    const { onSubmit, name, day, submit } = setup()
    await user.type(name, 'Stretch')
    await user.click(screen.getByRole('radio', { name: 'Every day' }))
    expect(day).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Every week' }))
    expect(day).toBeEnabled()
    await user.selectOptions(day, 'Tomorrow')
    expect(screen.getByText('Shows on Today every Thursday.')).toBeInTheDocument()
    await user.click(submit)
    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'routine',
      title: 'Stretch',
      time: null,
      endTime: null,
      days: [false, false, false, true, false, false, false],
    })
  })

  it('starts on the day on screen and shows a save error', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(r: QuickAddResult) => Promise<void>>().mockRejectedValue(new Error('Couldn’t save it.'))
    const { name, submit } = setup(onSubmit, '2026-11-05')
    expect(screen.getByLabelText('Task date')).toHaveValue('2026-11-05')
    await user.type(name, 'Dentist')
    await user.click(submit)
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t save it.')
  })
})
