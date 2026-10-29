import { useId } from 'react'
import { Link } from 'react-router'

export type Lesson = { id: string; text: string }

type LessonsProps = {
  lessons: readonly Lesson[]
  /** Where "All lessons" goes. */
  href?: string
}

/** "Lessons you wrote down" during the period. */
export function Lessons({ lessons, href = '/improve' }: LessonsProps) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5 print:break-inside-avoid">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          Lessons you wrote down
        </h2>
        <Link to={href} className="rounded-sm text-sm font-semibold text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 print:hidden">
          All lessons
        </Link>
      </div>
      {lessons.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">No lessons in this period. Write one on Improvements when something clicks.</p>
      ) : (
        <ul className="divide-y divide-border">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="py-3.5 text-sm leading-relaxed text-foreground last:pb-0">
              {lesson.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
