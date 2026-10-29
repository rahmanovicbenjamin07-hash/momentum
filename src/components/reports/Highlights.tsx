import { Check } from 'lucide-react'
import { useId } from 'react'

/** "Highlights": the (up to 3) biggest improvements of the period. */
export function Highlights({ highlights }: { highlights: readonly string[] }) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5 print:break-inside-avoid">
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
        Highlights
      </h2>
      {highlights.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">Nothing went up compared with the period before — next one counts.</p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {highlights.map((text) => (
            <li key={text} className="flex items-start gap-3 py-3 last:pb-0">
              <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-good-tint text-good">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm text-foreground">{text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
