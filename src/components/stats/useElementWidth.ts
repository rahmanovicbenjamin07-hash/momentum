import { useLayoutEffect, useRef, useState } from 'react'

/** Width of an element in px, kept up to date when it resizes. Starts at `fallback` (also used in tests). */
export function useElementWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      if (el.clientWidth > 0) setWidth(el.clientWidth)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}
