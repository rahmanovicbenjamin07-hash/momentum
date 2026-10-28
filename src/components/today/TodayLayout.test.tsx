import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TodayLayout } from './TodayLayout'

describe('TodayLayout', () => {
  it('renders every slot, with the aside as its own landmark', () => {
    render(
      <TodayLayout
        topCards={<div>Top cards</div>}
        quickAdd={<div>Quick add</div>}
        main={<div>Main</div>}
        aside={<div>Aside</div>}
      />,
    )
    expect(screen.getByRole('region', { name: 'Overview' })).toHaveTextContent('Top cards')
    expect(screen.getByText('Quick add')).toBeInTheDocument()
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByRole('complementary')).toHaveTextContent('Aside')
  })

  it('leaves out empty optional slots', () => {
    render(<TodayLayout main={<div>Main</div>} />)
    expect(screen.queryByRole('region', { name: 'Overview' })).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
  })
})
