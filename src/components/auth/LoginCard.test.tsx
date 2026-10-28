import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginCard } from './LoginCard'

describe('LoginCard', () => {
  it('shows a validation error for a bad email and does not send', async () => {
    const user = userEvent.setup()
    const onSendLink = vi.fn<(email: string) => Promise<void>>().mockResolvedValue()
    render(<LoginCard onSendLink={onSendLink} />)

    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Send magic link' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(onSendLink).not.toHaveBeenCalled()
  })

  it('sends the link and shows the "check your email" screen', async () => {
    const user = userEvent.setup()
    const onSendLink = vi.fn<(email: string) => Promise<void>>().mockResolvedValue()
    render(<LoginCard onSendLink={onSendLink} />)

    await user.type(screen.getByLabelText('Email'), ' me@example.com ')
    await user.click(screen.getByRole('button', { name: 'Send magic link' }))

    expect(onSendLink).toHaveBeenCalledWith('me@example.com')
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText('me@example.com')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Use a different email' }))
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows the server error under the field', async () => {
    const user = userEvent.setup()
    const onSendLink = vi.fn<(email: string) => Promise<void>>().mockRejectedValue(new Error('Rate limited'))
    render(<LoginCard onSendLink={onSendLink} />)

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Send magic link' }))

    expect(await screen.findByText('Rate limited')).toBeInTheDocument()
  })

  it('only shows Google when a handler is given', () => {
    const { unmount } = render(<LoginCard onSendLink={vi.fn<(email: string) => Promise<void>>()} />)
    expect(screen.queryByRole('button', { name: /Google/ })).not.toBeInTheDocument()
    unmount()

    render(
      <LoginCard
        onSendLink={vi.fn<(email: string) => Promise<void>>()}
        onGoogle={vi.fn<() => Promise<void>>()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })
})
