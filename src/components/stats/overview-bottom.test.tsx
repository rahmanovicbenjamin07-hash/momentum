import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockInsights, mockRevenue, mockTagCounts, mockTemplateStats } from '@/mocks/stats'
import { InsightsCard } from './InsightsCard'
import { RevenueCard } from './RevenueCard'
import { TagBars } from './TagBars'
import { TemplatesTable } from './TemplatesTable'

describe('InsightsCard', () => {
  it('lists each insight with its numbers, or says there is not enough data', () => {
    const { unmount } = render(<InsightsCard insights={mockInsights} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0]).toHaveTextContent('On days you wake up at 06:00 you finish 31% more tasks.')
    expect(items[0]).toHaveTextContent('based on 213 days')
    unmount()
    render(<InsightsCard insights={[]} />)
    expect(screen.getByText(/Not enough data yet/)).toBeInTheDocument()
  })
})

describe('RevenueCard', () => {
  it('shows the total, bars by channel and chips by template', () => {
    render(<RevenueCard {...mockRevenue} />)
    expect(screen.getByText('€6,300')).toBeInTheDocument()
    expect(screen.getByText('from 3 won deals · about €8.50 per message sent')).toBeInTheDocument()
    const lists = screen.getAllByRole('list')
    expect(within(lists[0]!).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Phone€3,000',
      'LinkedIn€1,800',
      'Email€1,500',
      'Instagram€0',
    ])
    expect(within(lists[1]!).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Opener A · €3,300 · 2 deals',
      'Phone script · €3,000 · 1 deal',
      'Opener B · €0',
    ])
  })
})

describe('TemplatesTable', () => {
  it('sorts trusted templates by rate, marks the best and the ones with too few sends', async () => {
    const user = userEvent.setup()
    const onManage = vi.fn<() => void>()
    render(<TemplatesTable templates={mockTemplateStats} onManage={onManage} />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual([
      'Opener ABest',
      'Follow-up #1',
      'Opener B',
      'Phone scriptToo few sends',
    ])
    expect(rows[0]).toHaveTextContent('41922.0%')
    expect(rows[3]).toHaveTextContent('5240.0%')
    await user.click(screen.getByRole('button', { name: 'Manage' }))
    expect(onManage).toHaveBeenCalledOnce()
  })
})

describe('TagBars', () => {
  it('shows tags most first with the total', () => {
    render(<TagBars tags={[...mockTagCounts].reverse()} />)
    expect(screen.getByText('142 tasks')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Outreach46',
      'Work41',
      'Marketing22',
      'Health19',
      'Personal14',
    ])
  })
})
