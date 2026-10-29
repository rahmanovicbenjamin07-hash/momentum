import type { LeadStage } from '@/components/outreach/meta'

/** How a goal is doing against its pace. Worked out by the goals logic; the UI only shows it. */
export const GOAL_STATUSES = ['reached', 'ahead', 'on_track', 'slightly_behind', 'behind', 'off_track'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; dot: string; pill: string }> = {
  reached: { label: 'Reached', dot: 'bg-good', pill: 'bg-good-tint text-good' },
  ahead: { label: 'Ahead', dot: 'bg-good', pill: 'bg-good-tint text-good' },
  on_track: { label: 'On track', dot: 'bg-good', pill: 'bg-good-tint text-good' },
  slightly_behind: { label: 'Slightly behind', dot: 'bg-warn', pill: 'bg-warn-tint text-warn' },
  behind: { label: 'Behind', dot: 'bg-bad', pill: 'bg-bad-tint text-bad' },
  off_track: { label: 'Off track', dot: 'bg-bad', pill: 'bg-bad-tint text-bad' },
}

/** One open Outreach deal counted towards a money goal. `probability` is 0–1, `expected` = amount × probability. */
export type PipelineDeal = {
  id: string
  name: string
  stage: LeadStage
  amount: number
  probability: number
  expected: number
}

/** Short stage names for the deal chips ("Meeting", not "Meeting booked"). */
export const DEAL_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  meeting: 'Meeting',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

/** 2400 → "€2,400". */
export const formatEur = (value: number) => eur.format(value)

/** 0.5 → "50%". */
export const formatPercent = (probability: number) => `${Math.round(probability * 100)}%`
