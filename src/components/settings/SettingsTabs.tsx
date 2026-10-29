import { useEffect, useState, type MouseEvent } from 'react'
import { cn } from 'cn'
import { SETTINGS_SECTIONS, settingsSectionId, type SettingsSection } from './meta'

/**
 * Notifications / Appearance / Data & backups / Integrations.
 * Links to the section cards on the same page: a click scrolls there, and the
 * underline follows whichever section is on screen while you scroll.
 */
export function SettingsTabs() {
  const [active, setActive] = useState<SettingsSection>('notifications')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        const key = top && SETTINGS_SECTIONS.find((s) => settingsSectionId(s.key) === top.target.id)?.key
        if (key) setActive(key)
      },
      // A section counts as "current" while it crosses the upper part of the screen.
      { rootMargin: '0px 0px -60% 0px' },
    )
    for (const section of SETTINGS_SECTIONS) {
      const el = document.getElementById(settingsSectionId(section.key))
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  const go = (event: MouseEvent, section: SettingsSection) => {
    const el = document.getElementById(settingsSectionId(section))
    if (!el) return
    event.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    // Move keyboard focus too, so Tab continues inside that section.
    el.focus({ preventScroll: true })
    setActive(section)
  }

  return (
    <nav aria-label="Settings sections" className="-mx-1 mb-5 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1 px-1">
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section.key}>
            <a
              href={`#${settingsSectionId(section.key)}`}
              onClick={(event) => go(event, section.key)}
              aria-current={active === section.key ? 'true' : undefined}
              className={cn(
                '-mb-px inline-flex h-11 items-center border-b-2 px-3.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:rounded-t-lg focus-visible:ring-3 focus-visible:ring-ring/50',
                active === section.key ? 'border-brand text-brand' : 'border-transparent text-ink-2 hover:text-foreground',
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
