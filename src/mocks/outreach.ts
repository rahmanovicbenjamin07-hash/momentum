import type { CsvPreview } from '@/components/outreach/CsvImportDialog'
import type { LeadSource, LeadStage } from '@/components/outreach/meta'
import type { TemplateItem } from '@/components/outreach/TemplatesDialog'
import type { LinkedTask } from '@/components/contact/LinkedTasks'
import type { DateKey } from '@/lib/dates'
import type { Contact, Touch } from '@/schemas/outreach'

/** Mock data from design/outreach.png and design/outreach-board.png (today is Wednesday 28 Oct 2026). */

export const MOCK_OUTREACH_TODAY: DateKey = '2026-10-28'

const MOCK_USER_ID = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'
const CREATED_AT = '2026-10-01T08:00:00+00:00'

/** Fixed, valid UUIDs so React keys and tests stay stable. */
const uuid = (n: number) => `00000000-0000-4000-8000-${String(200 + n).padStart(12, '0')}`

function contact(n: number, fields: Partial<Contact> & Pick<Contact, 'name' | 'source' | 'stage'>): Contact {
  return {
    id: uuid(n),
    user_id: MOCK_USER_ID,
    created_at: CREATED_AT,
    company: null,
    role: null,
    category: null,
    city: null,
    phone: null,
    email: null,
    website: null,
    linkedin_url: null,
    maps_url: null,
    met_where: null,
    upwork_job_title: null,
    upwork_job_url: null,
    upwork_budget: null,
    connects_spent: null,
    proposal_status: null,
    channel: null,
    priority: 'medium',
    deal_value: null,
    won_amount: null,
    won_month: null,
    next_follow_up: null,
    last_touch_at: null,
    lost_reason: null,
    notes: [],
    tags: [],
    ...fields,
  }
}

/** The eight leads in the design, in the same order. */
export const mockContacts: Contact[] = [
  contact(1, {
    name: 'Emir Kovač',
    source: 'linkedin',
    stage: 'replied',
    role: 'Founder',
    company: 'Bloom Studio',
    linkedin_url: 'https://www.linkedin.com/in/emir-kovac',
    channel: 'linkedin',
    last_touch_at: '2026-10-25T09:30:00+00:00',
    next_follow_up: '2026-10-28',
    deal_value: 1200,
  }),
  contact(2, {
    name: 'Nova Dental',
    source: 'maps',
    stage: 'proposal',
    category: 'Dentist',
    city: 'Sarajevo',
    email: 'info@novadental.ba',
    website: 'https://novadental.ba',
    channel: 'email',
    last_touch_at: '2026-10-27T14:00:00+00:00',
    next_follow_up: '2026-10-27',
    deal_value: 2400,
  }),
  contact(3, {
    name: 'Shopify store redesign',
    source: 'upwork',
    stage: 'contacted',
    upwork_job_title: 'Shopify store redesign',
    upwork_job_url: 'https://www.upwork.com/jobs/~01a2b3c4d5e6f7a8b9',
    upwork_budget: 800,
    connects_spent: 12,
    proposal_status: 'viewed',
    channel: 'upwork',
    last_touch_at: '2026-10-26T11:00:00+00:00',
    next_follow_up: '2026-10-30',
    deal_value: 740,
  }),
  contact(4, {
    name: 'Sara Begić',
    source: 'inperson',
    stage: 'meeting',
    company: 'Atelier Sara',
    met_where: 'Startup Meetup',
    phone: '+387 61 234 567',
    channel: 'phone',
    last_touch_at: '2026-10-28T08:15:00+00:00',
    next_follow_up: '2026-10-28',
    deal_value: 1500,
  }),
  contact(5, {
    name: 'Mostar Tours',
    source: 'maps',
    stage: 'contacted',
    category: 'Travel agency',
    city: 'Mostar',
    phone: '+387 36 555 120',
    channel: 'phone',
    tags: ['no-website'],
    last_touch_at: '2026-10-24T10:00:00+00:00',
    next_follow_up: '2026-10-26',
    deal_value: 700,
  }),
  contact(6, {
    name: 'React dashboard for a logistics startup',
    source: 'upwork',
    stage: 'meeting',
    upwork_job_title: 'React dashboard for a logistics startup',
    upwork_job_url: 'https://www.upwork.com/jobs/~019f8e7d6c5b4a3921',
    upwork_budget: 2000,
    connects_spent: 16,
    proposal_status: 'interview',
    channel: 'upwork',
    last_touch_at: '2026-10-27T16:45:00+00:00',
    next_follow_up: '2026-10-29',
    deal_value: 2100,
  }),
  contact(7, {
    name: 'Fitbox Gym',
    source: 'maps',
    stage: 'won',
    category: 'Gym',
    city: 'Sarajevo',
    channel: 'inperson',
    last_touch_at: '2026-10-14T12:00:00+00:00',
    deal_value: 3000,
    won_amount: 3000,
    won_month: '2026-10-01',
  }),
  contact(8, {
    name: 'Daniel Weber',
    source: 'linkedin',
    stage: 'new',
    role: 'Marketing lead',
    company: 'Kraft & Co',
    linkedin_url: 'https://www.linkedin.com/in/daniel-weber',
    channel: 'linkedin',
    next_follow_up: '2026-11-03',
  }),
]

