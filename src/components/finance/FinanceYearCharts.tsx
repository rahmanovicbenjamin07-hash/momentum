import { useId, useState } from 'react'
import { cn } from 'cn'
import { niceScale } from '@/components/metrics/format'
import { CHART } from '@/components/stats/chartTheme'
import { useElementWidth } from '@/components/stats/useElementWidth'
import { formatEur, formatMonthLong, formatMonthShort, type MonthKey, type MonthRow } from '@/lib/finance'

type FinanceYearChartsProps = {
  year: number
  /** January–December (from yearByMonth). */
  rows: readonly MonthRow[]
  /** The month shown above the charts; its column is marked. */
  selectedMonth: MonthKey
  /** Clicking a month opens it. */
  onSelectMonth: (month: MonthKey) => void
}

const HEIGHT = 200
const PAD = { top: 12, right: 8, bottom: 26, left: 56 }

/** "€2k", "€12.5k", "€800", "−€1k" for axis labels. */
function axisLabel(value: number): string {
  const abs = Math.abs(value)
  const text = abs >= 1000 ? `€${(abs / 1000).toLocaleString('en-IE', { maximumFractionDigits: 1 })}k` : `€${abs}`
  return value < 0 ? `−${text}` : text
}

/** A bar with 4px rounded top corners, standing on the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

/** Columns you can hover, focus and click; shared by both charts. Real buttons, laid over the SVG. */
function MonthHitTargets({
  rows,
  plotLeft,
  band,
  active,
  selectedMonth,
  onActive,
  onSelectMonth,
  describe,
}: {
  rows: readonly MonthRow[]
  plotLeft: number
  band: number
  active: MonthKey | null
  selectedMonth: MonthKey
  onActive: (month: MonthKey | null) => void
  onSelectMonth: (month: MonthKey) => void
  describe: (row: MonthRow) => string
}) {
  return (
    <div className="absolute inset-y-0" style={{ left: plotLeft, width: band * 12 }} onMouseLeave={() => onActive(null)}>
      {rows.map((row, i) => (
        <button
          key={row.month}
          type="button"
          aria-label={`${formatMonthLong(row.month)}: ${describe(row)}`}
          aria-current={row.month === selectedMonth ? 'date' : undefined}
          onMouseEnter={() => onActive(row.month)}
          onFocus={() => onActive(row.month)}
          onBlur={() => onActive(null)}
          onClick={() => onSelectMonth(row.month)}
          className={cn(
            'absolute inset-y-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            active === row.month && 'bg-foreground/[0.04]',
          )}
          style={{ left: i * band, width: band }}
        />
      ))}
    </div>
  )
}

function Tooltip({ row, x, width, lines }: { row: MonthRow; x: number; width: number; lines: [string, string][] }) {
  const left = Math.min(Math.max(x - 80, 0), width - 160)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 z-10 w-40 rounded-lg border border-border bg-card px-3 py-2 text-xs"
      style={{ left }}
    >
      <p className="mb-1 font-semibold text-foreground">{formatMonthLong(row.month)}</p>
      {lines.map(([label, value]) => (
        <p key={label} className="flex justify-between gap-2 text-ink-2">
          {label} <span className="font-semibold text-foreground tabular-nums">{value}</span>
        </p>
      ))}
    </div>
  )
}

