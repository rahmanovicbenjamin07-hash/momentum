import { describe, expect, it } from 'vitest'
import { addLeadFormSchema } from '@/schemas/outreach'
import {
  fillTemplate,
  findDuplicate,
  firstName,
  followUpState,
  initials,
  leadToContact,
  nextFollowUp,
  normalizeUrl,
  proposalToStage,
  toHttpUrl,
} from './outreach'

describe('nextFollowUp', () => {
  it('adds the stage delay', () => {
    expect(nextFollowUp('contacted', '2026-10-28')).toBe('2026-10-31')
    expect(nextFollowUp('replied', '2026-10-28')).toBe('2026-10-30')
    expect(nextFollowUp('meeting', '2026-10-28')).toBe('2026-10-29')
    expect(nextFollowUp('proposal', '2026-10-30')).toBe('2026-11-02')
  })

  it('has no follow-up for new, won and lost', () => {
    expect(nextFollowUp('new', '2026-10-28')).toBeNull()
    expect(nextFollowUp('won', '2026-10-28')).toBeNull()
    expect(nextFollowUp('lost', '2026-10-28')).toBeNull()
  })
})

describe('followUpState', () => {
  const today = '2026-10-28'
  it('handles no date, today, upcoming and late', () => {
    expect(followUpState(null, today)).toEqual({ kind: 'none' })
    expect(followUpState(undefined, today)).toEqual({ kind: 'none' })
    expect(followUpState('2026-10-28', today)).toEqual({ kind: 'today' })
    expect(followUpState('2026-10-31', today)).toEqual({ kind: 'upcoming', days: 3 })
    expect(followUpState('2026-10-25', today)).toEqual({ kind: 'late', days: 3 })
  })

  it('counts calendar days across month and DST change', () => {
    expect(followUpState('2026-09-30', today)).toEqual({ kind: 'late', days: 28 })
    expect(followUpState('2026-10-24', '2026-10-26')).toEqual({ kind: 'late', days: 2 })
  })
})

describe('proposalToStage', () => {
  it('maps Upwork proposal status to a stage', () => {
    expect(proposalToStage('sent')).toBe('contacted')
    expect(proposalToStage('viewed')).toBe('contacted')
    expect(proposalToStage('interview')).toBe('meeting')
    expect(proposalToStage('hired')).toBe('won')
  })
})

describe('initials / firstName', () => {
  it('builds avatar initials', () => {
    expect(initials('Lejla Hodžić')).toBe('LH')
    expect(initials('Dental Studio Smile')).toBe('DS')
    expect(initials('')).toBe('?')
  })

  it('takes the first word', () => {
    expect(firstName('  Lejla   Hodžić ')).toBe('Lejla')
    expect(firstName(null)).toBe('')
  })
})

describe('fillTemplate', () => {
  it('fills every {{first_name}}, with or without spaces', () => {
    expect(fillTemplate('Hi {{first_name}}! Bye {{ First_Name }}.', { name: 'Lejla Hodžić' })).toBe(
      'Hi Lejla! Bye Lejla.',
    )
  })

  it('falls back to "there" and keeps unknown placeholders', () => {
    expect(fillTemplate('Hi {{first_name}}, {{company}}', { name: '' })).toBe('Hi there, {{company}}')
  })

  it('does not treat $ in names as a replacement pattern', () => {
    expect(fillTemplate('Hi {{first_name}}', { name: '$& Co' })).toBe('Hi $&')
  })
})

describe('toHttpUrl', () => {
  it('adds https:// when missing', () => {
    expect(toHttpUrl('linkedin.com/in/lejla')).toBe('https://linkedin.com/in/lejla')
    expect(toHttpUrl(' http://example.ba ')).toBe('http://example.ba/')
  })

  it('rejects non-links', () => {
    expect(toHttpUrl('')).toBeNull()
    expect(toHttpUrl('hello world')).toBeNull()
    expect(toHttpUrl('javascript:alert(1)')).toBeNull()
    expect(toHttpUrl('localhost')).toBeNull()
    expect(toHttpUrl('ftp://files.example.com')).toBeNull()
  })
})

