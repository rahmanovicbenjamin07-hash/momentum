/**
 * Two-letter avatar initials.
 * "Benjamin Rahmanović" → "BR", "amir" → "AM", "lejla.h@mail.com" → "LH".
 */
export function getInitials(nameOrEmail: string | null | undefined): string {
  const raw = (nameOrEmail ?? '').trim()
  if (!raw) return '?'

  // For an email, only use the part before "@".
  const base = raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw
  const words = base.split(/[\s._-]+/).filter(Boolean)

  if (words.length === 0) return '?'
  if (words.length === 1) {
    return Array.from(words[0] ?? '').slice(0, 2).join('').toUpperCase()
  }
  const first = Array.from(words[0] ?? '')[0] ?? ''
  const last = Array.from(words[words.length - 1] ?? '')[0] ?? ''
  return (first + last).toUpperCase()
}
