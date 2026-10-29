/**
 * Light / dark / match-the-device theme.
 * The choice is kept in localStorage ('momentum-theme') so the right colours show
 * before the profile loads, and in the profile so it follows you to other devices.
 */
import { useSyncExternalStore } from 'react'
import type { Theme } from '@/schemas/settings'

export const THEME_STORAGE_KEY = 'momentum-theme'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark' || value === 'system'

export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function storeTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode / blocked storage: the profile still remembers it.
  }
}

const darkQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null)

/** 'system' → what the device uses right now. */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return darkQuery()?.matches ? 'dark' : 'light'
}

function paint(theme: Theme) {
  const dark = resolveTheme(theme) === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

// A tiny store so React (e.g. the toasts) can follow the theme.
let current: Theme = 'light'
const listeners = new Set<() => void>()
let stopWatching: (() => void) | null = null

/** Sets the theme on <html> (and remembers it on this device). 'system' follows the device as it changes. */
export function setTheme(theme: Theme, { remember = true } = {}) {
  current = theme
  if (remember) storeTheme(theme)
  paint(theme)
  stopWatching?.()
  stopWatching = null
  if (theme === 'system') {
    const query = darkQuery()
    if (query) {
      const onChange = () => paint('system')
      query.addEventListener('change', onChange)
      stopWatching = () => query.removeEventListener('change', onChange)
    }
  }
  for (const listener of listeners) listener()
}

/** Call once before the first render: uses the theme saved on this device, so there's no flash. */
export function initTheme() {
  setTheme(readStoredTheme() ?? 'light', { remember: false })
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
