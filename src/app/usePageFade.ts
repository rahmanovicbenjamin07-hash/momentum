import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

const FADE_MS = 250

/** What counts as "another screen": the path, plus the ?tab= of Finance and Settings. Filters, days and ranges don't. */
export function pageFadeKey(pathname: string, search: string): string {
  const tab = new URLSearchParams(search).get('tab')
  return tab ? `${pathname}?tab=${tab}` : pathname
}

/**
 * Soft fade-in (250 ms, a 4px rise) whenever you move to another screen or tab.
 * The content isn't rebuilt, it's only re-animated, so focus stays on the tab you pressed.
 * Off when the OS asks for less motion; does nothing where the Web Animations API is missing (tests).
 */
export function usePageFade<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const { pathname, search } = useLocation()
  const key = pageFadeKey(pathname, search)
  // Starts as the current screen, so the first screen after loading appears straight away.
  const lastKey = useRef(key)
  const running = useRef<Animation | null>(null)

  // Runs after every render but only acts when the screen or tab changed.
  useEffect(() => {
    if (lastKey.current === key) return
    lastKey.current = key
    const el = ref.current
    if (!el || typeof el.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    running.current?.cancel()
    running.current = el.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: FADE_MS, easing: 'ease-out' },
    )
  })

  return ref
}
