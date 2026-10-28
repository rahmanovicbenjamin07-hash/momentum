import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .max(254, 'That email is too long')
    .pipe(z.email('Enter a valid email address')),
})

export type LoginValues = z.infer<typeof loginSchema>
