import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockContacts } from '@/mocks/outreach'
import { PipelineBoard } from './PipelineBoard'

const today = '2026-10-28'

function renderBoard(onMove = vi.fn<(id: string, stage: string) => void>()) {
  render(
    <MemoryRouter>
      <PipelineBoard contacts={mockContacts} today={today} onMove={onMove} />
    </MemoryRouter>,
  )
  return onMove
}

const column = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name},`) })

describe('PipelineBoard', () => {
  it('shows a column per stage with counts and the right cards', () => {
    renderBoard()
    expect(column('New')).toHaveAccessibleName('New, 1')
    expect(column('Meeting booked')).toHaveAccessibleName('Meeting booked, 2')
    expect(column('Lost')).toHaveAccessibleName('Lost, 0')
    expect(within(column('Lost')).getByText('Drop a lead here')).toBeInTheDocument()

    const meeting = within(column('Meeting booked'))
    expect(meeting.getByRole('link', { name: 'Sara Begić' })).toHaveAttribute('href', `/outreach/${mockContacts[3]!.id}`)
    expect(meeting.getByText('Next: Today')).toHaveClass('text-warn')
    expect(meeting.getByRole('button', { name: 'Move Sara Begić' })).toBeInTheDocument()

    expect(within(column('Won')).getByText('Closed')).toBeInTheDocument()
    expect(within(column('Proposal')).getByText('Next: 1 day late')).toHaveClass('text-bad')
  })

  describe('keyboard dragging', () => {
    const original = Element.prototype.getBoundingClientRect

    beforeEach(() => {
      Element.prototype.scrollIntoView = vi.fn<() => void>()
      // jsdom has no layout: give each column a 200px slot and cards a box inside their column.
      Element.prototype.getBoundingClientRect = function (this: Element) {
        const section = this.closest('[data-board-column]')
        if (!section) {
          // The floating copy while dragging starts where the dragged card is.
          const isOverlay = this.matches('[data-board-card]') || (this.querySelector('[data-board-card]') && !this.querySelector('[data-board-column]'))
          const dragged = document.querySelector('[data-dragging="true"]')
          return isOverlay && dragged ? dragged.getBoundingClientRect() : original.call(this)
        }
        const index = [...document.querySelectorAll('[data-board-column]')].indexOf(section)
        const isColumn = section === this
        const left = index * 210 + (isColumn ? 0 : 8)
        const top = isColumn ? 0 : 40
        const width = isColumn ? 200 : 184
        const height = isColumn ? 600 : 100
        return DOMRect.fromRect({ x: left, y: top, width, height })
      }
    })

    afterEach(() => {
      Element.prototype.getBoundingClientRect = original
    })

    const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)))

    it('moves a lead one stage right with Space, → and Space', async () => {
      const onMove = renderBoard()
      const handle = screen.getByRole('button', { name: 'Move Daniel Weber' })
      handle.focus()

      fireEvent.keyDown(handle, { code: 'Space', key: ' ' })
      await tick()
      fireEvent.keyDown(handle, { code: 'ArrowRight', key: 'ArrowRight' })
      await tick()
      fireEvent.keyDown(handle, { code: 'Space', key: ' ' })
      await tick()

      expect(onMove).toHaveBeenCalledWith(mockContacts[7]!.id, 'contacted')
    })

    it('does nothing when cancelled with Escape', async () => {
      const onMove = renderBoard()
      const handle = screen.getByRole('button', { name: 'Move Daniel Weber' })
      handle.focus()

      fireEvent.keyDown(handle, { code: 'Space', key: ' ' })
      await tick()
      fireEvent.keyDown(handle, { code: 'ArrowRight', key: 'ArrowRight' })
      await tick()
      fireEvent.keyDown(handle, { code: 'Escape', key: 'Escape' })
      await tick()

      expect(onMove).not.toHaveBeenCalled()
    })
  })
})
