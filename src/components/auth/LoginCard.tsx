import { zodResolver } from '@hookform/resolvers/zod'
import { ChartLine, Loader2, TriangleAlert } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema, type LoginValues } from '@/schemas/auth'

export type LoginCardProps = {
  /** Signs in with email + password. Throw an Error to show its message on the form. */
  onSignIn: (email: string, password: string) => Promise<void>
  /** Shows a warning that Supabase keys are missing. */
  notConfigured?: boolean
}

export function LoginCard({ onSignIn, notConfigured }: LoginCardProps) {
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await onSignIn(email, password)
    } catch (error) {
      resetField('password')
      setError('root', { message: error instanceof Error ? error.message : 'Could not sign in. Try again.' })
    }
  })

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

        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-ink-2">Enter your email and password.</p>

        <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
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

          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p id="password-error" className="text-[13px] text-bad">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p role="alert" className="rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
