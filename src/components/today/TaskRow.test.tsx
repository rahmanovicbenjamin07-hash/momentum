import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockTodayItems } from '@/mocks/today'
import type { TodayItem, TodayItemStatus } from '@/schemas/today'
import { TaskRow } from './TaskRow'

function find(title: string): TodayItem {
  const item = mockTodayItems.find((i) => i.title === title)
  if (!item) throw new Error(`No mock item "${title}"`)
  return item
}

function renderRow(item: TodayItem) {
  const onStatus = vi.fn<(item: TodayItem, status: TodayItemStatus) => void>()
  const onEdit = vi.fn<(item: TodayItem) => void>()
  const onDelete = vi.fn<(item: TodayItem) => void>()
  render(
    <ul>
      <TaskRow item={item} onStatus={onStatus} onEdit={onEdit} onDelete={onDelete} />
    </ul>,
  )
  return { onStatus, onEdit, onDelete }
}

describe('TaskRow', () => {
  it('shows the title and time, without tag, priority or repeating icon', () => {
    renderRow(find('Prepare demo for Thursday call'))
    expect(screen.getByText('Prepare demo for Thursday call')).toBeInTheDocument()
    expect(screen.getByText('14:00')).toBeInTheDocument()
    expect(screen.queryByText('Work')).toBeNull()
    expect(screen.queryByText('High')).toBeNull()
  })

  it('shows a time range as 06:30–07:30', () => {
    renderRow(find('Morning workout'))
    expect(screen.getByText('06:30–07:30')).toBeInTheDocument()
  })

  it('shows "Anytime" for an item without a time', () => {
    renderRow(find('Send 10 outreach messages'))
    expect(screen.getByText('Anytime')).toBeInTheDocument()
    expect(screen.queryByText(/Repeating/)).toBeNull()
  })

  it('has always-visible ✓, ✗, Edit and Delete buttons', () => {
    renderRow(find('Review Q4 goals'))
    for (const name of ['Done', 'Not done', 'Edit task', 'Delete task']) {
      expect(screen.getByRole('button', { name, description: 'Review Q4 goals' })).toBeVisible()
    }
  })

  it('marks done and not done, and pressing the active one again re-opens it', async () => {
    const user = userEvent.setup()
    const open = find('Review Q4 goals')
    const { onStatus } = renderRow(open)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onStatus).toHaveBeenLastCalledWith(open, 'done')
    await user.click(screen.getByRole('button', { name: 'Not done' }))
    expect(onStatus).toHaveBeenLastCalledWith(open, 'missed')
  })

  it('strikes through a done item and un-ticks it', async () => {
    const user = userEvent.setup()
    const item = find('Wake up')
    const { onStatus } = renderRow(item)
    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Wake up')).toHaveClass('line-through')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onStatus).toHaveBeenLastCalledWith(item, 'open')
  })

  it('shows a not-done item crossed out in red', async () => {
    const user = userEvent.setup()
    const item = { ...find('Review Q4 goals'), missed: true }
    const { onStatus } = renderRow(item)
    expect(screen.getByRole('button', { name: 'Not done' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Review Q4 goals')).toHaveClass('line-through', 'text-bad')
    await user.click(screen.getByRole('button', { name: 'Not done' }))
    expect(onStatus).toHaveBeenLastCalledWith(item, 'open')
  })

  it('opens the task when its name is clicked, and previews the description', async () => {
    const user = userEvent.setup()
    const item = find('Prepare demo for Thursday call')
    const { onEdit } = renderRow(item)
    expect(screen.getByText(/Show the booking flow/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Prepare demo for Thursday call/ }))
    expect(onEdit).toHaveBeenCalledWith(item)
  })

  it('sends Edit and Delete', async () => {
    const user = userEvent.setup()
    const item = find('Send 10 outreach messages')
    const { onEdit, onDelete } = renderRow(item)
    await user.click(screen.getByRole('button', { name: 'Edit task' }))
    expect(onEdit).toHaveBeenCalledWith(item)
    await user.click(screen.getByRole('button', { name: 'Delete task' }))
    expect(onDelete).toHaveBeenCalledWith(item)
  })
})
