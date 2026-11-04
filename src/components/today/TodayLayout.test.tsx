import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TodayLayout } from './TodayLayout'

describe('TodayLayout', () => {
  it('renders every slot, with the aside as its own landmark', () => {
    render(<TodayLayout main={<div>Main</div>} aside={<div>Aside</div>} />)
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Progress, week and notes' })).toHaveTextContent('Aside')
  })

  it('leaves out an empty aside', () => {
    render(<TodayLayout main={<div>Main</div>} />)
    expect(screen.queryByRole('complementary')).toBeNull()
  })
})
