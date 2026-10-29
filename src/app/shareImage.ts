/**
 * "Share image": draws the report's share card on a canvas (no library) and
 * shares it as a PNG (phone share sheet) or downloads it.
 * The card only has numbers and fixed labels: no names, contacts or notes.
 */
import { formatEuro } from '@/components/outreach/format'
import type { ShareCard } from '@/lib/reports'

/** Card size in CSS pixels; the PNG is drawn at 2× for sharp text. */
export const CARD_WIDTH = 400
const PAD = 24
const COLORS = { bg: '#1E1B4B', label: '#C7D2FE', sub: '#E0E7FF', white: '#FFFFFF', line: 'rgba(255,255,255,0.2)' }
const FONT = '"Inter Variable", Inter, system-ui, sans-serif'

export type TextOp = {
  kind: 'text'
  text: string
  x: number
  y: number
  size: number
  weight: 400 | 500 | 600 | 700
  color: string
  align?: 'left' | 'right'
  /** Letter spacing in px (the uppercase heading). */
  spacing?: number
}
export type LineOp = { kind: 'line'; x1: number; x2: number; y: number; color: string }
export type DrawOp = TextOp | LineOp

/** What to draw and where (y = text baseline). Pure, so it can be tested without a canvas. */
export function shareCardLayout(share: ShareCard): { width: number; height: number; ops: DrawOp[] } {
  const ops: DrawOp[] = []
  const right = CARD_WIDTH - PAD
  ops.push({ kind: 'text', text: share.heading.toUpperCase(), x: PAD, y: PAD + 12, size: 12, weight: 600, color: COLORS.label, spacing: 1.7 })
  ops.push({ kind: 'text', text: 'momentum', x: right, y: PAD + 12, size: 12, weight: 600, color: COLORS.white, align: 'right' })

  const percent = share.routinePercent === null ? '—' : `${Math.round(share.routinePercent * 100)}%`
  ops.push({ kind: 'text', text: percent, x: PAD, y: PAD + 12 + 20 + 52, size: 56, weight: 700, color: COLORS.white })
  ops.push({ kind: 'text', text: 'of my daily routine done', x: PAD, y: PAD + 12 + 20 + 52 + 30, size: 16, weight: 500, color: COLORS.sub })

  const stats = [
    { value: String(share.tasksCompleted), label: 'tasks completed' },
    { value: `${share.longestStreak} ${share.longestStreak === 1 ? 'day' : 'days'}`, label: 'longest streak' },
    ...(share.earned !== null ? [{ value: formatEuro(share.earned), label: 'earned' }] : []),
    { value: String(share.outreachSent), label: 'outreach messages' },
  ]
  const gridTop = PAD + 12 + 20 + 52 + 30 + 24
  const colWidth = (CARD_WIDTH - PAD * 2 - 24) / 2
  const rowHeight = 68
  stats.forEach((s, i) => {
    const x = PAD + (i % 2) * (colWidth + 24)
    const top = gridTop + Math.floor(i / 2) * rowHeight
    ops.push({ kind: 'line', x1: x, x2: x + colWidth, y: top, color: COLORS.line })
    ops.push({ kind: 'text', text: s.value, x, y: top + 12 + 24, size: 24, weight: 700, color: COLORS.white })
    ops.push({ kind: 'text', text: s.label, x, y: top + 12 + 24 + 20, size: 12, weight: 400, color: COLORS.label })
  })
  const height = gridTop + Math.ceil(stats.length / 2) * rowHeight + PAD - 12
  return { width: CARD_WIDTH, height, ops }
}

/** Paints the card on a new canvas at `scale`× (needs a browser canvas). */
export function drawShareCard(share: ShareCard, scale = 2): HTMLCanvasElement {
  const { width, height, ops } = shareCardLayout(share)
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser can’t make images.')
  ctx.scale(scale, scale)

  ctx.fillStyle = COLORS.bg
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, 12)
  ctx.fill()

  for (const op of ops) {
    if (op.kind === 'line') {
      ctx.strokeStyle = op.color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(op.x1, op.y + 0.5)
      ctx.lineTo(op.x2, op.y + 0.5)
      ctx.stroke()
      continue
    }
    ctx.font = `${op.weight} ${op.size}px ${FONT}`
    ctx.fillStyle = op.color
    ctx.textAlign = op.align ?? 'left'
    ctx.textBaseline = 'alphabetic'
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${op.spacing ?? 0}px`
    ctx.fillText(op.text, op.x, op.y)
  }
  return canvas
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Couldn’t make the image.'))), 'image/png')
  })
}

/** "My October" → "momentum-my-october.png". */
export function shareFileName(heading: string): string {
  return `momentum-${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`
}

/**
 * Makes the PNG and opens the share sheet where the browser can share files
 * (phones), otherwise downloads it. Resolves with what happened.
 */
export async function shareCardImage(share: ShareCard): Promise<'shared' | 'downloaded' | 'cancelled'> {
  await document.fonts?.ready
  const blob = await toBlob(drawShareCard(share))
  const name = shareFileName(share.heading)
  const file = new File([blob], name, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: share.heading })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Share failed for another reason: fall back to a download.
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
