import { expect, test, type Locator, type Page } from '@playwright/test'
import { mockSupabase, TEST_USER, type MockDb, type Row } from './support/mockSupabase.ts'

// Wednesday 28 Oct 2026, 10:00 in Sarajevo.
const NOW = new Date('2026-10-28T09:00:00Z')
const CREATED = '2026-10-14T09:00:00+00:00'

const EMIR = '00000000-0000-4000-8000-000000000201'
const NOVA = '00000000-0000-4000-8000-000000000202'
const MOSTAR = '00000000-0000-4000-8000-000000000203'
const FITBOX = '00000000-0000-4000-8000-000000000204'
const OPENER = '00000000-0000-4000-8000-000000000301'
const MONEY_EARNED = '00000000-0000-4000-8000-000000000401'

function contact(id: string, fields: Row): Row {
  return {
    id,
    user_id: TEST_USER.id,
    created_at: CREATED,
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

function touch(id: string, fields: Row): Row {
  return { id, user_id: TEST_USER.id, created_at: fields.occurred_at, channel: 'linkedin', template_id: null, body: null, got_reply: false, ...fields }
}

function seed(): MockDb {
  return {
    profiles: [
      { id: TEST_USER.id, user_id: TEST_USER.id, created_at: CREATED, display_name: 'Test User', timezone: 'Europe/Sarajevo', week_start: 1, day_end_hour: 0, theme: 'light', language: 'en' },
    ],
    contacts: [
      contact(EMIR, {
        name: 'Emir Kovač',
        source: 'linkedin',
        stage: 'replied',
        role: 'Founder',
        company: 'Bloom Studio',
        linkedin_url: 'https://www.linkedin.com/in/emir-kovac',
        email: 'emir.kovac@example.com',
        channel: 'linkedin',
        priority: 'high',
        tags: ['agency'],
        deal_value: 1200,
        next_follow_up: '2026-10-28',
        last_touch_at: '2026-10-27T15:42:00+00:00',
        notes: [{ id: '00000000-0000-4000-8000-000000000401', body: 'Pain: booking page is slow on mobile.', created_at: CREATED }],
      }),
      contact(NOVA, { name: 'Nova Dental', source: 'maps', stage: 'proposal', category: 'Dentist', city: 'Sarajevo', website: 'https://novadental.ba', channel: 'email', deal_value: 2400, next_follow_up: '2026-10-27' }),
      contact(MOSTAR, { name: 'Mostar Tours', source: 'maps', stage: 'contacted', category: 'Travel agency', city: 'Mostar', tags: ['no-website'], channel: 'phone', deal_value: 700, next_follow_up: '2026-10-26' }),
      contact(FITBOX, { name: 'Fitbox Gym', source: 'maps', stage: 'won', category: 'Gym', deal_value: 3000, won_amount: 3000, won_month: '2026-10-01' }),
    ],
    touches: [
      touch('00000000-0000-4000-8000-000000000501', { contact_id: EMIR, occurred_at: '2026-10-15T08:03:00+00:00', direction: 'sent', template_id: OPENER, body: 'Hi Emir, congrats on the new studio launch.' }),
      touch('00000000-0000-4000-8000-000000000502', { contact_id: EMIR, occurred_at: '2026-10-26T08:00:00+00:00', direction: 'sent', body: 'Following up on my note.' }),
      touch('00000000-0000-4000-8000-000000000503', { contact_id: EMIR, occurred_at: '2026-10-27T15:42:00+00:00', direction: 'received', got_reply: true, body: 'Thanks, interesting timing.' }),
      touch('00000000-0000-4000-8000-000000000504', { contact_id: NOVA, occurred_at: '2026-10-27T09:00:00+00:00', channel: 'email', direction: 'sent', body: 'Proposal attached.' }),
    ],
    templates: [
      { id: OPENER, user_id: TEST_USER.id, created_at: CREATED, name: 'Opener A', channel: 'linkedin', body: 'Hi {{first_name}}, quick question about your booking page.' },
    ],
    tasks: [
      { id: 't-emir', user_id: TEST_USER.id, created_at: CREATED, title: 'Send examples to Emir', notes: null, due_date: '2026-10-28', time: '10:30:00', tag: 'outreach', priority: 'high', status: 'todo', completed_at: null, position: 0, contact_id: EMIR },
    ],
    routine_items: [],
    routine_checks: [],
    daily_logs: [],
    metrics: [
      { id: MONEY_EARNED, user_id: TEST_USER.id, created_at: CREATED, name: 'Money earned', unit: 'eur', log_every: 'monthly', yearly_goal: null, builtin: 'money_earned', position: 0 },
    ],
    metric_entries: [],
  }
}

async function open(page: Page, path: string): Promise<MockDb> {
  await page.clock.setFixedTime(NOW)
  const db = await mockSupabase(page, seed(), { now: NOW })
  await page.goto(path)
  return db
}

const contactRow = (db: MockDb, name: string) => db.contacts?.find((c) => c.name === name)

/** The source cards hide their radio input, so click the card (its label). */
async function pickSource(page: Page, name: string) {
  await page.locator('label', { has: page.getByRole('radio', { name }) }).click()
  await expect(page.getByRole('radio', { name })).toBeChecked()
}

/** Presses Tab (or Shift+Tab) until `target` has focus. */
async function tabTo(page: Page, target: Locator, { back = false } = {}) {
  for (let i = 0; i < 150; i++) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
    if (await target.evaluate((el) => el === el.ownerDocument.activeElement)) return
  }
  throw new Error(`Tab never reached ${String(target)}`)
}

test.describe('Outreach', () => {
  test.skip(({ isMobile }) => isMobile, 'Interaction flows run on desktop; phone layout is checked below')

  test('add a lead → move it on the board → log a touch', async ({ page }) => {
    const db = await open(page, '/outreach')
    await expect(page.getByRole('heading', { name: 'Outreach', level: 1 })).toBeVisible()
    await expect(page.getByText('4 leads · 3 follow-ups due · €4,300 open pipeline')).toBeVisible()

    // Add a Google Maps lead without a website.
    await page.getByRole('button', { name: 'Add lead' }).click()
    await pickSource(page, 'Google Maps')
    await page.getByLabel('Business name').fill('Café Rondo')
    await page.getByLabel('Type of business').fill('Café')
    await page.getByLabel('Address or city').fill('Sarajevo')
    await page.getByLabel('First follow-up').selectOption('tomorrow')
    await page.getByRole('button', { name: 'Save lead' }).click()

    await expect(page.getByRole('link', { name: 'Café Rondo' })).toBeVisible()
    await expect(page.getByText('Café · Sarajevo · no website')).toBeVisible()
    await expect.poll(() => contactRow(db, 'Café Rondo')?.tags).toEqual(['no-website'])
    expect(contactRow(db, 'Café Rondo')).toMatchObject({ stage: 'new', next_follow_up: '2026-10-29', source: 'maps' })

    // Board view is kept in the URL; move the card one column right with the keyboard.
    await page.getByRole('button', { name: 'Board' }).click()
    await expect(page).toHaveURL(/view=board/)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true')

    // Wait for each screen-reader announcement, like a person would, before the next key.
    const announce = page.getByRole('status').filter({ hasText: /Café Rondo/ })
    await page.getByRole('button', { name: 'Move Café Rondo' }).focus()
    await page.keyboard.press('Space')
    await expect(announce).toHaveText(/Picked up Café Rondo|Café Rondo is over New/)
    // dnd-kit starts listening for arrow keys one tick (setTimeout 0) after the pick-up.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)))
    await page.keyboard.press('ArrowRight')
    await expect(announce).toHaveText('Café Rondo is over Contacted.')
    await page.keyboard.press('Space')
    await expect(page.getByRole('region', { name: /^Contacted,/ }).getByRole('link', { name: 'Café Rondo' })).toBeVisible()
    await expect.poll(() => contactRow(db, 'Café Rondo')?.stage).toBe('contacted')
    expect(contactRow(db, 'Café Rondo')?.next_follow_up).toBe('2026-10-31')

    // Open the lead and log a call.
    await page.getByRole('link', { name: 'Café Rondo' }).click()
    await expect(page.getByRole('heading', { name: 'Café Rondo', level: 1 })).toBeVisible()
    await page.getByLabel('Channel').selectOption('phone')
    await page.getByLabel('Message or summary').fill('Called, they want a one-page site.')
    await page.getByRole('button', { name: 'Save touch' }).click()

    await expect(page.getByRole('heading', { name: 'Sent · Phone', level: 3 })).toBeVisible()
    await expect(page.getByText('1 touch', { exact: true })).toBeVisible()
    await expect.poll(() => db.touches?.filter((t) => t.body === 'Called, they want a one-page site.').length).toBe(1)
    const saved = db.touches?.find((t) => t.body === 'Called, they want a one-page site.')
    expect(saved).toMatchObject({ channel: 'phone', direction: 'sent', got_reply: false })
    // Sent touch → follow-up today + 3 days.
    await expect.poll(() => contactRow(db, 'Café Rondo')?.next_follow_up).toBe('2026-10-31')
  })

  test('filters stay in the URL', async ({ page }) => {
    await open(page, '/outreach')
    await page.getByRole('button', { name: /^Google Maps, 3/ }).click()
    await expect(page).toHaveURL(/source=maps/)
    await expect(page.getByRole('link', { name: 'Emir Kovač' })).toBeHidden()
    await page.getByRole('checkbox', { name: 'Follow-up due' }).click()
    await expect(page.getByRole('checkbox', { name: 'Follow-up due' })).toBeChecked()
    await expect(page).toHaveURL(/due=1/)
    await expect(page.getByRole('link', { name: 'Fitbox Gym' })).toBeHidden()
    await expect(page.getByRole('link', { name: 'Nova Dental' })).toBeVisible()
    await page.getByRole('searchbox', { name: 'Search leads' }).fill('mostar')
    await expect(page.getByRole('link', { name: 'Nova Dental' })).toBeHidden()
    await page.reload()
    await expect(page.getByRole('link', { name: 'Mostar Tours' })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Search leads' })).toHaveValue('mostar')
  })

  test('warns about duplicates and maps Upwork proposal status to a stage', async ({ page }) => {
    const db = await open(page, '/outreach')
    await page.getByRole('button', { name: 'Add lead' }).click()
    await pickSource(page, 'LinkedIn')
    await page.getByLabel('Profile link').fill('linkedin.com/in/emir-kovac/')
    await expect(page.getByText(/Emir Kovač\s+already has this link/)).toBeVisible()

    await pickSource(page, 'Upwork')
    await page.getByLabel('Job title').fill('Webflow landing page')
    await page.getByLabel('Job link').fill('https://www.upwork.com/jobs/~0123')
    await page.getByLabel('Proposal status').selectOption('interview')
    await page.getByRole('button', { name: 'Save lead' }).click()

    await expect.poll(() => contactRow(db, 'Webflow landing page')?.stage).toBe('meeting')
    expect(contactRow(db, 'Webflow landing page')).toMatchObject({ source: 'upwork', proposal_status: 'interview', channel: 'upwork' })
  })

  test('imports and exports CSV', async ({ page }) => {
    const db = await open(page, '/outreach')
    await page.getByRole('button', { name: 'Import CSV' }).click()
    const csv = 'Name,Source,Company,Email\nLejla Hodžić,linkedin,Pixel Lab,lejla@pixel.ba\n,maps,,\nCafé Rondo,maps,,\n'
    await page.getByLabel('CSV file').setInputFiles({ name: 'leads.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
    await expect(page.getByText('2 leads ready')).toBeVisible()
    await expect(page.getByText(/1 row with problems/)).toBeVisible()
    await page.getByRole('button', { name: 'Import 2 leads' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect.poll(() => db.contacts?.length).toBe(6)
    await expect(page.getByRole('link', { name: 'Lejla Hodžić' })).toBeVisible()
    expect(contactRow(db, 'Lejla Hodžić')).toMatchObject({ source: 'linkedin', company: 'Pixel Lab', stage: 'new' })

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export CSV' }).click()
    const file = await download
    expect(file.suggestedFilename()).toBe('momentum-leads-2026-10-28.csv')
    const text = await (await file.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString('utf8'))
    expect(text).toContain('Emir Kovač')
    expect(text).toContain('Lejla Hodžić')
  })

  test('contact page: stage, follow-up, template, notes, won deal, linked tasks', async ({ page }) => {
    const db = await open(page, `/outreach/${EMIR}`)
    await expect(page.getByRole('heading', { name: 'Emir Kovač', level: 1 })).toBeVisible()
    await expect(page.getByText('Founder · Bloom Studio')).toBeVisible()
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Received · LinkedIn', 'Sent · LinkedIn', 'Sent · LinkedIn'])
    await expect(page.getByText('Reply received')).toBeVisible()
    const timeline = page.locator('section', { has: page.getByRole('heading', { name: 'Timeline' }) })
    await expect(timeline.getByText('Opener A', { exact: true })).toBeVisible()
    await expect(page.getByText('Send examples to Emir')).toBeVisible()

    // Stepper → Meeting booked: follow-up tomorrow.
    await page.getByRole('button', { name: 'Meeting booked' }).click()
    await expect(page.getByRole('button', { name: 'Meeting booked (current stage)' })).toBeVisible()
    await expect.poll(() => contactRow(db, 'Emir Kovač')?.stage).toBe('meeting')
    expect(contactRow(db, 'Emir Kovač')?.next_follow_up).toBe('2026-10-29')

    // Use template fills the message with the first name.
    await page.getByRole('button', { name: 'Use template' }).click()
    await expect(page.getByLabel('Template')).toBeFocused()
    await page.getByLabel('Template').selectOption({ label: 'Opener A' })
    await expect(page.getByLabel('Message or summary')).toHaveValue('Hi Emir, quick question about your booking page.')

    // Notes.
    await page.getByRole('button', { name: 'Edit notes' }).click()
    await page.getByRole('textbox', { name: 'Notes' }).press('End')
    await page.getByRole('textbox', { name: 'Notes' }).pressSequentially('\n\n[ ] Prepare a mini audit')
    await page.getByRole('button', { name: 'Save notes' }).click()
    await expect(page.getByRole('checkbox', { name: 'Prepare a mini audit' })).toBeVisible()
    await expect.poll(() => ((contactRow(db, 'Emir Kovač')?.notes ?? []) as Row[]).map((n) => n.body)).toEqual([
      'Pain: booking page is slow on mobile.',
      '[ ] Prepare a mini audit',
    ])

    // Linked task: tick it.
    await page.getByRole('checkbox', { name: 'Send examples to Emir' }).click()
    await expect(page.getByRole('checkbox', { name: 'Send examples to Emir' })).toBeChecked()
    await expect.poll(() => db.tasks?.find((t) => t.id === 't-emir')?.status).toBe('done')

    // Add task links a new task to the lead.
    await page.getByRole('button', { name: 'Add task' }).click()
    await expect.poll(() => db.tasks?.find((t) => t.title === 'Follow up with Emir Kovač')?.contact_id).toBe(EMIR)

    // Won → deal panel stores amount and month, and adds it to Money earned.
    await page.getByRole('button', { name: 'Won' }).click()
    await expect(page.getByText('Deal won — how much did it bring in?')).toBeVisible()
    await expect.poll(() => contactRow(db, 'Emir Kovač')?.next_follow_up).toBeNull()
    await page.getByLabel('Amount (€)').fill('1500')
    await page.getByRole('button', { name: 'Save deal' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
    await expect.poll(() => contactRow(db, 'Emir Kovač')?.won_amount).toBe(1500)
    expect(contactRow(db, 'Emir Kovač')?.won_month).toBe('2026-10-01')
    expect(db.metric_entries).toEqual([
      expect.objectContaining({ metric_id: MONEY_EARNED, contact_id: EMIR, entry_date: '2026-10-01', value: 1500 }),
    ])

    // Saving again replaces the same entry instead of adding a second one.
    await page.getByLabel('Amount (€)').fill('1800')
    await page.getByRole('button', { name: 'Save deal' }).click()
    await expect.poll(() => db.metric_entries?.map((e) => e.value)).toEqual([1800])

    // Unticking "Add to Money earned" removes it again; the deal stays on the lead.
    await page.getByRole('checkbox', { name: /Money earned/ }).uncheck()
    await page.getByRole('button', { name: 'Save deal' }).click()
    await expect.poll(() => db.metric_entries).toEqual([])
    expect(contactRow(db, 'Emir Kovač')?.won_amount).toBe(1800)
  })

  test('Today shows this week’s outreach, late follow-ups and the sidebar badge', async ({ page }) => {
    const db = await open(page, '/')
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible()
    // Sent this week: Emir (26 Oct) and Nova (27 Oct); one reply.
    await expect(page.getByRole('region', { name: 'Outreaches this week' })).toContainText('2of 20 goal')
    await expect(page.getByRole('link', { name: 'Outreach, 3 due' })).toBeVisible()

    const overdue = page.locator('section', { has: page.getByRole('heading', { name: /^Overdue/ }) })
    await expect(overdue.getByRole('heading')).toHaveText('Overdue · 2')
    await expect(overdue.getByRole('listitem')).toHaveText([/Follow up with Mostar Tours/, /Follow up with Nova Dental/])
    await expect(overdue.getByRole('link', { name: 'Follow up with Nova Dental' })).toHaveAttribute('href', `/outreach/${NOVA}`)

    await overdue.getByRole('button', { name: 'Move to today' }).last().click()
    await expect.poll(() => contactRow(db, 'Nova Dental')?.next_follow_up).toBe('2026-10-28')
    await overdue.getByRole('button', { name: 'Drop' }).click()
    await expect.poll(() => contactRow(db, 'Mostar Tours')?.next_follow_up).toBeNull()
    await expect(page.getByText(/^Overdue/)).toBeHidden()
    await expect(page.getByRole('link', { name: 'Outreach, 2 due' })).toBeVisible()
  })

  test('works with the keyboard only', async ({ page }) => {
    const db = await open(page, '/outreach')
    await expect(page.getByRole('heading', { name: 'Outreach', level: 1 })).toBeVisible()

    // Add a LinkedIn lead.
    await tabTo(page, page.getByRole('button', { name: 'Add lead' }))
    await page.keyboard.press('Enter')
    await tabTo(page, page.getByRole('radio', { name: 'LinkedIn' }))
    await page.keyboard.press('Space')
    await expect(page.getByRole('radio', { name: 'LinkedIn' })).toBeChecked()
    await tabTo(page, page.getByLabel('Name', { exact: true }))
    await page.keyboard.type('Daniel Weber')
    await tabTo(page, page.getByLabel('Profile link'))
    await page.keyboard.type('linkedin.com/in/daniel-weber')
    await page.keyboard.press('Enter')
    await expect.poll(() => contactRow(db, 'Daniel Weber')?.stage).toBe('new')

    // Open it from the table and move the stage.
    await tabTo(page, page.getByRole('link', { name: 'Daniel Weber' }))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Daniel Weber', level: 1 })).toBeVisible()
    await tabTo(page, page.getByRole('button', { name: 'Contacted' }))
    await page.keyboard.press('Enter')
    await expect.poll(() => contactRow(db, 'Daniel Weber')?.stage).toBe('contacted')

    // "Log touch" jumps to the message; type and save.
    await tabTo(page, page.getByRole('button', { name: 'Log touch' }), { back: true })
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Message or summary')).toBeFocused()
    await page.keyboard.type('Sent a connection request.')
    await tabTo(page, page.getByRole('button', { name: 'Save touch' }))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Sent · LinkedIn', level: 3 })).toBeVisible()
    await expect.poll(() => db.touches?.some((t) => t.body === 'Sent a connection request.')).toBe(true)
  })
})

test.describe('Outreach at phone width', () => {
  test.skip(({ isMobile }) => !isMobile, 'Phone layout only')

  async function expectNoSideScroll(page: Page) {
    // e2e code has no DOM types, so read the page size through <html> itself.
    const overflow = await page.locator('html').evaluate((html) => html.scrollWidth - html.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }

  test('list, board and contact page fit the screen', async ({ page }) => {
    await open(page, '/outreach')
    await expect(page.getByRole('link', { name: 'Emir Kovač' })).toBeVisible()
    await expectNoSideScroll(page)

    await page.getByRole('button', { name: 'Add lead' }).click()
    await pickSource(page, 'Upwork')
    await expect(page.getByLabel('Job title')).toBeVisible()
    await expectNoSideScroll(page)

    await page.goto('/outreach?view=board')
    await expect(page.getByRole('region', { name: /^Replied,/ })).toBeAttached()
    await expectNoSideScroll(page)

    await page.goto(`/outreach/${EMIR}`)
    await expect(page.getByRole('heading', { name: 'Emir Kovač', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save touch' })).toBeVisible()
    await expectNoSideScroll(page)
    // On a phone the touch form comes before the details.
    const formTop = await page.getByRole('heading', { name: 'Log a touch' }).boundingBox()
    const detailsTop = await page.getByRole('heading', { name: 'Details' }).boundingBox()
    expect(formTop!.y).toBeLessThan(detailsTop!.y)

    await page.getByRole('button', { name: 'Won' }).click()
    await expect(page.getByRole('button', { name: 'Save deal' })).toBeVisible()
    await expectNoSideScroll(page)
  })
})
