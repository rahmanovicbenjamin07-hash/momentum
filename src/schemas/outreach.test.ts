import { describe, expect, it } from 'vitest'
import {
  addLeadFormSchema,
  contactSchema,
  logTouchFormSchema,
  stageHistorySchema,
  templateFormSchema,
  templateSchema,
  touchSchema,
  wonDealFormSchema,
} from './outreach'

const base = {
  id: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b',
  user_id: '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4',
  created_at: '2026-10-28T19:19:45.123456+00:00',
}
const otherId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

const errorsOf = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]))

describe('contactSchema', () => {
  const valid = {
    ...base,
    source: 'linkedin',
    name: 'Lejla Hodžić',
    company: 'Studio L',
    role: 'Founder',
    category: null,
    city: 'Sarajevo',
    phone: null,
    email: 'lejla@mail.com',
    website: null,
    linkedin_url: 'https://linkedin.com/in/lejla',
    maps_url: null,
    met_where: null,
    upwork_job_title: null,
    upwork_job_url: null,
    upwork_budget: null,
    connects_spent: null,
    proposal_status: null,
    stage: 'contacted',
    channel: 'linkedin',
    priority: 'medium',
    deal_value: 1500,
    won_amount: null,
    won_month: null,
    next_follow_up: '2026-10-31',
    last_touch_at: '2026-10-28T10:00:00+00:00',
    lost_reason: null,
    notes: [{ id: otherId, body: 'Likes short emails', created_at: base.created_at }],
    tags: ['design'],
  }

  it('accepts a database row', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects unknown enums, negative money and bad dates', () => {
    expect(contactSchema.safeParse({ ...valid, stage: 'closed' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, source: 'facebook' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, deal_value: -1 }).success).toBe(false)
    expect(contactSchema.safeParse({ ...valid, next_follow_up: '2026-02-30' }).success).toBe(false)
  })
})

describe('touch / stage history / template rows', () => {
  it('accept valid rows', () => {
    const touch = {
      ...base,
      contact_id: otherId,
      occurred_at: base.created_at,
      channel: 'email',
      direction: 'sent',
      template_id: null,
      body: 'Hi Lejla',
      got_reply: false,
    }
    expect(touchSchema.safeParse(touch).success).toBe(true)
    expect(touchSchema.safeParse({ ...touch, direction: 'forwarded' }).success).toBe(false)

    const history = { ...base, contact_id: otherId, from_stage: null, to_stage: 'new', changed_at: base.created_at }
    expect(stageHistorySchema.safeParse(history).success).toBe(true)

    const template = { ...base, name: 'First touch', channel: null, body: 'Hi {{first_name}}' }
    expect(templateSchema.safeParse(template).success).toBe(true)
    expect(templateSchema.safeParse({ ...template, body: '' }).success).toBe(false)
  })
})