describe('normalizeUrl', () => {
  it('ignores scheme, www, case of host, trailing slash, hash and tracking params', () => {
    const a = normalizeUrl('https://www.Example.ba/about/?utm_source=x#top')
    expect(a).toBe('example.ba/about')
    expect(normalizeUrl('example.ba/about')).toBe(a)
  })

  it('keeps meaningful query params, sorted', () => {
    expect(normalizeUrl('https://maps.google.com/?q=a&cid=123')).toBe('maps.google.com?cid=123&q=a')
  })

  it('folds LinkedIn country hosts and case', () => {
    expect(normalizeUrl('https://ba.linkedin.com/in/Lejla-H/?originalSubdomain=ba')).toBe('linkedin.com/in/lejla-h')
    expect(normalizeUrl('linkedin.com/in/lejla-h')).toBe('linkedin.com/in/lejla-h')
  })

  it('reduces Upwork job links to the job id', () => {
    expect(normalizeUrl('https://www.upwork.com/jobs/~01ABC123?source=rss')).toBe('upwork.com/jobs/~01abc123')
    expect(normalizeUrl('https://www.upwork.com/freelance-jobs/apply/React-dev_~01abc123/')).toBe(
      'upwork.com/jobs/~01abc123',
    )
  })

  it('returns null for empty or invalid', () => {
    expect(normalizeUrl(null)).toBeNull()
    expect(normalizeUrl('not a link')).toBeNull()
  })
})

describe('findDuplicate', () => {
  const contacts = [
    { id: '1', name: 'Lejla', email: 'Lejla@Mail.com', linkedin_url: 'https://www.linkedin.com/in/lejla-h/' },
    { id: '2', name: 'Smile', email: null, website: 'smile.ba', maps_url: null },
  ]

  it('matches email case-insensitively', () => {
    expect(findDuplicate({ email: ' lejla@mail.com ' }, contacts)).toEqual({ contact: contacts[0], field: 'email' })
  })

  it('matches normalised links, across link fields', () => {
    expect(findDuplicate({ linkedin_url: 'linkedin.com/in/Lejla-H' }, contacts)?.contact.id).toBe('1')
    expect(findDuplicate({ maps_url: 'https://smile.ba/' }, contacts)).toEqual({ contact: contacts[1], field: 'url' })
  })

  it('returns null when nothing matches or nothing to compare', () => {
    expect(findDuplicate({ email: 'new@mail.com', website: 'new.ba' }, contacts)).toBeNull()
    expect(findDuplicate({}, contacts)).toBeNull()
    expect(findDuplicate({ email: '', website: '' }, [{ id: '3', email: '', website: '' }])).toBeNull()
  })

  it('skips the contact being edited', () => {
    expect(findDuplicate({ id: '1', email: 'lejla@mail.com' }, contacts)).toBeNull()
  })
})

describe('leadToContact', () => {
  const today = '2026-10-28'
  const parse = (input: unknown) => addLeadFormSchema.parse(input)

  it('maps a LinkedIn lead with the chosen follow-up', () => {
    const lead = parse({ source: 'linkedin', name: 'Lejla Hodžić', linkedin_url: 'linkedin.com/in/lejla', follow_up: 'week' })
    expect(leadToContact(lead, today)).toEqual({
      source: 'linkedin',
      name: 'Lejla Hodžić',
      company: null,
      role: null,
      linkedin_url: 'https://linkedin.com/in/lejla',
      channel: 'linkedin',
      stage: 'new',
      next_follow_up: '2026-11-04',
      tags: [],
    })
  })

  it('tags Google Maps leads without a website', () => {
    const noSite = leadToContact(parse({ source: 'maps', name: 'Smile', phone: '+387 61 123 456', website: '' }), today)
    expect(noSite.tags).toEqual(['no-website'])
    expect(noSite.channel).toBe('phone')
    expect(noSite.next_follow_up).toBe('2026-10-31')
    const withSite = leadToContact(parse({ source: 'maps', name: 'Smile', website: 'smile.ba' }), today)
    expect(withSite.tags).toEqual([])
  })

  it('sets the Upwork stage from proposal status', () => {
    const job = { source: 'upwork', upwork_job_title: 'React dev', upwork_job_url: 'upwork.com/jobs/~01abc' }
    const interview = leadToContact(parse({ ...job, proposal_status: 'interview', follow_up: 'tomorrow' }), today)
    expect(interview).toMatchObject({ stage: 'meeting', name: 'React dev', next_follow_up: '2026-10-29' })
    const hired = leadToContact(parse({ ...job, client_name: 'Acme', proposal_status: 'hired' }), today)
    expect(hired).toMatchObject({ stage: 'won', name: 'Acme', next_follow_up: null })
  })

  it('prefers email as channel for in-person leads', () => {
    const lead = parse({ source: 'inperson', name: 'Amir', email: 'amir@mail.com', phone: '061 123 456' })
    expect(leadToContact(lead, today).channel).toBe('email')
  })
})
