import { describe, expect, it } from 'vitest'
import type { Contact } from '@/schemas/outreach'
import { countsBySource, countsByStage, filterContacts, foldText, isFollowUpDue, weekOutreachCount } from './outreachList'

type Row = Pick<Contact, 'source' | 'stage' | 'name' | 'next_follow_up'> & Partial<Contact>

const contacts: Row[] = [
  { name: 'Lejla Hodžić', source: 'linkedin', stage: 'contacted', next_follow_up: '2026-10-28', company: 'Studio L' },
  { name: 'Smile Dental', source: 'maps', stage: 'new', next_follow_up: '2026-10-25', city: 'Sarajevo', tags: ['no-website'] },
  { name: 'Amir Đulić', source: 'inperson', stage: 'meeting', next_follow_up: '2026-11-02', email: 'amir@mail.com' },
  { name: 'React dev', source: 'upwork', stage: 'won', next_follow_up: '2026-10-20', upwork_job_title: 'React dashboard' },
  { name: 'Old lead', source: 'linkedin', stage: 'lost', next_follow_up: null },
]
const today = '2026-10-28'

describe('countsBySource / countsByStage', () => {
  it('counts every source and stage, zeros included', () => {
    expect(countsBySource(contacts)).toEqual({ all: 5, linkedin: 2, maps: 1, inperson: 1, upwork: 1, other: 0 })
    expect(countsByStage(contacts)).toEqual({
      new: 1,
      contacted: 1,
      replied: 0,
      meeting: 1,
      proposal: 0,
      won: 1,
      lost: 1,
    })
  })

  it('works on an empty list', () => {
    expect(countsBySource([]).all).toBe(0)
    expect(countsByStage([]).new).toBe(0)
  })
})

describe('foldText', () => {
  it('drops case and accents, including đ', () => {
    expect(foldText('Hodžić ĐULIĆ Čaršija')).toBe('hodzic dulic carsija')
  })
})

describe('isFollowUpDue', () => {
  it('is true for today or late, but never for won/lost', () => {
    expect(isFollowUpDue({ stage: 'contacted', next_follow_up: today }, today)).toBe(true)
    expect(isFollowUpDue({ stage: 'new', next_follow_up: '2026-10-25' }, today)).toBe(true)
    expect(isFollowUpDue({ stage: 'meeting', next_follow_up: '2026-11-02' }, today)).toBe(false)
    expect(isFollowUpDue({ stage: 'won', next_follow_up: '2026-10-20' }, today)).toBe(false)
    expect(isFollowUpDue({ stage: 'new', next_follow_up: null }, today)).toBe(false)
  })
})

describe('filterContacts', () => {
  const names = (filters: Parameters<typeof filterContacts>[1]) =>
    filterContacts(contacts, filters, today).map((c) => c.name)

  it('returns everything with no filters', () => {
    expect(names({})).toHaveLength(5)
    expect(names({ source: 'all', stage: 'all', search: '  ' })).toHaveLength(5)
  })

  it('filters by source and stage', () => {
    expect(names({ source: 'linkedin' })).toEqual(['Lejla Hodžić', 'Old lead'])
    expect(names({ source: 'linkedin', stage: 'lost' })).toEqual(['Old lead'])
    expect(names({ stage: 'meeting' })).toEqual(['Amir Đulić'])
  })

  it('searches without caring about case or accents, all words must match', () => {
    expect(names({ search: 'hodzic' })).toEqual(['Lejla Hodžić'])
    expect(names({ search: 'dulic' })).toEqual(['Amir Đulić'])
    expect(names({ search: 'SMILE sarajevo' })).toEqual(['Smile Dental'])
    expect(names({ search: 'smile zenica' })).toEqual([])
  })

  it('searches company, email, tags and Upwork job title', () => {
    expect(names({ search: 'studio' })).toEqual(['Lejla Hodžić'])
    expect(names({ search: 'amir@mail' })).toEqual(['Amir Đulić'])
    expect(names({ search: 'no-website' })).toEqual(['Smile Dental'])
    expect(names({ search: 'dashboard' })).toEqual(['React dev'])
  })

  it('"Follow-up due" keeps today and late open leads', () => {
    expect(names({ dueOnly: true })).toEqual(['Lejla Hodžić', 'Smile Dental'])
    expect(names({ dueOnly: true, source: 'maps' })).toEqual(['Smile Dental'])
  })
})

describe('weekOutreachCount', () => {
  // Wed 28 Oct 2026 → week is Mon 26 Oct – Sun 1 Nov.
  const touch = (occurred_at: string, direction: 'sent' | 'received' | 'note' = 'sent') => ({ occurred_at, direction })

  it('counts sent touches from Monday to Sunday', () => {
    const touches = [
      touch('2026-10-26T08:00:00+00:00'),
      touch('2026-10-28T12:00:00+00:00'),
      touch('2026-11-01T20:00:00+00:00'),
      touch('2026-10-28T12:00:00+00:00', 'received'),
      touch('2026-10-28T12:00:00+00:00', 'note'),
      touch('2026-10-25T12:00:00+00:00'),
      touch('2026-11-02T08:00:00+00:00'),
    ]
    expect(weekOutreachCount(touches, today)).toBe(3)
  })

  it('uses the Sarajevo calendar day, not UTC', () => {
    // 23:30 UTC on Sun 25 Oct = 00:30 Mon 26 Oct in Sarajevo (CET, after DST ended).
    expect(weekOutreachCount([touch('2026-10-25T23:30:00Z')], today)).toBe(1)
    // 23:30 UTC on Sun 1 Nov = 00:30 Mon 2 Nov in Sarajevo → next week.
    expect(weekOutreachCount([touch('2026-11-01T23:30:00Z')], today)).toBe(0)
  })

  it('is 0 with no touches', () => {
    expect(weekOutreachCount([], today)).toBe(0)
  })
})