describe('addLeadFormSchema', () => {
  it('LinkedIn: needs a name and a linkedin.com link; empty fields become undefined', () => {
    const ok = addLeadFormSchema.parse({
      source: 'linkedin',
      name: ' Lejla ',
      company: '',
      role: '',
      linkedin_url: 'linkedin.com/in/lejla',
    })
    expect(ok).toEqual({
      source: 'linkedin',
      name: 'Lejla',
      company: undefined,
      role: undefined,
      linkedin_url: 'https://linkedin.com/in/lejla',
      follow_up: '3_days',
    })

    const bad = addLeadFormSchema.safeParse({ source: 'linkedin', name: '', linkedin_url: 'twitter.com/lejla' })
    expect(errorsOf(bad)).toEqual({ name: 'Enter their name', linkedin_url: 'Use a linkedin.com link' })
  })

  it('Google Maps: website and Maps link are optional but validated', () => {
    expect(addLeadFormSchema.safeParse({ source: 'maps', name: 'Smile', website: '', maps_url: '' }).success).toBe(true)
    expect(
      addLeadFormSchema.safeParse({ source: 'maps', name: 'Smile', maps_url: 'https://maps.app.goo.gl/abc' }).success,
    ).toBe(true)
    const bad = addLeadFormSchema.safeParse({ source: 'maps', name: 'Smile', website: 'not a site', phone: 'abc' })
    expect(errorsOf(bad)).toEqual({ website: 'Enter a valid link', phone: 'Enter a valid phone number' })
  })

  it('In person: needs a phone or an email', () => {
    expect(errorsOf(addLeadFormSchema.safeParse({ source: 'inperson', name: 'Amir', phone: '', email: '' }))).toEqual({
      phone: 'Add a phone number or email',
    })
    expect(addLeadFormSchema.safeParse({ source: 'inperson', name: 'Amir', phone: '+387 61 123 456' }).success).toBe(
      true,
    )
    expect(errorsOf(addLeadFormSchema.safeParse({ source: 'inperson', name: 'Amir', email: 'amir@' }))).toMatchObject({
      email: 'Enter a valid email address',
    })
  })

  it('Upwork: parses numbers from inputs and defaults status to sent', () => {
    const ok = addLeadFormSchema.parse({
      source: 'upwork',
      upwork_job_title: 'React dev',
      client_name: '',
      upwork_budget: '500',
      connects_spent: Number.NaN,
      upwork_job_url: 'https://www.upwork.com/jobs/~01abc',
    })
    expect(ok).toMatchObject({ upwork_budget: 500, connects_spent: undefined, proposal_status: 'sent' })

    const bad = addLeadFormSchema.safeParse({
      source: 'upwork',
      upwork_job_title: 'React dev',
      upwork_budget: -5,
      connects_spent: 2.5,
      upwork_job_url: 'example.com/job',
      proposal_status: 'declined',
    })
    expect(Object.keys(errorsOf(bad)).sort()).toEqual([
      'connects_spent',
      'proposal_status',
      'upwork_budget',
      'upwork_job_url',
    ])
  })

  it('rejects unknown sources, unknown follow-ups and long text', () => {
    expect(addLeadFormSchema.safeParse({ source: 'fax', name: 'X' }).success).toBe(false)
    expect(
      addLeadFormSchema.safeParse({ source: 'other', name: 'X', follow_up: 'someday' }).success,
    ).toBe(false)
    expect(addLeadFormSchema.safeParse({ source: 'other', name: 'x'.repeat(121) }).success).toBe(false)
  })

  it('rejects javascript: links', () => {
    expect(addLeadFormSchema.safeParse({ source: 'other', name: 'X', website: 'javascript:alert(1)' }).success).toBe(
      false,
    )
  })
})

describe('logTouchFormSchema', () => {
  it('allows a blank sent message but not a blank note', () => {
    expect(logTouchFormSchema.parse({ channel: 'email', direction: 'sent', body: '', template_id: '' })).toEqual({
      channel: 'email',
      direction: 'sent',
      body: undefined,
      template_id: undefined,
      got_reply: false,
    })
    expect(errorsOf(logTouchFormSchema.safeParse({ channel: 'phone', direction: 'note', body: '  ' }))).toEqual({
      body: 'Write the note',
    })
  })

  it('rejects a bad template id', () => {
    expect(logTouchFormSchema.safeParse({ channel: 'email', direction: 'sent', template_id: 'abc' }).success).toBe(false)
  })
})

describe('wonDealFormSchema', () => {
  it('needs an amount above 0 and a month', () => {
    expect(wonDealFormSchema.parse({ amount: '1200.50', month: '2026-10' })).toEqual({ amount: 1200.5, month: '2026-10' })
    expect(errorsOf(wonDealFormSchema.safeParse({ amount: 0, month: '2026-13' }))).toEqual({
      amount: 'Amount must be more than 0',
      month: 'Pick a month',
    })
    expect(errorsOf(wonDealFormSchema.safeParse({ amount: '', month: '2026-10' }))).toEqual({
      amount: 'Enter the amount',
    })
  })
})

describe('templateFormSchema', () => {
  it('needs a name and body; channel is optional', () => {
    expect(templateFormSchema.parse({ name: 'Intro', channel: '', body: 'Hi {{first_name}}' })).toEqual({
      name: 'Intro',
      channel: undefined,
      body: 'Hi {{first_name}}',
    })
    expect(templateFormSchema.safeParse({ name: '', body: 'x'.repeat(5001) }).success).toBe(false)
  })
})
