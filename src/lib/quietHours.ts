/** "HH:MM" → minutes since midnight. */
function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
}

/**
 * True when `time` is inside quiet hours from…to ("HH:MM"). The start counts, the end
 * doesn't (22:00–06:00: 22:00 quiet, 06:00 not). Works across midnight. from === to ⇒ never quiet.
 */
export function isQuiet(time: string, from: string, to: string): boolean {
  const t = minutes(time)
  const start = minutes(from)
  const end = minutes(to)
  if (start === end) return false
  return start < end ? t >= start && t < end : t >= start || t < end
}
