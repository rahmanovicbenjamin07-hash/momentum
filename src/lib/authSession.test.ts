import { describe, expect, it } from 'vitest'
import { isSessionTooOld, SESSION_MAX_DAYS } from './authSession'

const now = new Date('2026-10-29T12:00:00Z')

describe('isSessionTooOld', () => {
  it('keeps a fresh sign-in', () => {
    expect(isSessionTooOld('2026-10-28T12:00:00Z', now)).toBe(false)
  })

  it('keeps a sign-in exactly 30 days old', () => {
    expect(SESSION_MAX_DAYS).toBe(30)
    expect(isSessionTooOld('2026-09-29T12:00:00Z', now)).toBe(false)
  })

  it('expires a sign-in older than 30 days', () => {
    expect(isSessionTooOld('2026-09-29T11:59:59Z', now)).toBe(true)
  })

  it('treats a missing or broken date as expired', () => {
    expect(isSessionTooOld(undefined, now)).toBe(true)
    expect(isSessionTooOld(null, now)).toBe(true)
    expect(isSessionTooOld('not a date', now)).toBe(true)
  })
})
