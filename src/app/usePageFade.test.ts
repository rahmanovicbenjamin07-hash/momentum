import { describe, expect, it } from 'vitest'
import { pageFadeKey } from './usePageFade'

describe('pageFadeKey', () => {
  it('changes with the screen and with ?tab=', () => {
    expect(pageFadeKey('/stats/overview', '')).not.toBe(pageFadeKey('/stats/metrics', ''))
    expect(pageFadeKey('/settings', '?tab=data')).not.toBe(pageFadeKey('/settings', '?tab=appearance'))
  })

  it('ignores filters, days and ranges', () => {
    expect(pageFadeKey('/', '?day=2026-11-03')).toBe(pageFadeKey('/', ''))
    expect(pageFadeKey('/stats/overview', '?range=90')).toBe(pageFadeKey('/stats/overview', '?range=7'))
    expect(pageFadeKey('/finance', '?tab=charts&month=2026-10')).toBe(pageFadeKey('/finance', '?month=2026-11&tab=charts'))
  })
})