export const mockOutreachSummary = {
  leadCount: 38,
  followUpsDue: 4,
  openPipeline: 18_400,
}

export const mockSourceCounts: Record<LeadSource, number> = {
  linkedin: 12,
  maps: 14,
  inperson: 5,
  upwork: 7,
  other: 0,
}

export const mockStageCounts: Record<LeadStage, number> = {
  new: 9,
  contacted: 13,
  replied: 6,
  meeting: 4,
  proposal: 3,
  won: 2,
  lost: 1,
}

/** Follow-up dates covering every look: today, late, later, none. */
export const mockFollowUps: { label: string; date: DateKey | null }[] = [
  { label: 'Today', date: '2026-10-28' },
  { label: '1 day late', date: '2026-10-27' },
  { label: '2 days late', date: '2026-10-26' },
  { label: 'Tomorrow', date: '2026-10-29' },
  { label: 'Friday', date: '2026-10-30' },
  { label: 'Next week', date: '2026-11-03' },
  { label: 'None', date: null },
]

export const mockTemplates: TemplateItem[] = [
  {
    id: uuid(101),
    name: 'LinkedIn first message',
    channel: 'linkedin',
    body: 'Hi {{first_name}}, I liked what you’re building at your studio. I build fast websites for small teams — would a quick chat next week be useful?',
  },
  {
    id: uuid(102),
    name: 'No website — call script',
    channel: 'phone',
    body: 'Hi {{first_name}}, I found you on Google Maps and noticed you don’t have a website yet. I can show you a simple one-page example for your business.',
  },
  {
    id: uuid(103),
    name: 'Follow-up after 3 days',
    channel: null,
    body: 'Hi {{first_name}}, just bumping this up in case it got buried. Happy to send a short example if that helps.',
  },
  {
    id: uuid(104),
    name: 'Opener A',
    channel: 'linkedin',
    body: 'Hi {{first_name}}, congrats on the new studio launch. I noticed the booking page is slow on mobile. I help studios fix exactly that. Open to a 15-minute call?',
  },
  {
    id: uuid(105),
    name: 'Follow-up #1',
    channel: 'linkedin',
    body: 'Hi {{first_name}}, following up on my note from last week. Happy to share a quick audit of your booking page on mobile, no strings attached.',
  },
]

