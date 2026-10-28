import { describe, expect, it } from 'vitest'
import type { Contact } from '@/schemas/outreach'
import {
  CSV_BOM,
  contactsToCsv,
  detectDelimiter,
  mapHeader,
  parseContactsCsv,
  parseDateCell,
  parseLooseNumber,
  readCsv,
  type CsvKey,
} from './csv'

const blank: Pick<Contact, CsvKey> = {
  name: '',
  source: 'other',
  stage: 'new',
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
  lost_reason: null,
  tags: [],
}

describe('readCsv', () => {
  it('handles quotes, commas, doubled quotes and line breaks inside cells', () => {
    const text = 'a,b,c\r\n"x, y","say ""hi""","line1\nline2"\n1,,3'
    expect(readCsv(text).records).toEqual([
      { line: 1, cells: ['a', 'b', 'c'] },
      { line: 2, cells: ['x, y', 'say "hi"', 'line1\nline2'] },
      { line: 4, cells: ['1', '', '3'] },
    ])
  })

  it('strips a BOM and supports ; separators', () => {
    expect(readCsv(`${CSV_BOM}a;b\n1;2\n`).records).toEqual([
      { line: 1, cells: ['a', 'b'] },
      { line: 2, cells: ['1', '2'] },
    ])
  })

  it('reports an unclosed quote', () => {
    expect(readCsv('a,b\n1,"oops\n2,3').unclosedQuoteLine).toBe(2)
  })
})

describe('detectDelimiter', () => {
  it('picks the most common separator in the header', () => {
    expect(detectDelimiter('Name;Email;Phone\nA,B;c;d')).toBe(';')
    expect(detectDelimiter('Name,Email\n')).toBe(',')
    expect(detectDelimiter('"Name;x",Email')).toBe(',')
    expect(detectDelimiter('Name')).toBe(',')
  })
})

describe('mapHeader', () => {
  it('matches our headers, field keys and common aliases', () => {
    expect(mapHeader('LinkedIn URL')).toBe('linkedin_url')
    expect(mapHeader('linkedin_url')).toBe('linkedin_url')
    expect(mapHeader(' E-mail ')).toBe('email')
    expect(mapHeader('Business name')).toBe('name')
    expect(mapHeader('Next follow-up')).toBe('next_follow_up')
    expect(mapHeader('Favourite colour')).toBeNull()
  })
})

describe('parseLooseNumber / parseDateCell', () => {
  it('reads European and US number formats', () => {
    expect(parseLooseNumber('1500')).toBe(1500)
    expect(parseLooseNumber('1.500,50')).toBe(1500.5)
    expect(parseLooseNumber('1,500.50')).toBe(1500.5)
    expect(parseLooseNumber('1,500')).toBe(1500)
    expect(parseLooseNumber('€ 1 200')).toBe(1200)
    expect(parseLooseNumber('12,5')).toBe(12.5)
    expect(parseLooseNumber('abc')).toBeNaN()
  })

  it('reads common date formats and rejects impossible ones', () => {
    expect(parseDateCell('2026-10-28')).toBe('2026-10-28')
    expect(parseDateCell('28.10.2026.')).toBe('2026-10-28')
    expect(parseDateCell('3/11/2026')).toBe('2026-11-03')
    expect(parseDateCell('28 Oct 2026')).toBe('2026-10-28')
    expect(parseDateCell('30.02.2026')).toBeNull()
    expect(parseDateCell('tomorrow')).toBeNull()
  })
})

describe('contactsToCsv', () => {
  it('writes a header row and escapes cells', () => {
    const csv = contactsToCsv([
      {
        ...blank,
        name: 'Hodžić, Lejla',
        source: 'maps',
        stage: 'contacted',
        city: 'Say "hi"',
        phone: '+387 61 123 456',
        channel: 'whatsapp',
        deal_value: 1500,
        won_month: '2026-10-01',
        tags: ['no-website', 'dentist'],
      },
    ])
    const [header, row, end] = csv.split('\r\n')
    expect(header?.startsWith('Name,Source,Stage,Company')).toBe(true)
    expect(row).toContain('"Hodžić, Lejla",Google Maps,Contacted')
    expect(row).toContain('"Say ""hi"""')
    expect(row).toContain(",'+387 61 123 456,") // Excel would treat "+…" as a formula
    expect(row).toContain('WhatsApp')
    expect(row).toContain(',1500,')
    expect(row).toContain(',2026-10,')
    expect(row).toContain('"no-website; dentist"')
    expect(end).toBe('')
  })

  it('neutralises formula injection', () => {
    expect(contactsToCsv([{ ...blank, name: '=HYPERLINK("x")' }])).toContain(`"'=HYPERLINK(""x"")"`)
  })
})

