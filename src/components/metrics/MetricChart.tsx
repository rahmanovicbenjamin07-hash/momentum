import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from 'cn'
import { CHART } from '@/components/stats/chartTheme'
import { useElementWidth } from '@/components/stats/useElementWidth'
import type { MonthKey } from '@/lib/metrics'
import type { Unit } from '@/schemas/stats'
import { formatAxisValue, formatChange, formatMetricValue, monthName, monthShort, niceScale, yearMonths } from './format'

export type MetricChartMode = 'running' | 'monthly'

export type ChartMonth = {
  month: MonthKey
  value: number
  /** Running total up to and including this month. */
  total: number
  /** vs the month before (0.13 = +13%), or null. */
  change: number | null
  note: string | null
}

export type LastYearMonth = { month: MonthKey; value: number; total: number }

type MetricChartProps = {
  name: string
  year: number
  unit: Unit
  /** This year's logged months, oldest first (from src/lib/metrics). */
  months: readonly ChartMonth[]
  /** Last year's months (same metric). */
  lastYear: readonly LastYearMonth[]
  /** Dashed forecast: last logged month, then one point per month to December. */
  forecast: readonly { month: MonthKey; total: number }[] | null
  goal: number | null
  mode: MetricChartMode
  onModeChange: (mode: MetricChartMode) => void
  compare: boolean
  onCompareChange: (compare: boolean) => void
}

const HEIGHT = 320
const PAD = { top: 14, right: 16, bottom: 28, left: 52 }
const LAST_YEAR = CHART.muted
const GOAL = CHART.goal
const MODES: { value: MetricChartMode; label: string }[] = [
  { value: 'running', label: 'Running total' },
  { value: 'monthly', label: 'Per month' },
]

const monthIndex = (month: MonthKey) => Number(month.slice(5, 7)) - 1

