import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginCard } from './LoginCard'

const signInFn = () => vi.fn<(email: string, password: string) => Promise<void>>()

describe('LoginCard', () => {
  it('shows only email and password, no Google or magic link', () => {
    render(<LoginCard onSignIn={signInFn()} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('button', { name: /Google|magic link/i })).not.toBeInTheDocument()
  })

  it('shows validation errors and does not sign in', async () => {
    const user = userEvent.setup()
    const onSignIn = signInFn().mockResolvedValue()
    render(<LoginCard onSignIn={onSignIn} />)

    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(onSignIn).not.toHaveBeenCalled()
  })

  it('signs in with the trimmed email and the password', async () => {
    const user = userEvent.setup()
    const onSignIn = signInFn().mockResolvedValue()
    render(<LoginCard onSignIn={onSignIn} />)

    await user.type(screen.getByLabelText('Email'), ' me@example.com ')
    await user.type(screen.getByLabelText('Password'), 'secret pw')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(onSignIn).toHaveBeenCalledWith('me@example.com', 'secret pw')
  })

  it('shows the server error and clears the password', async () => {
    const user = userEvent.setup()
    const onSignIn = signInFn().mockRejectedValue(new Error('Wrong email or password.'))
    render(<LoginCard onSignIn={onSignIn} />)

    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'bad')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('shows and hides the password with the eye button', async () => {
    const user = userEvent.setup()
    render(<LoginCard onSignIn={signInFn()} />)
    const field = screen.getByLabelText('Password')

    await user.type(field, 'secret')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(field).toHaveAttribute('type', 'text')
    expect(field).toHaveValue('secret')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(field).toHaveAttribute('type', 'password')
  })
})