describe('parseContactsCsv', () => {
  it('round-trips our own export', () => {
    const original = {
      ...blank,
      name: 'Hodžić, Lejla',
      source: 'linkedin' as const,
      stage: 'replied' as const,
      phone: '+387 61 123 456',
      linkedin_url: 'https://linkedin.com/in/lejla',
      channel: 'linkedin' as const,
      priority: 'high' as const,
      deal_value: 1500.5,
      won_month: '2026-10-01',
      next_follow_up: '2026-10-31',
      tags: ['design', 'warm'],
    }
    const { rows, errors, ignoredColumns } = parseContactsCsv(CSV_BOM + contactsToCsv([original]))
    expect(errors).toEqual([])
    expect(ignoredColumns).toEqual([])
    expect(rows).toEqual([{ line: 2, contact: original }])
  })

  it('maps a hand-made ; file with aliases, labels and defaults', () => {
    const text = [
      'Business name;Type;Location;Telephone;Web;Source;Stage;Follow up;Favourite colour',
      'Smile Dental;Dentist;Sarajevo;033 123 456;smile.ba;Google Maps;;28.10.2026;blue',
    ].join('\n')
    const { rows, errors, ignoredColumns } = parseContactsCsv(text)
    expect(errors).toEqual([])
    expect(ignoredColumns).toEqual(['Favourite colour'])
    expect(rows[0]?.contact).toMatchObject({
      name: 'Smile Dental',
      category: 'Dentist',
      city: 'Sarajevo',
      phone: '033 123 456',
      website: 'https://smile.ba/',
      source: 'maps',
      stage: 'new',
      priority: 'medium',
      next_follow_up: '2026-10-28',
      tags: [],
    })
  })

  it('returns good rows and an error list per bad line', () => {
    const text = [
      'Name,Email,Stage,Deal value,Website',
      'Good One,good@mail.com,Contacted,100,',
      ',nobody@mail.com,,,',
      '',
      'Bad Two,not-an-email,Closed,abc,not a link',
      '"Multi',
      'line",,,,',
      'Good Three,,,,',
    ].join('\r\n')
    const { rows, errors } = parseContactsCsv(text)
    expect(rows.map((r) => [r.line, r.contact.name])).toEqual([
      [2, 'Good One'],
      [6, 'Multi\r\nline'],
      [8, 'Good Three'],
    ])
    expect(errors).toEqual([
      { line: 3, messages: ['Name: Name is empty'] },
      {
        line: 5,
        messages: [
          'Email: Not a valid email',
          'Stage: Unknown stage (got "Closed")',
          'Deal value: Not a number ("abc")',
          'Website: Not a valid link',
        ],
      },
    ])
  })

  it('rejects files without a Name column, empty files and unclosed quotes', () => {
    expect(parseContactsCsv('Email,Phone\na@b.com,1').errors).toEqual([
      { line: 1, messages: ['No "Name" column found'] },
    ])
    expect(parseContactsCsv('').errors).toEqual([{ line: 1, messages: ['The file is empty'] }])
    expect(parseContactsCsv('Name\n"Oops').errors[0]?.line).toBe(2)
  })

  it('cleans tags and checks numbers', () => {
    const { rows, errors } = parseContactsCsv('Name,Tags,Connects\nA,"#Warm Lead, design; design",12\nB,,2.5')
    expect(rows[0]?.contact.tags).toEqual(['warm-lead', 'design'])
    expect(rows[0]?.contact.connects_spent).toBe(12)
    expect(errors).toEqual([{ line: 3, messages: ['Connects spent: Use a whole number'] }])
  })
})
