import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { QuickAddResult } from '@/lib/quickAddSubmit'
import { QuickAddBar } from './QuickAddBar'

function setup(onSubmit = vi.fn<(r: QuickAddResult) => void | Promise<void>>()) {
  render(<QuickAddBar onSubmit={onSubmit} />)
  return {
    onSubmit,
    text: screen.getByRole('textbox', { name: 'Task' }),
    time: screen.getByLabelText('Time (optional)'),
    repeat: screen.getByRole('combobox', { name: 'Repeat' }),
  }
}

describe('QuickAddBar', () => {
  it('submits a one-off task on Enter, then clears and keeps focus', async () => {
    const user = userEvent.setup()
    const { onSubmit, text } = setup()
    await user.type(text, 'Call Amir about the website #outreach !high{Enter}')
    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'task',
      title: 'Call Amir about the website',
      time: null,
      tag: 'outreach',
      priority: 'high',
    })
    expect(text).toHaveValue('')
    expect(text).toHaveFocus()
  })

  it('uses the time field and Repeat to make a routine item', async () => {
    const user = userEvent.setup()
    const { onSubmit, text, time, repeat } = setup()
    await user.type(text, 'Read 20 pages')
    await user.type(time, '21:30')
    await user.selectOptions(repeat, 'Every day')
    await user.click(screen.getByRole('button', { name: 'Add task' }))
    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'routine',
      title: 'Read 20 pages',
      time: '21:30',
      days: [true, true, true, true, true, true, true],
    })
    expect(repeat).toHaveValue('just_today')
  })

  it('shows an error for empty text and does not submit', async () => {
    const user = userEvent.setup()
    const { onSubmit, text } = setup()
    await user.type(text, '   {Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Type a task')
    expect(text).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('asks for words when the text is only shortcuts', async () => {
    const user = userEvent.setup()
    const { onSubmit, text } = setup()
    await user.type(text, '#work !high{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a few words besides')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the text and shows the message when saving fails', async () => {
    const user = userEvent.setup()
    const { text } = setup(vi.fn<(r: QuickAddResult) => Promise<void>>().mockRejectedValue(new Error('Offline')))
    await user.type(text, 'Prepare demo{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline')
    expect(text).toHaveValue('Prepare demo')
  })
})
