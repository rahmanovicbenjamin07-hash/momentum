import { useEffect, useRef, useState } from 'react'
import { daysBetween, formatDate, type DateKey } from '@/lib/dates'
import type { GoalChart as GoalChartData, Point } from '@/lib/goalChart'

type GoalChartProps = {
  chart: GoalChartData
  /** Full value, e.g. 18000 → "€18,000" (target label and the screen-reader summary). */
  formatY: (value: number) => string
  /** Y-axis labels, e.g. 20000 → "€20k". Defaults to `formatY`. */
  formatTick?: (value: number) => string
}

const HEIGHT = 300
const PAD = { top: 30, right: 16, bottom: 28, left: 52 }
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** Round step for 4 gaps (5 labels): 4,950 → 5,000. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = [1, 2, 2.5, 5, 10].find((n) => n * pow >= raw) ?? 10
  return f * pow
}

/** First day of every month from `start` to `end`, thinned to about 5 labels. "Jan 2026", "Apr", … */
function monthTicks(start: DateKey, end: DateKey): { date: DateKey; label: string }[] {
  let y = Number(start.slice(0, 4))
  let m = Number(start.slice(5, 7))
  if (start.slice(8) !== '01') m += 1
  const all: { date: DateKey; y: number; m: number }[] = []
  for (;;) {
    if (m > 12) {
      m = 1
      y += 1
    }
    const date = `${y}-${String(m).padStart(2, '0')}-01` as DateKey
    if (date > end) break
    all.push({ date, y, m })
    m += 1
  }
  const step = Math.max(1, Math.ceil(all.length / 5))
  return all
    .filter((_, i) => i % step === 0)
    .map(({ date, y: year, m: month }, i) => ({
      date,
      label: month === 1 || i === 0 ? `${MONTHS_SHORT[month - 1]} ${year}` : MONTHS_SHORT[month - 1]!,
    }))
}

/** Width of the wrapper in px, so the viewBox matches it and text never stretches. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** One-sentence summary for screen readers. */
function summary(chart: GoalChartData, formatY: (v: number) => string): string {
  const now = chart.actual.at(-1)?.value ?? 0
  const deals = chart.pipelineJump ? ` plus ${formatY(chart.pipelineJump.to - chart.pipelineJump.from)} expected from open deals` : ''
  const finish = chart.finish
    ? `at this pace you reach it on ${formatDate(chart.finish.date)}`
    : 'at this pace you don’t reach it yet'
  return `Goal chart: ${formatY(now)} so far on ${formatDate(chart.todayX)}${deals}; target ${formatY(chart.targetY)} by ${formatDate(chart.deadlineX)}; ${finish}.`
}

/** Running total against the target, with the forecast to the finish date. Plain SVG. */
export function GoalChart({ chart, formatY, formatTick = formatY }: GoalChartProps) {
  const [ref, width] = useWidth()
  const start = chart.actual[0]?.date ?? chart.todayX
  const span = Math.max(1, daysBetween(start, chart.xMax))
  const step = niceStep(chart.yMax / 4)
  const top = step * 4 >= chart.yMax ? step * 4 : chart.yMax
  const plotW = width - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const bottom = PAD.top + plotH
  const right = PAD.left + plotW

  const x = (date: DateKey) => PAD.left + (daysBetween(start, date) / span) * plotW
  const y = (value: number) => PAD.top + plotH - (Math.min(value, top) / top) * plotH
  const path = (points: Point[]) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  /** Keeps a label inside the chart near the edges. */
  const anchor = (px: number, half = 30) => (px > right - half ? 'end' : px < PAD.left + half ? 'start' : 'middle')

  const targetY = y(chart.targetY)
  const deadlineX = x(chart.deadlineX)
  const todayX = x(chart.todayX)
  const finishLabel = chart.finish ? formatDate(chart.finish.date) : ''
  const finishW = finishLabel.length * 6.6 + 14
  const finishX = chart.finish ? Math.min(Math.max(x(chart.finish.date) - finishW / 2, PAD.left), right - finishW) : 0

  return (
    <div ref={ref} className="w-full">
      <svg
        role="img"
        aria-label={summary(chart, formatY)}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        className="block overflow-visible text-[11px] tabular-nums"
      >
        {/* Grid and y-axis labels */}
        {[0, 1, 2, 3, 4].map((i) => {
          const value = step * i
          const py = y(value)
          return (
            <g key={i}>
              <line x1={PAD.left} x2={right} y1={py} y2={py} className={i === 0 ? 'stroke-border' : 'stroke-border/70'} />
              <text x={PAD.left - 10} y={py} dy="0.35em" textAnchor="end" className="fill-ink-3">
                {formatTick(value)}
              </text>
            </g>
          )
        })}

        {/* Month labels */}
        {monthTicks(start, chart.xMax).map((tick) => (
          <text key={tick.date} x={x(tick.date)} y={bottom + 18} textAnchor={anchor(x(tick.date), 24)} className="fill-ink-2">
            {tick.label}
          </text>
        ))}

        {/* Today */}
        <line x1={todayX} x2={todayX} y1={PAD.top} y2={bottom} className="stroke-brand/30" />
        <text x={todayX} y={bottom - 6} textAnchor={anchor(todayX, 20)} className="fill-brand font-semibold">
          Today
        </text>

        {/* Deadline */}
        <line x1={deadlineX} x2={deadlineX} y1={PAD.top - 4} y2={bottom} strokeDasharray="4 4" className="stroke-ink-3" strokeWidth={1.5} />
        <text x={deadlineX} y={PAD.top - 10} textAnchor={anchor(deadlineX, 28)} className="fill-foreground font-semibold">
          Deadline
        </text>

        {/* Target */}
        <line x1={PAD.left} x2={right} y1={targetY} y2={targetY} strokeDasharray="6 5" strokeWidth={1.5} className="stroke-good" />
        <text x={PAD.left + 8} y={targetY - 7} className="fill-good font-semibold">
          Target {formatY(chart.targetY)}
        </text>

        {/* Ghost: the real pace while the slider sets another one */}
        {chart.ghost && (
          <path d={path(chart.ghost)} fill="none" strokeDasharray="3 5" strokeWidth={2} className="stroke-ink-3/60" />
        )}

        {/* Actual running total */}
        <path d={path(chart.actual)} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="stroke-brand" />

        {/* Pipeline jump on today */}
        {chart.pipelineJump && (
          <line
            x1={todayX}
            x2={todayX}
            y1={y(chart.pipelineJump.from)}
            y2={y(chart.pipelineJump.to)}
            strokeWidth={3}
            strokeLinecap="round"
            className="stroke-chart-amber"
          />
        )}

        {/* Forecast to the finish */}
        {chart.forecast.length > 1 && (
          <path d={path(chart.forecast)} fill="none" strokeDasharray="6 5" strokeWidth={2.5} strokeLinecap="round" className="stroke-brand/70" />
        )}

        {/* Finish marker */}
        {chart.finish && (
          <g>
            <rect x={finishX} y={4} width={finishW} height={18} rx={5} className="fill-brand-tint stroke-brand/40" />
            <text x={finishX + finishW / 2} y={13} dy="0.35em" textAnchor="middle" className="fill-brand font-semibold">
              {finishLabel}
            </text>
            <circle cx={x(chart.finish.date)} cy={y(chart.finish.value)} r={6} strokeWidth={2.5} className="fill-card stroke-brand" />
          </g>
        )}
      </svg>
    </div>
  )
}
