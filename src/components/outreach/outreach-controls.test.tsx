import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mockSourceCounts, mockStageCounts } from '@/mocks/outreach'
import type { SourceFilterValue, StageFilterValue } from './meta'
import { OutreachHeader, type OutreachView } from './OutreachHeader'
import { OutreachToolbar } from './OutreachToolbar'
import { SourceFilter } from './SourceFilter'
import { StageCounts } from './StageCounts'

describe('OutreachHeader', () => {
  function setup(overrides: Partial<{ leadCount: number; followUpsDue: number }> = {}) {
    const handlers = {
      onViewChange: vi.fn<(view: OutreachView) => void>(),
      onTemplates: vi.fn<() => void>(),
      onImportCsv: vi.fn<() => void>(),
      onAddLead: vi.fn<() => void>(),
    }
    render(
      <OutreachHeader
        leadCount={overrides.leadCount ?? 38}
        followUpsDue={overrides.followUpsDue ?? 4}
        openPipeline={18400}
        view="table"
        {...handlers}
      />,
    )
    return handlers
  }

  it('shows the summary line and title', () => {
    setup()
    expect(screen.getByText('38 leads · 4 follow-ups due · €18,400 open pipeline')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Outreach' })).toBeInTheDocument()
  })

  it('uses singular words for one', () => {
    setup({ leadCount: 1, followUpsDue: 1 })
    expect(screen.getByText(/^1 lead · 1 follow-up due/)).toBeInTheDocument()
  })

  it('marks the current view and calls the handlers', async () => {
    const user = userEvent.setup()
    const h = setup()
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Board' }))
    await user.click(screen.getByRole('button', { name: 'Templates' }))
    await user.click(screen.getByRole('button', { name: 'Import CSV' }))
    await user.click(screen.getByRole('button', { name: 'Add lead' }))
    expect(h.onViewChange).toHaveBeenCalledWith('board')
    expect(h.onTemplates).toHaveBeenCalledOnce()
    expect(h.onImportCsv).toHaveBeenCalledOnce()
    expect(h.onAddLead).toHaveBeenCalledOnce()
  })
})

describe('SourceFilter', () => {
  it('shows counts with a total, hides "Other" when empty, and reports clicks', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(v: SourceFilterValue) => void>()
    render(<SourceFilter counts={mockSourceCounts} value="all" onChange={onChange} />)
    const group = screen.getByRole('group', { name: 'Filter by source' })
    expect(within(group).getAllByRole('button')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'All sources, 38' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Google Maps, 14' }))
    expect(onChange).toHaveBeenCalledWith('maps')
  })

  it('shows "Other" when it has leads', () => {
    render(<SourceFilter counts={{ ...mockSourceCounts, other: 2 }} value="all" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Other, 2' })).toBeInTheDocument()
  })
})

describe('StageCounts', () => {
  it('shows a total, marks the active stage and reports clicks', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(v: StageFilterValue) => void>()
    render(<StageCounts counts={mockStageCounts} value="replied" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'All stages, 38' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Replied, 6' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Meeting booked, 4' }))
    expect(onChange).toHaveBeenCalledWith('meeting')
  })
})

describe('OutreachToolbar', () => {
  it('reports search typing and the follow-up checkbox', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn<(v: string) => void>()
    const onFollowUpDueChange = vi.fn<(v: boolean) => void>()
    render(
      <OutreachToolbar
        search=""
        onSearchChange={onSearchChange}
        followUpDue={false}
        onFollowUpDueChange={onFollowUpDueChange}
      />,
    )
    await user.type(screen.getByRole('searchbox', { name: 'Search leads' }), 'a')
    expect(onSearchChange).toHaveBeenCalledWith('a')
    await user.click(screen.getByRole('checkbox', { name: 'Follow-up due' }))
    expect(onFollowUpDueChange).toHaveBeenCalledWith(true)
  })
})
