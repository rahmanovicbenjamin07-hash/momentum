import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FollowUpText } from './FollowUpText'
import { LEAD_SOURCES, LEAD_STAGES, SOURCE_META, STAGE_META } from './meta'
import { SourceChip } from './SourceChip'
import { StagePill } from './StagePill'

const today = '2026-10-28'

describe('FollowUpText', () => {
  it('shows "Today" in amber', () => {
    render(<FollowUpText date={today} today={today} />)
    expect(screen.getByText('Today')).toHaveClass('text-warn')
  })

  it('shows days late in red', () => {
    const { rerender } = render(<FollowUpText date="2026-10-27" today={today} />)
    expect(screen.getByText('1 day late')).toHaveClass('text-bad')
    rerender(<FollowUpText date="2026-10-26" today={today} />)
    expect(screen.getByText('2 days late')).toHaveClass('text-bad')
  })

  it('shows a short date when later', () => {
    render(<FollowUpText date="2026-10-30" today={today} />)
    expect(screen.getByText('Fri, 30 Oct')).toBeInTheDocument()
  })

  it('shows a dash with a screen-reader label when there is none', () => {
    render(<FollowUpText date={null} today={today} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('No follow-up')).toBeInTheDocument()
  })
})

describe('SourceChip and StagePill', () => {
  it('label every source', () => {
    for (const source of LEAD_SOURCES) {
      const { unmount } = render(<SourceChip source={source} />)
      expect(screen.getByText(SOURCE_META[source].label)).toBeInTheDocument()
      unmount()
    }
  })

  it('label every stage', () => {
    for (const stage of LEAD_STAGES) {
      const { unmount } = render(<StagePill stage={stage} />)
      expect(screen.getByText(STAGE_META[stage].label)).toBeInTheDocument()
      unmount()
    }
    render(<StagePill stage="meeting" />)
    expect(screen.getByText('Meeting booked')).toBeInTheDocument()
  })
})
