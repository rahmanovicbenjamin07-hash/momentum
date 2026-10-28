import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { LoginCard } from '@/components/auth/LoginCard'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Flame } from '@/components/streak/Flame'
import { TodayHeader } from '@/components/today/TodayHeader'
import { TodayLayout } from '@/components/today/TodayLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STREAK_LEVELS } from '@/lib/streak-levels'
import { mockSidebar, mockUnreadCount, mockUser } from '@/mocks/shell'

/**
 * Development-only gallery (/dev). Every UI component is shown here with mock data.
 * Not included in production builds.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-semibold tracking-wider text-ink-3 uppercase">{title}</h2>
      {children}
    </section>
  )
}

const log = (label: string) => (value?: unknown) =>
  toast(`${label}${value === undefined ? '' : `: ${JSON.stringify(value)}`}`)

const sampleDate = new Date('2026-10-28T10:00:00Z')

/** Dashed box standing in for a card that a later step builds. */
function Placeholder({ label, className = 'h-24' }: { label: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-xl border border-dashed border-border bg-card text-xs text-ink-3 ${className}`}>
      {label}
    </div>
  )
}

/** "1–9 days", "100+ days" … from the level's minimum and the next level's minimum. */
function levelRange(minDays: number, nextMinDays: number | undefined) {
  if (nextMinDays === undefined) return `${minDays}+ days`
  if (nextMinDays - 1 === minDays) return `${minDays} days`
  return `${minDays}–${nextMinDays - 1} days`
}

const swatches = [
  ['Page', 'bg-background'],
  ['Card', 'bg-card'],
  ['Border', 'bg-border'],
  ['Text', 'bg-foreground'],
  ['Text 2', 'bg-ink-2'],
  ['Text 3', 'bg-ink-3'],
  ['Accent', 'bg-brand'],
  ['Accent tint', 'bg-brand-tint'],
  ['Top bar', 'bg-topbar'],
  ['Good', 'bg-good'],
  ['Warn', 'bg-warn'],
  ['Bad', 'bg-bad'],
  ['Info', 'bg-info'],
] as const

export default function DevPreview() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
        <PageHeader eyebrow="Development only" title="Component preview" />

        <Section title="TopBar">
          <div className="overflow-hidden rounded-xl border border-border">
            <TopBar
              user={mockUser}
              unreadCount={mockUnreadCount}
              onSearch={log('search')}
              onNew={log('new')}
              onNotifications={log('notifications')}
              onSignOut={log('sign out')}
            />
          </div>
        </Section>

        <Section title="Sidebar (with badges and streak / empty)">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="overflow-hidden rounded-xl border border-border">
              <Sidebar {...mockSidebar} />
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <Sidebar />
            </div>
          </div>
        </Section>

        <Section title="PageHeader">
          <div className="rounded-xl border border-dashed border-border p-4">
            <PageHeader
              eyebrow="Wednesday, 28 October 2026"
              title="Today"
              actions={
                <>
                  <Button variant="outline">Today</Button>
                  <Button variant="outline">Week view</Button>
                </>
              }
            />
          </div>
        </Section>

        <Section title="TodayHeader">
          <div className="rounded-xl border border-dashed border-border p-4">
            <TodayHeader
              date={sampleDate}
              onPrevDay={log('previous day')}
              onToday={log('today')}
              onNextDay={log('next day')}
              onWeekView={log('week view')}
            />
          </div>
        </Section>

        <Section title="TodayLayout (narrow the window: aside drops under main below 1024px)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <TodayLayout
              topCards={
                <>
                  <Placeholder label="Today's progress" />
                  <Placeholder label="Current streak" />
                  <Placeholder label="Outreaches this week" />
                </>
              }
              quickAdd={<Placeholder label="Quick add" className="h-20" />}
              main={
                <>
                  <Placeholder label="Missed yesterday" />
                  <Placeholder label="Overdue" className="h-16" />
                  <Placeholder label="Today's tasks" className="h-64" />
                </>
              }
              aside={
                <>
                  <Placeholder label="This week" className="h-48" />
                  <Placeholder label="Daily note" className="h-40" />
                </>
              }
            />
          </div>
        </Section>

        <Section title="Flame (all six streak levels)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STREAK_LEVELS.map((level, i) => (
              <div key={level.id} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
                <Flame level={level.id} />
                <p className="text-[13px] font-semibold text-foreground">{level.name}</p>
                <p className="text-xs text-ink-3">{levelRange(level.minDays, STREAK_LEVELS[i + 1]?.minDays)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
            <Flame level="flame" size={24} />
            <Flame level="flame" size={40} />
            <Flame level="flame" size={64} />
            <Flame level="legend" />
            <Flame level="legend" sparkles={false} />
            <span className="text-xs text-ink-3">Sizes 24 / 40 / 64 / 96 · Legend with and without sparkles</span>
          </div>
        </Section>

        <Section title="EmptyState">
          <EmptyState title="No contacts yet" description="Client outreach and follow-ups arrive in a later phase.">
            <Button>Add contact</Button>
          </EmptyState>
        </Section>

        <Section title="LoginCard (type an email with 'fail' to see an error)">
          <div className="grid place-items-center rounded-xl border border-dashed border-border py-8">
            <LoginCard
              onSendLink={async (email) => {
                await new Promise((resolve) => setTimeout(resolve, 600))
                if (email.includes('fail')) throw new Error('Too many sign-in emails were sent. Wait a few minutes and try again.')
              }}
              onGoogle={async () => {
                log('google')()
              }}
            />
          </div>
        </Section>

        <Section title="Colour tokens">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">
            {swatches.map(([name, cls]) => (
              <div key={name} className="text-xs text-ink-2">
                <div className={`mb-1 h-10 rounded-lg border border-border ${cls}`} />
                {name}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Primitives">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              <Button>Add task</Button>
              <Button variant="outline">Move to today</Button>
              <Button variant="ghost">Drop</Button>
              <Button variant="destructive">Delete</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-good-tint text-good">Done</Badge>
              <Badge className="bg-warn-tint text-warn">Overdue · 1</Badge>
              <Badge className="bg-bad-tint text-bad">High</Badge>
              <Badge className="bg-info-tint text-info">Work</Badge>
              <Badge className="bg-brand-tint text-brand">Outreach</Badge>
            </div>
            <div className="grid max-w-sm gap-1.5">
              <Label htmlFor="dev-input">Task</Label>
              <Input id="dev-input" placeholder="e.g. Call Amir about the website #outreach !high" />
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
