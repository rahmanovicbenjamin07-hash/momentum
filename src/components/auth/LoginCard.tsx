import { zodResolver } from '@hookform/resolvers/zod'
import { ChartLine, Loader2, MailCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginValues } from '@/schemas/auth'

export type LoginCardProps = {
  /** Sends the magic link. Throw an Error to show its message under the field. */
  onSendLink: (email: string) => Promise<void>
  /** Shows "Continue with Google" when given. */
  onGoogle?: () => Promise<void>
  /** Shows a warning that Supabase keys are missing. */
  notConfigured?: boolean
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export function LoginCard({ onSendLink, onGoogle, notConfigured }: LoginCardProps) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await onSendLink(email)
      setSentTo(email)
    } catch (error) {
      setError('email', { message: error instanceof Error ? error.message : 'Could not send the link. Try again.' })
    }
  })

  async function handleGoogle() {
    if (!onGoogle) return
    setGoogleError(null)
    setGoogleBusy(true)
    try {
      await onGoogle()
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : 'Google sign-in failed. Try again.')
      setGoogleBusy(false)
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-6 flex items-center justify-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-topbar text-white" aria-hidden="true">
          <ChartLine className="size-5" strokeWidth={2.5} />
        </span>
        <span className="text-xl font-semibold tracking-tight">Momentum</span>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        {notConfigured && (
          <p className="mb-5 flex gap-2 rounded-lg bg-warn-tint p-3 text-[13px] text-warn">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Supabase isn't connected yet. Add your keys to .env.local and restart the dev server.
          </p>
        )}

        {sentTo ? (
          <div className="text-center" role="status">
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-good-tint text-good">
              <MailCheck className="size-6" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-ink-2">
              We sent a sign-in link to <strong className="font-semibold text-foreground">{sentTo}</strong>. Open it to
              sign in. You can close this tab.
            </p>
            <Button variant="outline" className="mt-6 w-full" onClick={() => setSentTo(null)}>
              Use a different email
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">Sign in</h1>
            <p className="mt-1 text-sm text-ink-2">We'll email you a magic link. No password needed.</p>

            <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')}
                />
                {errors.email && (
                  <p id="email-error" className="text-[13px] text-bad">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                Send magic link
              </Button>
            </form>

            {onGoogle && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-ink-3">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={googleBusy}>
                  {googleBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <GoogleIcon />}
                  Continue with Google
                </Button>
                {googleError && (
                  <p role="alert" className="mt-2 text-[13px] text-bad">
                    {googleError}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
