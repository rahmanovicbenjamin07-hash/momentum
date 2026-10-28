import { describe, expect, it } from 'vitest'
import { loginSchema } from './auth'

describe('loginSchema', () => {
  it('accepts a valid email and trims spaces', () => {
    const result = loginSchema.safeParse({ email: '  me@example.com ' })
    expect(result.success).toBe(true)
    expect(result.data?.email).toBe('me@example.com')
  })

  it('rejects an empty email with a friendly message', () => {
    const result = loginSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter your email address')
  })

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter a valid email address')
  })

  it('rejects very long input', () => {
    const result = loginSchema.safeParse({ email: `${'a'.repeat(250)}@x.com` })
    expect(result.success).toBe(false)
  })
})
