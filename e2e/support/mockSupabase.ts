import type { Page, Route } from '@playwright/test'

/**
 * A tiny in-memory stand-in for Supabase, so e2e tests run without a real project.
 * Supports what the app uses: GET (and HEAD counts) with eq/neq/lt/gte/lte/is/in/not filters, insert, upsert, update, delete
 * and SQL function calls (rpc), which answer from the handlers you pass (or [] by default).
 * It does NOT check security (RLS); that is tested against the real database.
 */

export type Row = Record<string, unknown>
export type MockDb = Record<string, Row[]>
/** Answers one SQL function call: receives its arguments (e.g. { p_from, p_to }) and the db. */
export type RpcHandler = (args: Row, db: MockDb) => unknown
/** One file in the Storage "backups" folder, e.g. { name: '2026-10-28.json', size: 2_200_000, updated_at: '2026-10-28T02:00:00Z' }. */
export type MockBackup = { name: string; size: number; updated_at: string }

export const TEST_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' }

// The app uses this URL when VITE_SUPABASE_URL is not set (see src/lib/supabase.ts).
const SUPABASE_URL = 'http://localhost:54321'
const STORAGE_KEY = 'sb-localhost-auth-token'

const DEFAULTS: Record<string, Row> = {
  routine_items: { active: true, position: 0, time: null },
  routine_checks: { done: false, miss_reason: null },
  tasks: { notes: null, time: null, tag: null, priority: 'medium', status: 'todo', completed_at: null, position: 0, contact_id: null },
  daily_logs: { note: null, energy: null },
  contacts: {
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
    stage: 'new',
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
  },
  touches: { template_id: null, body: null, got_reply: false },
  templates: { channel: null },
  goals: { include_pipeline: false },
  reviews: { wins: '', misses: '', lesson: '', focus: '', status: 'draft' },
  lessons: { area: 'Other' },
  experiments: { hypothesis: '', status: 'running', before_value: null, during_value: null, result: '' },
  ideas: { status: 'new' },
  notification_prefs: { enabled: true, time: null, time_end: null },
  notifications: { body: '', link: null, read_at: null },
}

/** Mirrors the touches trigger: a sent/received touch updates the contact's last_touch_at. */
function afterInsert(db: MockDb, table: string, row: Row) {
  if (table !== 'touches' || row.direction === 'note') return
  const contact = db.contacts?.find((c) => c.id === row.contact_id)
  if (contact && (!contact.last_touch_at || String(row.occurred_at) > String(contact.last_touch_at))) {
    contact.last_touch_at = row.occurred_at
  }
}

function matches(row: Row, column: string, filter: string): boolean {
  const dot = filter.indexOf('.')
  const op = filter.slice(0, dot)
  const expected = filter.slice(dot + 1)
  const actual = row[column] === null || row[column] === undefined ? 'null' : String(row[column])
  switch (op) {
    case 'eq':
      return actual === expected
    case 'neq':
      return actual !== expected
    case 'lt':
      return actual < expected
    case 'lte':
      return actual <= expected
    case 'gt':
      return actual > expected
    case 'gte':
      return actual >= expected
    case 'is':
      return actual === expected
    case 'in':
      // in.(a,b,"c d")
      return expected
        .slice(1, -1)
        .split(',')
        .map((v) => v.replace(/^"|"$/g, ''))
        .includes(actual)
    case 'not':
      // not.is.null, not.eq.x …
      return !matches(row, column, expected)
    default:
      throw new Error(`mockSupabase: unsupported filter ${column}=${filter}`)
  }
}

const RESERVED = new Set(['select', 'order', 'on_conflict', 'limit', 'columns'])

function filterRows(rows: Row[], params: URLSearchParams): Row[] {
  let result = rows
  for (const [column, value] of params) {
    if (RESERVED.has(column)) continue
    result = result.filter((row) => matches(row, column, value))
  }
  return result
}

function respond(route: Route, status: number, body?: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
    body: body === undefined ? '' : JSON.stringify(body),
  })
}

/**
 * Signs in a fake user and serves `db` as the database. Returns `db`, which changes as the app writes.
 * Pass `now` when the test fixes the browser clock, so server-made timestamps
 * (created_at, completed_at) match the page's "today" instead of the real date.
 * Pass `rpc` to answer SQL function calls by name; any other function returns [].
 * Pass `backups` for the Storage backup list (Settings). The Edge Functions 'restore'
 * and 'delete-account' answer with fake success; each call is added to db.functionCalls.
 */
