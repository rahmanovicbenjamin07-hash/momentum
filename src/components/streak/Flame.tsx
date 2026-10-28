import { cn } from 'cn'
import { getStreakLevel, type StreakLevelId } from '@/lib/streak-levels'

type FlameProps = {
  /** Which colour set to use (see STREAK_LEVELS). */
  level: StreakLevelId
  /** Width and height in px. Default 96. */
  size?: number
  /** Show sparkles around the circle. Defaults to the level's own setting (Inferno and Legend). */
  sparkles?: boolean
  /** Text for screen readers. Leave empty when the text next to the flame already says it. */
  label?: string
  className?: string
}

// Drawn on a 100×100 grid; the circle fills it and sparkles sit in the free corners.
const OUTER =
  'M52 22C55 33 67 41 67 57C67 69 59 78 50 78C41 78 33 70 33 60C33 51 37 45 41 39C42 44 44 47 47 49C46 40 47 30 52 22Z'
const MIDDLE =
  'M52 43C55 50 61 55 61 64C61 71 56 76 50 76C44 76 39 71 39 65C39 60 41 57 44 54C45 58 46 60 48 61C48 55 49 49 52 43Z'
const CORE = 'M50 59C52 63 55.5 66 55.5 70.5C55.5 73.5 53 76 50 76C47 76 44.5 73.5 44.5 70.5C44.5 66 48 63 50 59Z'

/** Four-pointed star centred on (cx, cy). */
function sparklePath(cx: number, cy: number, r: number) {
  return `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`
}

/** Three-layer streak flame in a tinted circle. Colours change with the streak level. */
export function Flame({ level, size = 96, sparkles, label, className }: FlameProps) {
  const { colors, sparkles: levelSparkles } = getStreakLevel(level)
  const showSparkles = sparkles ?? levelSparkles

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('shrink-0 overflow-visible', className)}
      data-level={level}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <circle cx="50" cy="50" r="50" fill={colors.tint} data-part="circle" />
      <path d={OUTER} fill={colors.outer} data-part="outer" />
      <path d={MIDDLE} fill={colors.middle} data-part="middle" />
      <path d={CORE} fill={colors.core} data-part="core" />
      {showSparkles && (
        <g data-part="sparkles">
          <path d={sparklePath(86, 14, 7)} fill={colors.middle} />
          <path d={sparklePath(15, 22, 3.5)} fill={colors.outer} />
          <path d={sparklePath(12, 78, 3.5)} fill={colors.outer} />
        </g>
      )}
    </svg>
  )
}
