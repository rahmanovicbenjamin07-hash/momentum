import type { Page, Route } from '@playwright/test'

/**
 * A tiny in-memory stand-in for Supabase, so e2e tests run without a real project.
 * Supports what the app uses: GET with eq/neq/lt/gte/lte filters, insert, upsert and update.
 * It does NOT check security (RLS); that is tested against the real database.
 */

export type Row = Record<string, unknown>
export type MockDb = Record<string, Row[]>

export const TEST_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' }

// The app uses this URL when VITE_SUPABASE_URL is not set (see src/lib/supabase.ts).
const SUPABASE_URL = 'http://localhost:54321'
const STORAGE_KEY = 'sb-localhost-auth-token'

const DEFAULTS: Record<string, Row> = {
  routine_items: { active: true, position: 0, time: null },
  routine_checks: { done: false, miss_reason: null },
  tasks: { notes: null, time: null, tag: null, priority: 'medium', status: 'todo', completed_at: null, position: 0, contact_id: null },
  daily_logs: { note: null, energy: null },
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
    headers: { 'access-control-allow-origin': '*' },
    body: body === undefined ? '' : JSON.stringify(body),
  })
}

/**
 * Signs in a fake user and serves `db` as the database. Returns `db`, which changes as the app writes.
 * Pass `now` when the test fixes the browser clock, so server-made timestamps
 * (created_at, completed_at) match the page's "today" instead of the real date.
 */
export async function mockSupabase(page: Page, db: MockDb, options: { now?: Date } = {}): Promise<MockDb> {
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
    },
  }
  await page.addInitScript({
    content: `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(session))})`,
  })

  await page.route(`${SUPABASE_URL}/auth/v1/**`, (route) => respond(route, 200, {}))

  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return respond(route, 204)

    const url = new URL(request.url())
    const table = url.pathname.replace('/rest/v1/', '')
    const rows = (db[table] ??= [])
    const params = url.searchParams
    const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    const prefer = request.headers()['prefer'] ?? ''
    const returnRows = (result: Row[]) =>
      respond(route, request.method() === 'GET' ? 200 : 201, wantsObject ? (result[0] ?? null) : result)

    switch (request.method()) {
      case 'GET':
        return returnRows(filterRows(rows, params))

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

      default:
        return respond(route, 405, { message: `mockSupabase: ${request.method()} not supported` })
    }
  })

  return db
}
