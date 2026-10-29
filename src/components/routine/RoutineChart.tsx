import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from 'cn'
import { niceScale, monthName, monthShort, yearMonths } from '@/components/metrics/format'
import { CHART } from '@/components/stats/chartTheme'
import { useElementWidth } from '@/components/stats/useElementWidth'
import type { MonthKey } from '@/lib/metrics'
import type { RoutineMonth } from '@/lib/routineStats'
import { daysText, rateText } from './format'

export type RoutineChartMode = 'running' | 'monthly'

type RoutineChartProps = {
  /** e.g. "Wake up at 06:00 · Mon–Fri". */
  title: string
  year: number
  /** January up to the current month (from routineItemStats). */
  months: readonly RoutineMonth[]
  /** Every scheduled day added up, Jan–Dec: the dotted "perfect year" line. */
  perfectLine: readonly { month: MonthKey; total: number }[]
  /** Dashed forecast: the current month, then each month to December. */
  forecast: readonly { month: MonthKey; total: number }[] | null
  mode: RoutineChartMode
  onModeChange: (mode: RoutineChartMode) => void
  showPerfect: boolean
  onShowPerfectChange: (show: boolean) => void
}

const HEIGHT = 320
const PAD = { top: 14, right: 16, bottom: 28, left: 60 }
const PERFECT = CHART.muted
const MODES: { value: RoutineChartMode; label: string }[] = [
  { value: 'running', label: 'Running total' },
  { value: 'monthly', label: 'Per month' },
]
const monthIndex = (month: MonthKey) => Number(month.slice(5, 7)) - 1