/** What a parsed CSV could look like: some good rows and a few errors. */
export const mockCsvPreview: CsvPreview = {
  rows: [
    { line: 2, name: 'Lejla Hodžić', source: 'linkedin', detail: 'Designer · Pixel Lab' },
    { line: 3, name: 'Café Rondo', source: 'maps', detail: 'Café · Sarajevo · no website' },
    { line: 4, name: 'Adnan Mehić', source: 'inperson', detail: 'Mehić Auto · adnan@mehic.ba' },
    { line: 6, name: 'Webflow landing page', source: 'upwork', detail: '€400 budget' },
  ],
  errors: [
    { line: 5, message: 'Missing name' },
    { line: 7, message: 'Unknown source "facebook" (use linkedin, maps, inperson, upwork or other)' },
  ],
}

// ---------------------------------------------------------------------------
// Contact page (design/contact.png, design/contact-won.png)
// ---------------------------------------------------------------------------

const note = (n: number, body: string) => ({ id: uuid(300 + n), body, created_at: '2026-10-14T09:00:00+00:00' })

/** Emir Kovač with everything the contact page shows. */
export const mockContactDetail: Contact = {
  ...mockContacts[0]!,
  created_at: '2026-10-14T09:00:00+00:00',
  city: 'Sarajevo',
  email: 'emir.kovac@example.com',
  phone: '+387 61 000 000',
  website: 'https://bloom-studio.example',
  priority: 'high',
  tags: ['agency', 'warm'],
  last_touch_at: '2026-10-25T15:42:00+00:00',
  notes: [
    note(1, 'Pain: booking page is slow on mobile; customers drop off at the payment step.'),
    note(2, 'Angle: show the Atelier Sara booking rebuild as a case study.'),
    note(3, 'Decision: Emir decides; co-founder Nina owns the budget.'),
    note(4, '[x] Send 2–3 examples'),
    note(5, '[ ] Prepare a mini audit of the booking page'),
  ],
}

/** The same lead after the deal was won. */
export const mockWonContact: Contact = {
  ...mockContactDetail,
  stage: 'won',
  next_follow_up: null,
}

const touch = (n: number, fields: Pick<Touch, 'occurred_at' | 'direction' | 'body'> & Partial<Touch>): Touch => ({
  id: uuid(400 + n),
  user_id: MOCK_USER_ID,
  created_at: fields.occurred_at,
  contact_id: mockContactDetail.id,
  channel: 'linkedin',
  template_id: null,
  got_reply: false,
  ...fields,
})

/** Emir's timeline, oldest first (the Timeline sorts newest first itself). */
export const mockTouches: Touch[] = [
  touch(1, {
    occurred_at: '2026-10-14T09:00:00+00:00',
    direction: 'note',
    body: 'Found via LinkedIn search for design studios in Sarajevo. Small team. Booking site slow on mobile.',
  }),
  touch(2, {
    occurred_at: '2026-10-15T08:03:00+00:00',
    direction: 'sent',
    template_id: uuid(104),
    body: 'Hi Emir, congrats on the new studio launch. I noticed the booking page is slow on mobile. I help studios fix exactly that. Open to a 15-minute call?',
  }),
  touch(3, {
    occurred_at: '2026-10-22T07:15:00+00:00',
    direction: 'sent',
    template_id: uuid(105),
    body: 'Hi Emir, following up on my note from last week. Happy to share a quick audit of your booking page on mobile, no strings attached.',
  }),
  touch(4, {
    occurred_at: '2026-10-25T15:42:00+00:00',
    direction: 'received',
    got_reply: true,
    body: 'Thanks for reaching out, interesting timing. We are rebuilding our booking flow this winter. Could you send two or three examples of similar work?',
  }),
]

export const mockLinkedTasks: LinkedTask[] = [
  { id: uuid(501), title: 'Follow up with Emir Kovač', due_date: '2026-10-28', time: '10:30:00', status: 'todo' },
  { id: uuid(502), title: 'Send booking rebuild examples', due_date: '2026-10-26', time: null, status: 'done' },
]
