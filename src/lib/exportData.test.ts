import { describe, expect, it } from 'vitest'
import {
  buildJsonExport,
  EXPORT_TABLES,
  exportFileName,
  parseMetricValuesCsv,
  tableToCsv,
  validateExport,
  type Row,
} from './exportData'

const USER = '0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4'
const CREATED = '2026-10-28T19:19:45.123456+00:00'
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function task(n: number, overrides: Row = {}): Row {
  return {
    id: id(n),
    user_id: USER,
    created_at: CREATED,
    title: `Task ${n}`,
    notes: null,
    due_date: '2026-10-28',
    time: null,
    tag: 'work',
    priority: 'medium',
    status: 'todo',
    completed_at: null,
    position: n,
    contact_id: null,
    ...overrides,
  }
}

const sample = {
  routine_items: [
    { id: id(100), user_id: USER, created_at: CREATED, title: 'Wake up at 06:00', days: [true, true, true, true, true, false, false], time: '06:00:00', position: 0, active: true },
  ],
  tasks: [task(1), task(2, { status: 'done', completed_at: CREATED })],
  metrics: [
    // builtin and position aren't in the schema: they must survive the round trip.
    { id: id(200), user_id: USER, created_at: CREATED, name: 'Money earned', unit: 'eur', log_every: 'monthly', yearly_goal: 18000, builtin: 'money_earned', position: 0 },
  ],
  metric_entries: [
    { id: id(300), user_id: USER, created_at: CREATED, metric_id: id(200), entry_date: '2026-10-01', value: 2200, note: '2 new clients', contact_id: null },
  ],
}

describe('JSON export and validate', () => {
  it('round trip: build → JSON text → validate gives the same rows back', () => {
    const file = buildJsonExport(sample, '2026-10-29T08:00:00.000Z')
    expect(file).toMatchObject({ app: 'momentum', version: 1, exported_at: '2026-10-29T08:00:00.000Z' })

    const result = validateExport(JSON.parse(JSON.stringify(file)))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.tasks).toEqual(sample.tasks)
    expect(result.data.metrics[0]).toMatchObject({ builtin: 'money_earned', position: 0 })
    expect(result.data.metric_entries).toEqual(sample.metric_entries)
    // Tables not in the file come back empty, all 17 present.
    expect(Object.keys(result.data)).toEqual([...EXPORT_TABLES])
    expect(result.data.goals).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('a broken row is reported with its table and row number', () => {
    const file = buildJsonExport({ ...sample, tasks: [task(1), task(2, { title: '' }), task(3, { status: 'later' })] }, CREATED)
    const result = validateExport(file)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]).toMatch(/^tasks row 2: title: /)
    expect(result.errors[1]).toMatch(/^tasks row 3: status: /)
  })

  it('rejects other files and versions; ignores unknown tables with a warning', () => {
    expect(validateExport(null)).toMatchObject({ ok: false, errors: ['This isn’t a Momentum export file.'] })
    expect(validateExport({ app: 'other', version: 1, tables: {} }).ok).toBe(false)
    expect(validateExport({ app: 'momentum', version: 2, tables: {} })).toMatchObject({
      ok: false,
      errors: ['Unsupported export version: 2 (expected 1).'],
    })
    expect(validateExport({ app: 'momentum', version: 1, tables: { tasks: 'oops' } })).toMatchObject({
      ok: false,
      errors: ['tasks: expected a list of rows.'],
    })
    const withExtra = validateExport({ app: 'momentum', version: 1, tables: { ...sample, secrets: [{ a: 1 }] } })
    expect(withExtra).toMatchObject({ ok: true, warnings: ['Unknown table "secrets" was ignored.'] })
  })
})

describe('CSV and file names', () => {
  it('escapes commas and quotes; arrays and jsonb become JSON text', () => {
    const csv = tableToCsv('routine_items', [
      { title: 'Call Ana, then "Bob"', days: [true, false], notes: [{ body: 'x' }], time: null, active: true, position: 2 },
    ])
    const [header, row] = csv.split('\r\n')
    expect(header).toBe('title,days,notes,time,active,position')
    expect(row).toBe('"Call Ana, then ""Bob""","[true,false]","[{""body"":""x""}]",,true,2')
    expect(csv.endsWith('\r\n')).toBe(true)
  })

  it('collects columns from every row', () => {
    expect(tableToCsv('ideas', [{ a: 1 }, { b: 2 }])).toBe('a,b\r\n1,\r\n,2\r\n')
    expect(tableToCsv('ideas', [])).toBe('\r\n')
  })

  it('file names', () => {
    expect(exportFileName('json', '2026-10-29')).toBe('momentum-export-2026-10-29.json')
    expect(exportFileName('tasks', '2026-10-29')).toBe('momentum-tasks-2026-10-29.csv')
    expect(exportFileName('metric_entries', '2026-10-29')).toBe('momentum-metric-entries-2026-10-29.csv')
  })
})

describe('parseMetricValuesCsv', () => {
  const metrics = [
    { id: 'm-money', name: 'Money earned' },
    { id: 'm-train', name: 'Trainings' },
  ]

  it('reads rows, matches names case-insensitively and reports bad lines', () => {
    const text = [
      'Metric,Month,Value,Note',
      'Money earned,2026-10,"2.200,50",Two new clients',
      'money EARNED,2026-09-15,1950,',
      'Trainings,2026-10,12',
      'Running,2026-10,5,',
      'Money earned,Oct 2026,5,',
      'Money earned,2026-10,-5,',
      '',
    ].join('\n')
    const { rows, errors } = parseMetricValuesCsv(text, metrics)
    expect(rows).toEqual([
      { metric_id: 'm-money', entry_date: '2026-10-01', value: 2200.5, note: 'Two new clients' },
      { metric_id: 'm-money', entry_date: '2026-09-15', value: 1950, note: null },
      { metric_id: 'm-train', entry_date: '2026-10-01', value: 12, note: null },
    ])
    expect(errors).toEqual([
      { line: 5, messages: ['Unknown metric "Running"'] },
      { line: 6, messages: ['"Oct 2026" isn’t a month (use YYYY-MM or YYYY-MM-DD)'] },
      { line: 7, messages: ['Value can’t be negative'] },
    ])
  })

  it('needs the metric, month and value columns', () => {
    expect(parseMetricValuesCsv('metric;value\nTrainings;3', metrics)).toEqual({
      rows: [],
      errors: [{ line: 1, messages: ['Missing column: month'] }],
    })
    expect(parseMetricValuesCsv('', metrics).errors[0]?.messages).toEqual(['The file is empty.'])
  })
})