function barPath(x: number, w: number, top: number, base: number): string {
  const r = Math.min(4, w / 2, Math.max(0, base - top))
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`
}

/** One routine item over the year: days done added up vs a perfect year, or done vs scheduled per month. */
export function RoutineChart({
  title,
  year,
  months,
  perfectLine,
  forecast,
  mode,
  onModeChange,
  showPerfect,
  onShowPerfectChange,
}: RoutineChartProps) {
  const id = useId()
  const [boxRef, width] = useElementWidth<HTMLDivElement>(720)
  const [hovered, setHovered] = useState<number | null>(null)

  const all = yearMonths(year)
  const byIndex = new Map(months.map((m) => [monthIndex(m.month), m]))
  const perfect = new Map(perfectLine.map((p) => [monthIndex(p.month), p.total]))
  const ahead = new Map((forecast ?? []).map((f) => [monthIndex(f.month), f.total]))
  const lastIndex = months.length ? monthIndex(months.at(-1)!.month) : 11
  const focusIndex = hovered ?? lastIndex
  const running = mode === 'running'

  const peak = running
    ? Math.max(...months.map((m) => m.total), ...(forecast ?? []).map((f) => f.total), ...(showPerfect ? perfectLine.map((p) => p.total) : [0]))
    : Math.max(...months.map((m) => m.scheduled), 1)
  const scale = niceScale(peak)
  const ticks = Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, i) => i * scale.step)

  const plotW = Math.max(1, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const band = plotW / 12
  const x = (i: number) => PAD.left + band * (i + 0.5)
  const y = (v: number) => PAD.top + (1 - v / scale.max) * plotH
  const base = y(0)
  const line = (points: { i: number; v: number }[]) =>
    points.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('')

  function pick(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    setHovered(Math.min(11, Math.max(0, Math.floor((px - PAD.left) / band))))
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = { ArrowLeft: focusIndex - 1, ArrowRight: focusIndex + 1, Home: 0, End: 11 }
    if (!(e.key in keys)) return
    e.preventDefault()
    setHovered(Math.min(11, Math.max(0, keys[e.key]!)))
  }

  const focusMonth = all[focusIndex]!
  const entry = byIndex.get(focusIndex)
  const headline = entry ? `${entry.done} of ${daysText(entry.scheduled)}` : 'Still to come'
  const details = entry
    ? [`${rateText(entry.rate)} done`, `${entry.missed} missed`, `running total ${daysText(entry.total)}`]
    : [
        ...(ahead.has(focusIndex) ? [`forecast ${daysText(ahead.get(focusIndex)!)} by then`] : []),
        ...(perfect.has(focusIndex) ? [`perfect year ${daysText(perfect.get(focusIndex)!)}`] : []),
      ]
  const sliderText = `${monthName(focusMonth, true)}: ${headline}${details.length ? `, ${details.join(', ')}` : ''}`

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-[13px] text-ink-2">
            {running ? 'Days done, added up through the year' : 'Days done out of scheduled days, month by month'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div role="group" aria-label="Chart type" className="flex rounded-lg border border-border bg-muted p-1">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={mode === m.value}
                onClick={() => onModeChange(m.value)}
                className={cn(
                  'h-8 rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  mode === m.value ? 'bg-card text-foreground' : 'text-ink-2 hover:text-foreground',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          {running && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={showPerfect}
                onChange={(e) => onShowPerfectChange(e.target.checked)}
                className="size-4 accent-brand"
              />
              Show perfect year
            </label>
          )}
        </div>
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-background px-4 py-2.5 text-[13px] text-ink-2">
        <span className="font-semibold text-foreground">{monthName(focusMonth, true)}</span>
        <span className="text-lg font-bold text-brand">{headline}</span>
        {details.length > 0 && <span>{details.join(' · ')}</span>}
      </p>

      <div ref={boxRef} className="mt-2">
        {/* A slider over the months: ← → (Home / End) pick a month, and screen readers read its details. */}
        <div
          tabIndex={0}
          role="slider"
          aria-label={`${title} ${year}, choose a month`}
          aria-valuemin={1}
          aria-valuemax={12}
          aria-valuenow={focusIndex + 1}
          aria-valuetext={sliderText}
          onKeyDown={onKey}
          onBlur={() => setHovered(null)}
          className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <svg
            width={width}
            height={HEIGHT}
            aria-hidden="true"
            className="block touch-pan-y"
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setHovered(null)}
          >
            {hovered !== null && <rect x={PAD.left + band * hovered} y={PAD.top} width={band} height={plotH} fill={CHART.gridFaint} />}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? CHART.grid : CHART.gridFaint} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-2 text-[11px] tabular-nums">
                  {daysText(t)}
                </text>
              </g>
            ))}
            {all.map((m, i) => (
              <text
                key={m}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor="middle"
                className={cn('text-[11px]', i === focusIndex ? 'fill-foreground font-semibold' : i > lastIndex ? 'fill-ink-3' : 'fill-ink-2')}
              >
                {monthShort(m)}
              </text>
            ))}

            {running ? (
              <>
                {showPerfect && perfectLine.length > 0 && (
                  <path
                    d={line(perfectLine.map((p) => ({ i: monthIndex(p.month), v: p.total })))}
                    fill="none"
                    stroke={PERFECT}
                    strokeWidth={1.5}
                    strokeDasharray="2 3"
                    strokeLinecap="round"
                  />
                )}
                {forecast && forecast.length > 1 && (
                  <path
                    d={line(forecast.map((f) => ({ i: monthIndex(f.month), v: f.total })))}
                    fill="none"
                    stroke={CHART.soft}
                    strokeWidth={2}
                    strokeDasharray="6 5"
                  />
                )}
                <path
                  d={line(months.map((m) => ({ i: monthIndex(m.month), v: m.total })))}
                  fill="none"
                  stroke={CHART.strong}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {months.map((m) => {
                  const i = monthIndex(m.month)
                  return (
                    <circle
                      key={m.month}
                      cx={x(i)}
                      cy={y(m.total)}
                      r={i === lastIndex || i === hovered ? 5 : 3}
                      fill={CHART.strong}
                      stroke="white"
                      strokeWidth={2}
                    />
                  )
                })}
              </>
            ) : (
              months.map((m) => {
                const i = monthIndex(m.month)
                const w = Math.min(24, band * 0.5)
                return (
                  <g key={m.month}>
                    <path d={barPath(x(i) - w / 2, w, y(m.scheduled), base)} fill={CHART.track} />
                    {m.done > 0 && (
                      <path d={barPath(x(i) - w / 2, w, y(m.done), base)} fill={i === focusIndex ? CHART.strong : CHART.soft} />
                    )}
                  </g>
                )
              })
            )}
          </svg>
        </div>
      </div>

      <ul aria-label="Legend" className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: CHART.strong }} />
          Days done
        </li>
        {running && forecast && forecast.length > 1 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t-2 border-dashed" style={{ borderColor: CHART.soft }} />
            Forecast at your recent pace
          </li>
        )}
        {running && showPerfect && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t-2 border-dotted" style={{ borderColor: PERFECT }} />
            Every scheduled day (perfect year)
          </li>
        )}
        {!running && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: CHART.track }} />
            Scheduled days
          </li>
        )}
        <li className="text-ink-3">Hover a month for details</li>
      </ul>

      <table className="sr-only">
        <caption>
          {title} {year}, by month
        </caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Done</th>
            <th scope="col">Scheduled</th>
            <th scope="col">Running total</th>
            <th scope="col">Perfect year</th>
          </tr>
        </thead>
        <tbody>
          {all.map((m, i) => {
            const row = byIndex.get(i)
            return (
              <tr key={m}>
                <th scope="row">{monthName(m)}</th>
                <td>{row ? row.done : '—'}</td>
                <td>{row ? row.scheduled : '—'}</td>
                <td>{row ? row.total : ahead.has(i) ? `forecast ${Math.round(ahead.get(i)!)}` : '—'}</td>
                <td>{perfect.get(i) ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
