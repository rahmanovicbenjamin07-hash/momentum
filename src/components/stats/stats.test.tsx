import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import {
  MOCK_STATS_TODAY,
  mockCompletion,
  mockCompletionWithGaps,
  mockConsistency,
  mockFunnel,
  mockKpis,
  mockReplyRates,
} from '@/mocks/stats'
import { heatLevel } from './chartTheme'
import { CompletionLineChart } from './CompletionLineChart'
import { ConsistencyHeatmap } from './ConsistencyHeatmap'
import { FunnelBars } from './FunnelBars'
import { KpiCard } from './KpiCard'
import type { StatsRange } from './meta'
import { RangeToggle } from './RangeToggle'
import { ReplyRateBars } from './ReplyRateBars'
import { StatsTabs } from './StatsTabs'

describe('StatsTabs', () => {
  it('renders the four tabs as links that keep the range, and marks the current one', () => {
    render(
      <MemoryRouter initialEntries={['/stats/metrics?range=30']}>
        <StatsTabs search="?range=30" />
      </MemoryRouter>,
    )
    const nav = within(screen.getByRole('navigation', { name: 'Stats sections' }))
    expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(['Overview', 'My metrics', 'Routine progress', 'Reports'])
    expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/stats/overview?range=30')
    expect(nav.getByRole('link', { name: 'My metrics' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('RangeToggle', () => {
  it('shows the chosen range pressed and reports clicks', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(v: StatsRange) => void>()
    render(<RangeToggle value={30} onChange={onChange} />)
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: '90 days' }))
    expect(onChange).toHaveBeenCalledWith(90)
  })
})

describe('KpiCard', () => {
  it('colours the change by whether it is good, and shows notes in grey', () => {
    render(
      <>
        <KpiCard {...mockKpis[0]!} />
        <KpiCard label="Missed days" value="3" change={{ text: '+2', direction: 'up', upIsGood: false }} />
        <KpiCard {...mockKpis[2]!} />
      </>,
    )
    const completion = within(screen.getByRole('region', { name: 'Task completion' }))
    expect(completion.getByText('75%')).toBeInTheDocument()
    expect(completion.getByText('+6 pts').closest('p')).toHaveClass('text-good')
    expect(completion.getByText('+6 pts').closest('p')).toHaveTextContent('Up: +6 pts')
    expect(within(screen.getByRole('region', { name: 'Missed days' })).getByText('+2').closest('p')).toHaveClass('text-bad')
    expect(screen.getByText('Best 21 days')).toHaveClass('text-ink-2')
  })
})

describe('CompletionLineChart', () => {
  it('has a legend, a data table and keyboard reading', async () => {
    const user = userEvent.setup()
    render(<CompletionLineChart points={mockCompletion} />)
    const legend = within(screen.getByRole('list', { name: 'Legend' }))
    expect(legend.getByText('7-day average')).toBeInTheDocument()
    expect(legend.getByText('Daily')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Task completion per day' })
    expect(within(table).getAllByRole('row')).toHaveLength(31)
    expect(within(table).getByRole('row', { name: /Wed, 28 Oct/ })).toHaveTextContent('90%82%')

    const slider = screen.getByRole('slider', { name: 'Task completion per day, choose a day' })
    await user.tab()
    expect(slider).toHaveFocus()
    expect(slider).toHaveAttribute('aria-valuetext', 'Wed, 28 Oct: daily 90%, 7-day average 82%')
    await user.keyboard('{ArrowLeft}')
    expect(slider).toHaveAttribute('aria-valuetext', 'Tue, 27 Oct: daily 86%, 7-day average 79%')
    await user.keyboard('{Home}')
    expect(slider).toHaveAttribute('aria-valuenow', '1')
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^Tue, 29 Sep: daily 62%/)
  })

  it('says "nothing planned" on empty days and has an empty state', () => {
    const { unmount } = render(<CompletionLineChart points={mockCompletionWithGaps} />)
    expect(screen.getByRole('row', { name: /Sun, 4 Oct/ })).toHaveTextContent('nothing planned')
    unmount()
    render(<CompletionLineChart points={[]} />)
    expect(screen.getByText('No tasks in this period yet.')).toBeInTheDocument()
  })
})

describe('ConsistencyHeatmap', () => {
  it('draws 12 weeks up to today with a label on every square, and a legend', () => {
    render(<ConsistencyHeatmap days={mockConsistency} today={MOCK_STATS_TODAY} insight="Tuesdays are best." />)
    const grid = within(screen.getByRole('group', { name: /last 12 weeks, Monday to Sunday/ }))
    // 11 full weeks + Mon–Wed of this week.
    expect(grid.getAllByRole('img')).toHaveLength(80)
    expect(grid.getByRole('img', { name: 'Mon, 10 Aug: 65% done' })).toBeInTheDocument()
    expect(grid.getByRole('img', { name: 'Wed, 28 Oct: 65% done' })).toHaveClass('ring-2')
    expect(screen.getByText('Less')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
    expect(screen.getByText('Tuesdays are best.')).toBeInTheDocument()
  })

  it('buckets rates into five steps', () => {
    expect([null, 0, 0.3, 0.6, 0.9, 1].map(heatLevel)).toEqual([0, 0, 1, 2, 3, 4])
  })
})

describe('FunnelBars', () => {
  it('lists every step with its count and share of the previous one', () => {
    render(<FunnelBars steps={mockFunnel} caption="Last 30 days" />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      'Contacted96Start',
      'Replied1819% of previous',
      'Meeting739% of previous',
      'Proposal457% of previous',
      'Won250% of previous',
    ])
  })
})

describe('ReplyRateBars', () => {
  it('sorts by rate, fades channels with too few sends and explains why', () => {
    render(<ReplyRateBars rows={[...mockReplyRates].reverse()} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => within(li).getAllByText(/./)[0]!.textContent)).toEqual(['Phone', 'LinkedIn', 'Instagram', 'Email'])
    expect(items[0]).toHaveTextContent('5 sent (too few to trust yet)40.0%')
    expect(items[3]).toHaveTextContent('48 sent12.5%')
    expect(items[3]).not.toHaveTextContent('too few')
    expect(screen.getByText(/Faded bars have fewer than 30 sends/)).toBeInTheDocument()
  })
})
