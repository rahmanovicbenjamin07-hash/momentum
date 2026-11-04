/**
 * Reads a typed 24-hour time and returns it as "HH:MM".
 * Forgiving, so you can type it the quick way:
 *   "9" → 09:00 · "21" → 21:00 · "930" → 09:30 · "2130" → 21:30
 *   "9:5" → 09:05 · "9.30" / "9,30" / "9h30" → 09:30 · "" → "" (no time)
 * Anything else (25:00, 9:60, "abc") is not a time.
 */
export function parseTimeText(text: string): { ok: true; value: string } | { ok: false } {
  const clean = text.trim().replace(/[.,hH]/g, ':').replace(/\s+/g, '')
  if (clean === '') return { ok: true, value: '' }

  let hours: string
  let minutes: string
  const parts = clean.split(':')
  if (parts.length === 2) {
    ;[hours = '', minutes = ''] = parts
    if (minutes === '') minutes = '0' // "21:" → 21:00
  } else if (parts.length === 1 && /^\d{1,4}$/.test(clean)) {
    // Digits only: 1–2 are hours, 3–4 are hours + two minute digits.
    hours = clean.length <= 2 ? clean : clean.slice(0, -2)
    minutes = clean.length <= 2 ? '0' : clean.slice(-2)
  } else {
    return { ok: false }
  }

  if (!/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes)) return { ok: false }
  const h = Number(hours)
  const m = Number(minutes)
  if (h > 23 || m > 59) return { ok: false }
  return { ok: true, value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
}