/** Column with rounded top corners, square at the baseline. */
function barPath(x: number, w: number, top: number, base: number): string {
  const r = Math.min(4, w / 2, base - top)
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`
}

/** The selected metric over the year: "Running total" (line + forecast + last year + goal) or "Per month" (bars). */
export function MetricChart({
  name,
  year,
  unit,
  months,
  lastYear,
  forecast,
  goal,
  mode,
  onModeChange,
  compare,
  onCompareChange,
}: MetricChartProps) {
  const id = useId()
  const [boxRef, width] = useElementWidth<HTMLDivElement>(720)
  const [hovered, setHovered] = useState<number | null>(null)

  const allMonths = yearMonths(year)
  const logged = new Map(months.map((m) => [monthIndex(m.month), m]))
  const previous = new Map(lastYear.map((m) => [monthIndex(m.month), m]))
  const ahead = new Map((forecast ?? []).map((f) => [monthIndex(f.month), f.total]))
  const lastLogged = months.at(-1)
  const lastIndex = lastLogged ? monthIndex(lastLogged.month) : 11
  const focusIndex = hovered ?? lastIndex
  const running = mode === 'running'
  const goalPace = goal ? goal / 12 : null

  const peak = running
    ? Math.max(goal ?? 0, ...months.map((m) => m.total), ...(forecast ?? []).map((f) => f.total), ...(compare ? lastYear.map((m) => m.total) : []))
    : Math.max(goalPace ?? 0, ...months.map((m) => m.value), ...(compare ? lastYear.map((m) => m.value) : []))
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
    const next =
      e.key === 'ArrowLeft'
        ? focusIndex - 1
        : e.key === 'ArrowRight'
          ? focusIndex + 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 11
              : null
    if (next === null) return
    e.preventDefault()
    setHovered(Math.min(11, Math.max(0, next)))
  }

  // The details line for the hovered (or latest) month.
  const focusMonth = allMonths[focusIndex]!
  const entry = logged.get(focusIndex)
  const ly = previous.get(focusIndex)
  const fmt = (v: number) => formatMetricValue(v, unit)
  const details: string[] = []
  if (entry) {
    details.push(running ? `${fmt(entry.value)} this month` : `total ${fmt(entry.total)}`)
    if (entry.change !== null) details.push(`${formatChange(entry.change)} vs ${monthShort(allMonths[focusIndex - 1] ?? focusMonth)}`)
  } else if (ahead.has(focusIndex) && focusIndex > lastIndex) {
    details.push(`forecast ${fmt(ahead.get(focusIndex)!)} by the end of the month`)
  }
  if (ly) details.push(`${year - 1}: ${fmt(ly.value)}`)
  if (entry?.note) details.push(`“${entry.note}”`)
  const headline = entry ? (running ? `${fmt(entry.total)} so far` : `${fmt(entry.value)} this month`) : 'Not logged yet'

  const sliderText = `${monthName(focusMonth, true)}: ${headline}${details.length ? `, ${details.join(', ')}` : ''}`

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold text-foreground">
            {name} · {year}
          </h2>
          <p className="text-[13px] text-ink-2">
            {running
              ? 'Running total — every month adds on top, so you see the year grow'
              : 'Per month — each bar is one month on its own'}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => onCompareChange(e.target.checked)}
              className="size-4 accent-brand"
            />
            Compare with {year - 1}
          </label>
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
          aria-label={`${name} ${year}, choose a month`}
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
                  {formatAxisValue(t, unit)}
                </text>
              </g>
            ))}
            {allMonths.map((m, i) => (
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
                {goal !== null && (
                  <>
                    <line x1={PAD.left} x2={width - PAD.right} y1={y(goal)} y2={y(goal)} stroke={GOAL} strokeWidth={1.5} strokeDasharray="6 4" />
                    <text x={width - PAD.right} y={y(goal) - 6} textAnchor="end" className="fill-good text-[11px] font-semibold">
                      Year goal {fmt(goal)}
                    </text>
                  </>
                )}
                {compare && lastYear.length > 0 && (
                  <path
                    d={line(lastYear.map((m) => ({ i: monthIndex(m.month), v: m.total })))}
                    fill="none"
                    stroke={LAST_YEAR}
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
                  const big = i === lastIndex || i === hovered
                  return <circle key={m.month} cx={x(i)} cy={y(m.total)} r={big ? 5 : 3} fill={CHART.strong} stroke={CHART.halo} strokeWidth={2} />
                })}
                {compare && ly && hovered !== null && (
                  <circle cx={x(hovered)} cy={y(ly.total)} r={4} fill={CHART.halo} stroke={LAST_YEAR} strokeWidth={2} />
                )}
              </>
            ) : (
              <>
                {months.map((m) => {
                  const i = monthIndex(m.month)
                  const w = Math.min(24, band * 0.5)
                  return (
                    <path
                      key={m.month}
                      d={barPath(x(i) - w / 2, w, Math.min(y(m.value), base - 1), base)}
                      fill={i === focusIndex ? CHART.strong : CHART.soft}
                    />
                  )
                })}
                {compare &&
                  lastYear.map((m) => (
                    <circle key={m.month} cx={x(monthIndex(m.month))} cy={y(m.value)} r={4} fill={CHART.halo} stroke={LAST_YEAR} strokeWidth={2} />
                  ))}
                {goalPace !== null && (
                  <>
                    <line x1={PAD.left} x2={width - PAD.right} y1={y(goalPace)} y2={y(goalPace)} stroke={GOAL} strokeWidth={1.5} strokeDasharray="6 4" />
                    <text x={width - PAD.right} y={y(goalPace) - 6} textAnchor="end" className="fill-good text-[11px] font-semibold">
                      Goal pace {fmt(goalPace)}/month
                    </text>
                  </>
                )}
              </>
            )}
          </svg>
        </div>
      </div>

      <ul aria-label="Legend" className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: CHART.strong }} />
          {year}
        </li>
        {running && forecast && forecast.length > 1 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t-2 border-dashed" style={{ borderColor: CHART.soft }} />
            Forecast at your recent pace
          </li>
        )}
        {compare && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full border-2 bg-card" style={{ borderColor: LAST_YEAR }} />
            {year - 1}, same month
          </li>
        )}
        {goal !== null && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 border-t-2 border-dashed" style={{ borderColor: GOAL }} />
            {running ? 'Goal' : 'Goal pace'}
          </li>
        )}
        <li className="text-ink-3">Hover a month for details</li>
      </ul>

      <table className="sr-only">
        <caption>
          {name} {year}, by month
        </caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Value</th>
            <th scope="col">Running total</th>
            <th scope="col">{year - 1}</th>
          </tr>
        </thead>
        <tbody>
          {allMonths.map((m, i) => (
            <tr key={m}>
              <th scope="row">{monthName(m)}</th>
              <td>{logged.has(i) ? fmt(logged.get(i)!.value) : 'not logged'}</td>
              <td>{logged.has(i) ? fmt(logged.get(i)!.total) : ahead.has(i) ? `forecast ${fmt(ahead.get(i)!)}` : '—'}</td>
              <td>{previous.has(i) ? fmt(previous.get(i)!.value) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
