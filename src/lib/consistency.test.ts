import { describe, expect, it } from 'vitest'
import { consistencyCycle } from './consistency'

describe('consistencyCycle', () => {
  it('starts on the first square the day you begin', () => {
    expect(consistencyCycle('2026-11-02', '2026-11-02', 84)).toEqual({ from: '2026-11-02', to: '2027-01-24', day: 1 })
  })

  it('fills one square per day', () => {
    expect(consistencyCycle('2026-11-02', '2026-11-10', 84).day).toBe(9)
  })

  it('reaches the last square, then starts again on the first', () => {
    expect(consistencyCycle('2026-11-02', '2027-01-24', 84)).toEqual({ from: '2026-11-02', to: '2027-01-24', day: 84 })
    expect(consistencyCycle('2026-11-02', '2027-01-25', 84)).toEqual({ from: '2027-01-25', to: '2027-04-18', day: 1 })
    expect(consistencyCycle('2026-11-02', '2027-04-19', 84)).toEqual({ from: '2027-04-19', to: '2027-07-11', day: 1 })
  })

  it('treats a start after today as today', () => {
    expect(consistencyCycle('2026-11-03', '2026-11-02', 84)).toEqual({ from: '2026-11-02', to: '2027-01-24', day: 1 })
  })
})