export async function mockSupabase(
  page: Page,
  db: MockDb,
  options: { now?: Date; rpc?: Record<string, RpcHandler>; backups?: MockBackup[] } = {},
): Promise<MockDb> {
  const nowIso = () => (options.now ?? new Date()).toISOString()
  const session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 4102444800, // year 2100
    user: {
      id: TEST_USER.id,
      email: TEST_USER.email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
      last_sign_in_at: nowIso(),
    },
  }
  await page.addInitScript({
    content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(session))})`,
  })

  await page.route(`${SUPABASE_URL}/auth/v1/**`, (route) => respond(route, 200, {}))

  // Storage: the nightly backups in the user's folder (Settings → Data & backups).
  await page.route(`${SUPABASE_URL}/storage/v1/**`, (route) => {
    if (route.request().method() === 'OPTIONS') return respond(route, 204)
    if (!route.request().url().includes('/object/list/backups')) return respond(route, 404, { message: 'mockSupabase: storage path not mocked' })
    return respond(
      route,
      200,
      (options.backups ?? []).map((b) => ({
        name: b.name,
        id: crypto.randomUUID(),
        created_at: b.updated_at,
        updated_at: b.updated_at,
        metadata: { size: b.size },
      })),
    )
  })

  // Edge Functions: fake success, and remember the call.
  await page.route(`${SUPABASE_URL}/functions/v1/**`, (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return respond(route, 204)
    const name = new URL(request.url()).pathname.replace('/functions/v1/', '')
    const body = (() => {
      try {
        return request.postDataJSON() as unknown
      } catch {
        return null
      }
    })()
    ;(db.functionCalls ??= []).push({ name, body })
    if (name === 'restore') return respond(route, 200, { restoredTables: 16, rows: 42 })
    if (name === 'delete-account') return respond(route, 200, { ok: true })
    return respond(route, 404, { message: `mockSupabase: function ${name} not mocked` })
  })

  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return respond(route, 204)

    const url = new URL(request.url())
    const table = url.pathname.replace('/rest/v1/', '')
    if (table.startsWith('rpc/')) {
      const args = (request.postDataJSON() ?? {}) as Row
      const handler = options.rpc?.[table.slice('rpc/'.length)]
      return respond(route, 200, handler ? handler(args, db) : [])
    }
    const rows = (db[table] ??= [])
    const params = url.searchParams
    const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    const prefer = request.headers()['prefer'] ?? ''
    const returnRows = (result: Row[]) =>
      respond(route, request.method() === 'GET' ? 200 : 201, wantsObject ? (result[0] ?? null) : result)

    switch (request.method()) {
      case 'GET':
        return returnRows(filterRows(rows, params))

      case 'HEAD': {
        // select(..., { count: 'exact', head: true }): only the count, in Content-Range.
        const count = filterRows(rows, params).length
        return route.fulfill({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-expose-headers': 'content-range',
            'content-range': `*/${count}`,
          },
          body: '',
        })
      }

      case 'POST': {
        const body = request.postDataJSON() as Row | Row[]
        const conflict = params.get('on_conflict')?.split(',')
        const written: Row[] = []
        for (const input of Array.isArray(body) ? body : [body]) {
          const existing =
            conflict && prefer.includes('merge-duplicates')
              ? rows.find((row) => conflict.every((c) => String(row[c] ?? (c === 'user_id' ? TEST_USER.id : '')) === String(input[c] ?? (c === 'user_id' ? TEST_USER.id : ''))))
              : undefined
          if (existing) {
            Object.assign(existing, input)
            written.push(existing)
          } else {
            const row: Row = {
              id: crypto.randomUUID(),
              user_id: TEST_USER.id,
              created_at: nowIso(),
              ...DEFAULTS[table],
              ...input,
            }
            rows.push(row)
            written.push(row)
            afterInsert(db, table, row)
          }
        }
        return prefer.includes('return=representation') ? returnRows(written) : respond(route, 201)
      }

      case 'PATCH': {
        const patch = request.postDataJSON() as Row
        const targets = filterRows(rows, params)
        for (const row of targets) {
          Object.assign(row, patch)
          // Mirrors the tasks trigger: completed_at follows status.
          if (table === 'tasks' && 'status' in patch) {
            row.completed_at = patch.status === 'done' ? nowIso() : null
          }
        }
        return prefer.includes('return=representation') ? returnRows(targets) : respond(route, 204)
      }

      case 'DELETE': {
        const targets = new Set(filterRows(rows, params))
        db[table] = rows.filter((row) => !targets.has(row))
        return prefer.includes('return=representation') ? returnRows([...targets]) : respond(route, 204)
      }

      default:
        return respond(route, 405, { message: `mockSupabase: ${request.method()} not supported` })
    }
  })

  return db
}
