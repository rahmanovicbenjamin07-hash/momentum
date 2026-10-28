import { Briefcase, CircleDot, Laptop, MapPin, Users, type LucideIcon } from 'lucide-react'
import { SOURCE_LABELS, SOURCES, STAGES, type Source, type Stage } from '@/schemas/outreach'

/** Where a lead was found (same as `Source` in the schema). */
export const LEAD_SOURCES = SOURCES
export type LeadSource = Source

/** Pipeline stage (same as `Stage` in the schema). */
export const LEAD_STAGES = STAGES
export type LeadStage = Stage

export type SourceFilterValue = LeadSource | 'all'
export type StageFilterValue = LeadStage | 'all'

const SOURCE_STYLE: Record<LeadSource, { icon: LucideIcon; className: string }> = {
  linkedin: { icon: Briefcase, className: 'bg-info-tint text-info' },
  maps: { icon: MapPin, className: 'bg-good-tint text-good' },
  inperson: { icon: Users, className: 'bg-[#F3E8FF] text-[#7E22CE]' },
  upwork: { icon: Laptop, className: 'bg-[#ECFCCB] text-[#3F6212]' },
  other: { icon: CircleDot, className: 'bg-muted text-ink-2' },
}

export const SOURCE_META: Record<LeadSource, { label: string; icon: LucideIcon; className: string }> = Object.fromEntries(
  LEAD_SOURCES.map((s) => [s, { label: SOURCE_LABELS[s], ...SOURCE_STYLE[s] }]),
) as Record<LeadSource, { label: string; icon: LucideIcon; className: string }>

/** Stage labels follow the design ("Meeting booked"). */
export const STAGE_META: Record<LeadStage, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-muted text-ink-2' },
  contacted: { label: 'Contacted', className: 'bg-info-tint text-info' },
  replied: { label: 'Replied', className: 'bg-brand-tint text-brand' },
  meeting: { label: 'Meeting booked', className: 'bg-warn-tint text-warn' },
  proposal: { label: 'Proposal', className: 'bg-[#FCE7F3] text-[#BE185D]' },
  won: { label: 'Won', className: 'bg-good-tint text-good' },
  lost: { label: 'Lost', className: 'bg-bad-tint text-bad' },
}
