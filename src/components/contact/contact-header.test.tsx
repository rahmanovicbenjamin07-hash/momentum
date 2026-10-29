import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { mockContactDetail, mockLinkedTasks, mockTouches } from '@/mocks/outreach'
import type { Stage } from '@/schemas/outreach'
import { ContactBreadcrumb, ContactSummary } from './ContactSummary'
import { DetailsList } from './DetailsList'
import { LinkedTasks, type LinkedTask } from './LinkedTasks'
import { StageStepper } from './StageStepper'

const today = '2026-10-28'

describe('ContactSummary', () => {
  it('shows name, role line, stage, priority and tags, and calls the actions', async () => {
    const user = userEvent.setup()
    const onLogTouch = vi.fn<() => void>()
    const onUseTemplate = vi.fn<() => void>()
    const onAddTask = vi.fn<() => void>()
    const onMarkLost = vi.fn<() => void>()
    render(
      <MemoryRouter>
        <ContactBreadcrumb name="Emir Kovač" />
        <ContactSummary
          contact={mockContactDetail}
          onLogTouch={onLogTouch}
          onUseTemplate={onUseTemplate}
          onAddTask={onAddTask}
          onMarkLost={onMarkLost}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Outreach' })).toHaveAttribute('href', '/outreach')
    expect(screen.getByRole('heading', { level: 1, name: 'Emir Kovač' })).toBeInTheDocument()
    expect(screen.getByText('Founder · Bloom Studio · Sarajevo')).toBeInTheDocument()
    const chips = within(screen.getByRole('list', { name: 'Stage and tags' }))
    for (const text of ['Replied', 'High priority', 'Agency', 'Warm']) expect(chips.getByText(text)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log touch' }))
    await user.click(screen.getByRole('button', { name: 'Use template' }))
    await user.click(screen.getByRole('button', { name: 'Add task' }))
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Mark as lost' }))
    expect(onLogTouch).toHaveBeenCalledOnce()
    expect(onUseTemplate).toHaveBeenCalledOnce()
    expect(onAddTask).toHaveBeenCalledOnce()
    expect(onMarkLost).toHaveBeenCalledOnce()
  })
})

describe('StageStepper', () => {
  it('marks done steps and the current one, and moves on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(stage: Stage) => void>()
    render(<StageStepper stage="replied" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'New (done)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contacted (done)' })).toBeInTheDocument()
    const current = screen.getByRole('button', { name: 'Replied (current stage)' })
    expect(current).toHaveAttribute('aria-current', 'step')

    await user.click(current)
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Meeting booked' }))
    expect(onChange).toHaveBeenCalledWith('meeting')
  })

  it('explains a lost lead', () => {
    render(<StageStepper stage="lost" onChange={() => {}} />)
    expect(screen.getByText(/marked as lost/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { current: 'step' })).not.toBeInTheDocument()
  })
})

describe('DetailsList', () => {
  it('lists the filled-in details like the design', () => {
    render(<DetailsList contact={mockContactDetail} lastTouch={mockTouches[3]} today={today} />)
    const value = (label: string) => screen.getByText(label).nextElementSibling
    expect(screen.getByRole('link', { name: 'emir.kovac@example.com' })).toHaveAttribute('href', 'mailto:emir.kovac@example.com')
    expect(screen.getByRole('link', { name: '+387 61 000 000' })).toHaveAttribute('href', 'tel:+38761000000')
    expect(screen.getByRole('link', { name: 'bloom-studio.example' })).toBeInTheDocument()
    expect(value('Source')).toHaveTextContent('LinkedIn')
    expect(value('Deal value')).toHaveTextContent('€1,200')
    expect(value('Last touch')).toHaveTextContent('25 Oct · received')
    expect(screen.getByText('Today, 28 Oct')).toHaveClass('text-warn')
    expect(value('Added')).toHaveTextContent('14 Oct 2026')
    expect(screen.queryByText('Budget')).not.toBeInTheDocument()
  })
})

describe('LinkedTasks', () => {
  it('shows due labels, open tasks first, and ticks', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn<(task: LinkedTask, done: boolean) => void>()
    render(<LinkedTasks tasks={[...mockLinkedTasks].reverse()} today={today} onToggle={onToggle} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Follow up with Emir KovačToday 10:30')
    expect(items[1]).toHaveTextContent('Done')
    await user.click(screen.getByRole('checkbox', { name: 'Follow up with Emir Kovač' }))
    expect(onToggle).toHaveBeenCalledWith(mockLinkedTasks[0], true)
  })

  it('says when there are none', () => {
    render(<LinkedTasks tasks={[]} today={today} />)
    expect(screen.getByText('No tasks for this lead.')).toBeInTheDocument()
  })
})
