import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockTodayItems } from '@/mocks/today'
import type { TodayItem } from '@/schemas/today'
import { TaskRow } from './TaskRow'

function find(title: string): TodayItem {
  const item = mockTodayItems.find((i) => i.title === title)
  if (!item) throw new Error(`No mock item "${title}"`)
  return item
}

function renderRow(item: TodayItem) {
  const onToggle = vi.fn<(item: TodayItem, done: boolean) => void>()
  render(
    <ul>
      <TaskRow item={item} onToggle={onToggle} />
    </ul>,
  )
  return onToggle
}

describe('TaskRow', () => {
  it('shows a one-off task with tag, priority and time', () => {
    renderRow(find('Prepare demo for Thursday call'))
    expect(screen.getByRole('checkbox', { name: 'Prepare demo for Thursday call' })).not.toBeChecked()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('14:00')).toBeInTheDocument()
  })

  it('shows the repeating chip and "Anytime" for a routine item without time', () => {
    renderRow(find('Send 10 outreach messages'))
    expect(screen.getByText('Repeating · Mon–Fri')).toBeInTheDocument()
    expect(screen.getByText('Anytime')).toBeInTheDocument()
  })

  it('strikes through a done item', () => {
    renderRow(find('Wake up'))
    expect(screen.getByRole('checkbox', { name: 'Wake up' })).toBeChecked()
    expect(screen.getByText('Wake up')).toHaveClass('line-through')
  })

  it('reports the new state when ticked, also by clicking the title', async () => {
    const user = userEvent.setup()
    const item = find('Review Q4 goals')
    const onToggle = renderRow(item)
    await user.click(screen.getByText('Review Q4 goals'))
    expect(onToggle).toHaveBeenCalledWith(item, true)
  })
})