/** "Earned vs spent" bars and "Savings" line for one year, each with hover details and a table for screen readers. */
export function FinanceYearCharts({ year, rows, selectedMonth, onSelectMonth }: FinanceYearChartsProps) {
  const id = useId()
  const [barsRef, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<MonthKey | null>(null)

  const plotW = Math.max(120, width - PAD.left - PAD.right)
  const band = plotW / 12
  const bottom = HEIGHT - PAD.bottom
  const plotH = bottom - PAD.top
  const centre = (i: number) => PAD.left + band * i + band / 2

  // Bars: one scale from 0.
  const barScale = niceScale(Math.max(...rows.map((r) => Math.max(r.earned, r.spent))))
  const barY = (v: number) => bottom - (v / barScale.max) * plotH
  const barW = Math.max(3, Math.min(14, band * 0.3))
  const barTicks = Array.from({ length: Math.round(barScale.max / barScale.step) + 1 }, (_, i) => i * barScale.step)

  // Savings: may dip below zero.
  const saved = rows.filter((r) => r.saved !== null).map((r) => r.saved ?? 0)
  const low = Math.min(0, ...saved)
  const savedScale = niceScale(Math.max(...saved, 0) - low)
  const savedMin = low < 0 ? -Math.ceil(-low / savedScale.step) * savedScale.step : 0
  const savedMax = Math.max(savedScale.max + savedMin, savedScale.step)
  const savedY = (v: number) => bottom - ((v - savedMin) / (savedMax - savedMin)) * plotH
  const savedTicks: number[] = []
  for (let v = savedMin; v <= savedMax + 1e-6; v += savedScale.step) savedTicks.push(v)
  const linePoints = rows.flatMap((r, i) => (r.saved === null ? [] : [[centre(i), savedY(r.saved)] as const]))
  const line = linePoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')

  const activeIndex = rows.findIndex((r) => r.month === active)
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined
  const selectedIndex = rows.findIndex((r) => r.month === selectedMonth)

  const grid = (ticks: number[], y: (v: number) => number) => (
    <>
      {rows.map((r, i) => (
        <line key={r.month} x1={centre(i)} x2={centre(i)} y1={PAD.top} y2={bottom} stroke={CHART.gridFaint} />
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? CHART.grid : CHART.gridFaint} />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-2 text-[11px] tabular-nums">
            {axisLabel(t)}
          </text>
        </g>
      ))}
    </>
  )
  const monthLabels = rows.map((r, i) => (
    <text
      key={r.month}
      x={centre(i)}
      y={HEIGHT - 8}
      textAnchor="middle"
      className={cn('text-[11px]', i === selectedIndex ? 'fill-foreground font-semibold' : 'fill-ink-2')}
    >
      {width < 420 ? formatMonthShort(r.month).slice(0, 1) : formatMonthShort(r.month)}
    </text>
  ))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-labelledby={`${id}-bars`} className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={`${id}-bars`} className="text-base font-semibold text-foreground">
            Earned vs spent · {year}
          </h2>
          <ul aria-label="Legend" className="flex gap-4 text-[13px] text-ink-2">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: 'var(--chart-earned)' }} />
              Earned
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: 'var(--chart-spent)' }} />
              Spent
            </li>
          </ul>
        </div>
        <div ref={barsRef} className="relative">
          <svg width="100%" height={HEIGHT} viewBox={`0 0 ${Math.max(width, 1)} ${HEIGHT}`} aria-hidden="true" className="block">
            {grid(barTicks, barY)}
            {rows.map((r, i) => (
              <g key={r.month}>
                <path d={barPath(centre(i) - barW - 1, barY(r.earned), barW, bottom - barY(r.earned))} fill="var(--chart-earned)" />
                <path d={barPath(centre(i) + 1, barY(r.spent), barW, bottom - barY(r.spent))} fill="var(--chart-spent)" />
              </g>
            ))}
            {monthLabels}
          </svg>
          <MonthHitTargets
            rows={rows}
            plotLeft={PAD.left}
            band={band}
            active={active}
            selectedMonth={selectedMonth}
            onActive={setActive}
            onSelectMonth={onSelectMonth}
            describe={(r) => `earned ${formatEur(r.earned)}, spent ${formatEur(r.spent)}`}
          />
          {activeRow && (
            <Tooltip
              row={activeRow}
              x={centre(activeIndex)}
              width={width}
              lines={[
                ['Earned', formatEur(activeRow.earned)],
                ['Spent', formatEur(activeRow.spent)],
                ['Profit', formatEur(activeRow.profit)],
              ]}
            />
          )}
        </div>
      </section>

      <section aria-labelledby={`${id}-saved`} className="rounded-xl border border-border bg-card p-5">
        <h2 id={`${id}-saved`} className="mb-3 text-base font-semibold text-foreground">
          Savings · {year}
        </h2>
        <div className="relative">
          <svg width="100%" height={HEIGHT} viewBox={`0 0 ${Math.max(width, 1)} ${HEIGHT}`} aria-hidden="true" className="block">
            {grid(savedTicks, savedY)}
            {activeIndex >= 0 && (
              <line x1={centre(activeIndex)} x2={centre(activeIndex)} y1={PAD.top} y2={bottom} stroke={CHART.crosshair} />
            )}
            <path d={line} fill="none" stroke={CHART.strong} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {linePoints.map(([x, y], i) =>
              i === linePoints.length - 1 || rows[i]?.month === active ? (
                <circle key={i} cx={x} cy={y} r={4} fill={CHART.strong} stroke={CHART.halo} strokeWidth={2} />
              ) : null,
            )}
            {monthLabels}
          </svg>
          <MonthHitTargets
            rows={rows}
            plotLeft={PAD.left}
            band={band}
            active={active}
            selectedMonth={selectedMonth}
            onActive={setActive}
            onSelectMonth={onSelectMonth}
            describe={(r) => (r.saved === null ? 'still ahead' : `saved ${formatEur(r.saved)}`)}
          />
          {activeRow && (
            <Tooltip
              row={activeRow}
              x={centre(activeIndex)}
              width={width}
              lines={[['Saved', activeRow.saved === null ? '—' : formatEur(activeRow.saved)]]}
            />
          )}
        </div>
      </section>

      {/* Hidden data table for screen readers. In a div: a <table> ignores sr-only's 1px size, and its rows would make the page scroll. */}
      <div className="sr-only">
        <table>
          <caption>Money by month, {year}</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Earned</th>
              <th scope="col">Spent</th>
              <th scope="col">Profit</th>
              <th scope="col">Saved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <th scope="row">{formatMonthLong(r.month)}</th>
                <td>{formatEur(r.earned)}</td>
                <td>{formatEur(r.spent)}</td>
                <td>{formatEur(r.profit)}</td>
                <td>{r.saved === null ? 'still ahead' : formatEur(r.saved)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
