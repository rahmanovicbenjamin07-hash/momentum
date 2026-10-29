import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { mockGoalStatuses, mockLessons, mockMonthReport } from '@/mocks/reports'
import { changeLine, formatDelta, formatKeyValue } from './format'
import { GoalStatuses } from './GoalStatuses'
import { Highlights } from './Highlights'
import { KeyNumbers } from './KeyNumbers'
import { Lessons } from './Lessons'
import { ReportPeriodToggle, type ReportKind } from './ReportPeriodToggle'
import { RoutineConsistency } from './RoutineConsistency'
import { ShareCard } from './ShareCard'

const report = mockMonthReport

describe('report format', () => {
  it('formats values and differences by unit', () => {
    expect(formatKeyValue(0.945, 'percent')).toBe('95%')
    expect(formatKeyValue(148, 'hours')).toBe('148 h')
    expect(formatDelta(-12, 'hours')).toBe('−12 h')
    expect(formatDelta(9, 'count')).toBe('+9')
    expect(formatDelta(0.056, 'percent')).toBe('+6 pts')
  })

  it('colours changes: up is green, small drops grey, bigger drops amber', () => {
    const byId = Object.fromEntries(report.keyNumbers.map((n) => [n.id, changeLine(n, 'September')]))
    expect(byId.tasks).toEqual({ text: '+9 vs September', tone: 'good' })
    expect(byId['metric-0']).toEqual({ text: '+13% vs September', tone: 'good' })
    expect(byId['metric-1']).toEqual({ text: '−2 vs September', tone: 'bad' })
    expect(byId['metric-2']).toEqual({ text: '−12 h vs September', tone: 'neutral' })
    expect(byId.replies).toEqual({ text: '+3 vs September · +2 meetings', tone: 'good' })
    expect(byId.deals).toEqual({ text: 'Café Rondo', tone: 'neutral' })
  })
})

describe('ReportPeriodToggle', () => {
  it('switches between the month and the year', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(v: ReportKind) => void>()
    render(<ReportPeriodToggle value="month" monthLabel="October 2026" yearLabel="2026 so far" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'October 2026' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '2026 so far' }))
    expect(onChange).toHaveBeenCalledWith('year')
  })
})

describe('ShareCard', () => {
  it('shows only numbers: routine %, tasks, streak, earned, outreach', () => {
    render(<ShareCard share={report.share} />)
    const card = screen.getByRole('group', { name: 'My October summary card' })
    expect(card).toHaveTextContent('My October')
    expect(card).toHaveTextContent('94%of my daily routine done')
    expect(within(card).getAllByRole('definition').map((d) => d.textContent)).toEqual(['128', '12 days', '€2,200', '96'])
    expect(card).not.toHaveTextContent('Café Rondo')
    expect(screen.getByText(/no names, contacts or private notes/)).toBeInTheDocument()
  })
})

describe('Highlights', () => {
  it('lists the highlights', () => {
    render(<Highlights highlights={report.highlights} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Best month yet for money earned: €2,200, up 13% on September.')).toBeInTheDocument()
  })
})

describe('KeyNumbers', () => {
  it('shows up to 8 numbers with their changes', () => {
    render(<KeyNumbers numbers={report.keyNumbers} previousLabel={report.previousLabel} />)
    const terms = screen.getAllByRole('term').map((t) => t.textContent)
    expect(terms).toHaveLength(8)
    expect(terms.slice(0, 4)).toEqual(['Tasks completed', 'Money earned', 'Trainings', 'Hours worked'])
    expect(screen.getByText('18 · 7')).toBeInTheDocument()
    expect(screen.getByText('1 · €1,500')).toBeInTheDocument()
    expect(screen.getByText('+13% vs September')).toHaveClass('text-good')
    expect(screen.getByText('−2 vs September')).toHaveClass('text-warn')
  })
})

describe('RoutineConsistency', () => {
  it('shows the overall rate and each item', () => {
    render(<RoutineConsistency routine={report.routine} />)
    expect(screen.getByText('94% overall')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Wake up at 06:00100% (20 of 20 days)')
    expect(items.at(-1)).toHaveTextContent('Read 20 pages89% (24 of 27 days)')
  })
})

describe('GoalStatuses and Lessons', () => {
  it('shows a placeholder until goals exist, then the statuses', () => {
    const { unmount } = render(
      <MemoryRouter>
        <GoalStatuses />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Goal statuses show up here/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Goals' })).toHaveAttribute('href', '/goals')
    unmount()
    render(
      <MemoryRouter>
        <GoalStatuses goals={mockGoalStatuses} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Earn €18,000 in 2026On track with open deals',
      '150 trainings this yearSlightly behind',
      'Work 1,650 hours this yearOn track',
      'Wake up at 06:00 on 200 daysAhead',
      'Earn €3,000 in a single monthAhead',
    ])
  })

  it('lists lessons with a link to all of them', () => {
    render(
      <MemoryRouter>
        <Lessons lessons={mockLessons} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'All lessons' })).toHaveAttribute('href', '/improve')
  })
})
