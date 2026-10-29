import { format, parseISO } from 'date-fns'
import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { DateKey } from '@/lib/dates'
import { CHART, percent } from './chartTheme'
import { useElementWidth } from './useElementWidth'

export type CompletionPoint = {
  date: DateKey
  /** Share of the day's tasks done, 0–1. null = nothing was planned that day. */
  daily: number | null
  /** 7-day average up to this day, 0–1 (computed in src/lib). */
  average: number | null
}

type CompletionLineChartProps = {
  points: readonly CompletionPoint[]
  /** Card title. */
  title?: string
}

const HEIGHT = 240
const PAD = { top: 10, right: 14, bottom: 26, left: 42 }
const TICKS = [0, 0.25, 0.5, 0.75, 1]

const dayLabel = (date: DateKey) => format(parseISO(date), 'EEE, d MMM')
const shortLabel = (date: DateKey) => format(parseISO(date), 'd MMM')
const valueText = (v: number | null) => (v === null ? 'nothing planned' : percent(v))
const pointText = (p: CompletionPoint) =>
  `${dayLabel(p.date)}: daily ${valueText(p.daily)}, 7-day average ${valueText(p.average)}`

/** SVG path through the points; a null value breaks the line. */
function linePath(values: readonly (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = ''
  let drawing = false
  values.forEach((v, i) => {
    if (v === null) {
      drawing = false
      return
    }
    d += `${drawing ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    drawing = true
  })
  return d
}

/** "Task completion per day": the daily rate (soft line) and its 7-day average (strong line). */
export function CompletionLineChart({ points, title = 'Task completion per day' }: CompletionLineChartProps) {
  const id = useId()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const n = points.length
  const plotW = Math.max(1, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1))
  const y = (v: number) => PAD.top + (1 - v) * plotH

  const lastAvg = [...points].reverse().findIndex((p) => p.average !== null)
  const endIndex = lastAvg === -1 ? -1 : n - 1 - lastAvg
  const activePoint = active === null ? null : points[active]

  function pick(e: PointerEvent<SVGSVGElement>) {
    if (n === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const i = Math.round(((px - PAD.left) / plotW) * (n - 1))
    setActive(Math.min(n - 1, Math.max(0, i)))
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (n === 0) return
    const current = active ?? n - 1
    const next =
      e.key === 'ArrowLeft' ? current - 1 : e.key === 'ArrowRight' ? current + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (next === null) return
    e.preventDefault()
    setActive(Math.min(n - 1, Math.max(0, next)))
  }

  // Three date labels under the axis: first, middle, last.
  const dateTicks = n === 0 ? [] : [...new Set([0, Math.floor((n - 1) / 2), n - 1])]

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        <ul aria-label="Legend" className="flex gap-4 text-xs text-ink-2">
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: CHART.strong }} />
            7-day average
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: CHART.soft }} />
            Daily
          </li>
        </ul>
      </div>

      <div ref={boxRef}>
        {n === 0 ? (
          <p className="py-16 text-center text-sm text-ink-3">No tasks in this period yet.</p>
        ) : (
          // A slider over the days: ← → (Home / End) pick a day, and screen readers read its values.
          <div
            tabIndex={0}
            role="slider"
            aria-label={`${title}, choose a day`}
            aria-valuemin={1}
            aria-valuemax={n}
            aria-valuenow={(active ?? n - 1) + 1}
            aria-valuetext={pointText(points[active ?? n - 1]!)}
            onKeyDown={onKey}
            onFocus={() => setActive((a) => a ?? n - 1)}
            onBlur={() => setActive(null)}
            className="relative rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <svg
              width={width}
              height={HEIGHT}
              aria-hidden="true"
              className="block touch-pan-y"
              onPointerMove={pick}
              onPointerDown={pick}
              onPointerLeave={() => setActive(null)}
            >
              {TICKS.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(t)}
                    y2={y(t)}
                    stroke={t === 0 ? CHART.grid : CHART.gridFaint}
                    strokeWidth={1}
                  />
                  <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-2 text-[11px] tabular-nums">
                    {percent(t)}
                  </text>
                </g>
              ))}
              {dateTicks.map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y={HEIGHT - 6}
                  textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                  className="fill-ink-2 text-[11px]"
                >
                  {shortLabel(points[i]!.date)}
                </text>
              ))}

              <path
                d={linePath(points.map((p) => p.daily), x, y)}
                fill="none"
                stroke={CHART.soft}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d={linePath(points.map((p) => p.average), x, y)}
                fill="none"
                stroke={CHART.strong}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {endIndex >= 0 && active === null && (
                <circle cx={x(endIndex)} cy={y(points[endIndex]!.average!)} r={4} fill={CHART.strong} stroke="white" strokeWidth={2} />
              )}

              {activePoint && active !== null && (
                <g>
                  <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke={CHART.crosshair} strokeWidth={1} />
                  {activePoint.daily !== null && (
                    <circle cx={x(active)} cy={y(activePoint.daily)} r={4} fill={CHART.soft} stroke="white" strokeWidth={2} />
                  )}
                  {activePoint.average !== null && (
                    <circle cx={x(active)} cy={y(activePoint.average)} r={4} fill={CHART.strong} stroke="white" strokeWidth={2} />
                  )}
                </g>
              )}
            </svg>

            {activePoint && active !== null && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1 z-10 w-max rounded-lg border border-border bg-card px-3 py-2 text-xs"
                style={
                  x(active) > width / 2
                    ? { right: width - x(active) + 10 }
                    : { left: x(active) + 10 }
                }
              >
                <p className="mb-1 font-semibold text-foreground">{dayLabel(activePoint.date)}</p>
                <p className="flex items-center gap-1.5 text-ink-2">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: CHART.strong }} />
                  7-day average <span className="ml-auto pl-3 font-semibold text-foreground tabular-nums">{valueText(activePoint.average)}</span>
                </p>
                <p className="flex items-center gap-1.5 text-ink-2">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: CHART.soft }} />
                  Daily <span className="ml-auto pl-3 font-semibold text-foreground tabular-nums">{valueText(activePoint.daily)}</span>
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Daily</th>
            <th scope="col">7-day average</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{dayLabel(p.date)}</th>
              <td>{valueText(p.daily)}</td>
              <td>{valueText(p.average)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
