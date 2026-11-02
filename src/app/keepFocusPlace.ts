const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
}

/**
 * Call right before an action that may remove the focused control (e.g. "Move to today").
 * If that control disappears, focus moves to the control that now sits in its place: inside the
 * same list when that list is still there (other blocks may vanish at the same time), else inside
 * `root`. So keyboard users don't get thrown back to the top of the page.
 */
export function keepFocusPlace(root: HTMLElement | null, maxFrames = 60): void {
  const active = document.activeElement
  if (!root || !(active instanceof HTMLElement) || !root.contains(active)) return
  const index = focusables(root).indexOf(active)
  if (index === -1) return
  const list = active.closest('ul, ol')
  const listIndex = list instanceof HTMLElement && root.contains(list) ? focusables(list).indexOf(active) : -1

  let frames = 0
  const check = () => {
    if (active.isConnected) {
      if (++frames < maxFrames) requestAnimationFrame(check)
      return
    }
    // Someone else already moved focus somewhere sensible.
    if (document.activeElement && document.activeElement !== document.body) return
    if (list instanceof HTMLElement && list.isConnected && listIndex !== -1) {
      const inList = focusables(list)
      if (inList.length > 0) return inList[Math.min(listIndex, inList.length - 1)]?.focus()
    }
    const next = focusables(root)
    next[Math.min(index, next.length - 1)]?.focus()
  }
  requestAnimationFrame(check)
}
