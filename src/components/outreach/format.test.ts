import { describe, expect, it } from 'vitest'
import { mockContacts } from '@/mocks/outreach'
import { avatarTone, contactViaLabel, formatEuro, lastTouchLabel, leadInitials, leadShortLine, leadValue } from './format'

const [emir, nova, shopify, sara, mostar, , fitbox, daniel] = mockContacts as [
  (typeof mockContacts)[number],
  ...(typeof mockContacts)[number][],
]
const today = '2026-10-28'

describe('outreach format helpers', () => {
  it('builds the short line per source', () => {
    expect(leadShortLine(emir!)).toBe('Founder · Bloom Studio')
    expect(leadShortLine(nova!)).toBe('Dentist · Sarajevo')
    expect(leadShortLine(mostar!)).toBe('Travel agency · Mostar · no website')
    expect(leadShortLine(sara!)).toBe('Atelier Sara · met at Startup Meetup')
    expect(leadShortLine(shopify!)).toBe('Upwork job · €800 budget · 12 Connects')
  })

  it('formats euro and picks the won amount for won leads', () => {
    expect(formatEuro(18400)).toBe('€18,400')
    expect(formatEuro(null)).toBe('—')
    expect(leadValue({ stage: 'won', deal_value: 3000, won_amount: 2800 })).toBe(2800)
    expect(leadValue({ stage: 'replied', deal_value: 1200, won_amount: null })).toBe(1200)
    expect(leadValue(daniel!)).toBeNull()
  })

  it('names the contact channel', () => {
    expect(contactViaLabel('linkedin')).toBe('LinkedIn message')
    expect(contactViaLabel('upwork')).toBe('Upwork chat')
    expect(contactViaLabel('email')).toBe('Email')
    expect(contactViaLabel(null)).toBe('—')
  })

  it('describes the last touch in Sarajevo days', () => {
    expect(lastTouchLabel(null, today)).toBe('Not yet')
    expect(lastTouchLabel('2026-10-28T08:15:00Z', today)).toBe('Today')
    // 23:30 UTC on 27 Oct is already 28 Oct in Sarajevo.
    expect(lastTouchLabel('2026-10-27T23:30:00Z', today)).toBe('Today')
    expect(lastTouchLabel('2026-10-27T12:00:00Z', today)).toBe('Yesterday')
    expect(lastTouchLabel('2026-10-25T09:30:00Z', today)).toBe('3 days ago')
    expect(lastTouchLabel(fitbox!.last_touch_at, today)).toBe('2 weeks ago')
    expect(lastTouchLabel('2026-06-01T09:00:00Z', today)).toBe('1 Jun 2026')
  })

  it('uses "UP" for Upwork jobs without a client and a stable avatar colour', () => {
    expect(leadInitials(shopify!)).toBe('UP')
    expect(leadInitials(emir!)).toBe('EK')
    expect(avatarTone(emir!.id)).toBe(avatarTone(emir!.id))
  })
})
