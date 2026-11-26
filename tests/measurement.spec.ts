import { expect, test, type Page } from '@playwright/test'

const origin = 'http://pixel.test'
const sdk = 'https://bzrcdn.openai.com/sdk/oaiq.min.js'
const storageKey = 'naor:openai-measurement:v1'
const mock = `
  window.pixelCalls = (window.oaiq.q || []).map(args => Array.from(args));
  window.oaiq = (...args) => window.pixelCalls.push(args);
`

async function setup(page: Page, port = 5180, fail = false, delay?: Promise<void>) {
  let sdkRequests = 0
  const externalRequests: string[] = []
  await page.context().route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === origin) {
      await route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:${port}${url.pathname}${url.search}` }) })
    } else if (url.href === sdk) {
      sdkRequests++
      if (delay) await delay
      if (fail) await route.abort('blockedbyclient')
      else await route.fulfill({ contentType: 'application/javascript', body: mock })
    } else if (url.hostname === 'wa.me') {
      await route.fulfill({ body: 'Mock WhatsApp' })
    } else if (url.hostname === '127.0.0.1') {
      await route.continue()
    } else {
      if (url.hostname.endsWith('openai.com')) externalRequests.push(url.href)
      await route.abort()
    }
  })
  return { sdkRequests: () => sdkRequests, externalRequests }
}

const calls = (page: Page) => page.evaluate(() => (window as Window & { pixelCalls?: unknown[][] }).pixelCalls ?? [])
const accept = (page: Page) => page.getByRole('button', { name: 'אישור מדידה' })
const reject = (page: Page) => page.getByRole('button', { name: 'דחיית מדידה' })
const settings = (page: Page) => page.getByRole('button', { name: 'הגדרות מדידה' })
const pageView = ['measure', 'page_viewed', { type: 'contents', contents: [{ id: 'landing', content_type: 'page' }] }]
const custom = (name: string) => ['measure', 'custom', { type: 'custom' }, { custom_event_name: name }]

for (const [name, port, url] of [
  ['disabled', 5181, origin],
  ['missing ID', 5182, origin],
  ['localhost', 5180, 'http://127.0.0.1:5180'],
] as const) {
  test(`${name} makes no SDK or measurement requests`, async ({ page }) => {
    const requests = await setup(page, port)
    await page.goto(url)
    await expect(page.locator('h1')).toBeVisible()
    await expect(settings(page)).toHaveCount(0)
    await page.locator('[name=name]').fill('לקוח לדוגמה')
    expect(requests.sdkRequests()).toBe(0)
    expect(requests.externalRequests).toEqual([])
    await expect(page.locator('script[src*="bzrcdn"]')).toHaveCount(0)
  })
}

test('acceptance, deduplication, withdrawal and persisted rejection', async ({ page }) => {
  const requests = await setup(page)
  await page.goto(origin)
  await page.locator('[name=name]').fill('לפני הסכמה')
  expect(requests.sdkRequests()).toBe(0)
  await accept(page).click()
  await expect.poll(() => calls(page)).toEqual([
    ['consent', false], ['init', { pixelId: 'test_pixel_123', debug: false }], ['consent', true], pageView,
  ])
  const service = page.getByRole('link', { name: 'בירור על השירות היטל השבחה' })
  await service.evaluate(link => { (link as HTMLAnchorElement).click(); (link as HTMLAnchorElement).click() })
  const view = ['measure', 'contents_viewed', { type: 'contents', contents: [{ id: 'betterment-levy', content_type: 'service' }] }]
  await expect.poll(() => calls(page)).toContainEqual(view)
  expect((await calls(page)).filter(command => command[1] === 'contents_viewed')).toHaveLength(1)
  await expect(page.locator('[name=service]')).toHaveValue('היטל השבחה')
  await settings(page).click()
  await page.getByRole('button', { name: 'ביטול הסכמה' }).click()
  expect((await calls(page)).at(-1)).toEqual(['consent', false])
  await page.locator('.header-cta').evaluate(link => link.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  expect((await calls(page)).at(-1)).toEqual(['consent', false])
  await settings(page).click()
  await accept(page).click()
  expect((await calls(page)).filter(command => command[1] === 'page_viewed')).toHaveLength(1)
  expect(requests.sdkRequests()).toBe(1)
  await expect(page.locator('script[src*="bzrcdn"]')).toHaveCount(1)
  await settings(page).click()
  await page.getByRole('button', { name: 'ביטול הסכמה' }).click()
  await page.reload()
  await expect(accept(page)).toBeHidden()
  expect(requests.sdkRequests()).toBe(1)
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe('rejected')
})

test('saved acceptance initializes once under React StrictMode', async ({ page }) => {
  const requests = await setup(page)
  await page.addInitScript(key => localStorage.setItem(key, 'accepted'), storageKey)
  await page.goto(origin)
  await expect.poll(() => calls(page)).toHaveLength(4)
  expect((await calls(page)).filter(command => command[0] === 'init')).toHaveLength(1)
  expect((await calls(page)).filter(command => command[1] === 'page_viewed')).toEqual([pageView])
  expect(requests.sdkRequests()).toBe(1)
})

test('withdrawal before SDK load discards queued events', async ({ page }) => {
  let release!: () => void
  const delay = new Promise<void>(resolve => { release = resolve })
  const requests = await setup(page, 5180, false, delay)
  await page.goto(origin)
  try {
    await accept(page).click()
    await expect.poll(requests.sdkRequests).toBe(1)
    await page.locator('[name=name]').fill('טופס בדיקה')
    await settings(page).click()
    await page.getByRole('button', { name: 'ביטול הסכמה' }).click()
  } finally {
    release()
  }
  await expect.poll(() => calls(page)).toEqual([
    ['consent', false], ['init', { pixelId: 'test_pixel_123', debug: false }], ['consent', false],
  ])
})

test('rejection and blocked SDK leave links usable', async ({ page }) => {
  const requests = await setup(page, 5180, true)
  await page.goto(origin)
  await reject(page).click()
  expect(requests.sdkRequests()).toBe(0)
  await settings(page).click()
  await accept(page).click()
  await expect.poll(requests.sdkRequests).toBe(1)
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.locator('.header-cta').click()])
  await popup.waitForURL('https://wa.me/**')
  expect(await calls(page)).toEqual([])
  expect(requests.externalRequests).toEqual([])
})

test('validated form handoff and direct links use only documented payloads', async ({ page }) => {
  const requests = await setup(page)
  await page.goto(origin)
  await accept(page).click()
  const form = page.locator('form')
  await form.locator('[name=name]').fill('שם סינתטי')
  await form.locator('[name=phone]').fill('123')
  await form.locator('[name=whatsappConsent]').check()
  await form.getByRole('button').click()
  await expect(form.getByRole('alert')).toBeVisible()
  expect(await calls(page)).not.toContainEqual(custom('whatsapp_form_handoff'))
  await form.locator('[name=phone]').fill('050-1234567')
  await form.locator('[name=email]').fill('synthetic@example.test')
  await form.locator('[name=message]').fill('הודעת בדיקה')
  const [popup] = await Promise.all([page.waitForEvent('popup'), form.getByRole('button').click()])
  await popup.waitForURL('https://wa.me/**')
  const popupUrl = new URL(popup.url())
  expect(popupUrl.pathname).toBe('/972548344844')
  expect(popupUrl.searchParams.get('text')).toContain('הודעת בדיקה')
  expect(popupUrl.searchParams.get('text')).toContain('synthetic@example.test')
  expect(await popup.evaluate(() => window.opener)).toBeNull()

  for (const [selector, href, name] of [
    ['.header-cta', 'https://wa.me/972548344844?text=', 'whatsapp_clicked'],
    ['.contact-copy a[href^="tel:"]', 'tel:054-8344844', 'phone_clicked'],
    ['.contact-copy a[href^="mailto:"]', 'mailto:NAOR20B@GMAIL.COM', 'email_clicked'],
  ]) {
    const link = page.locator(selector)
    expect(await link.getAttribute('href')).toContain(href)
    const allowed = await link.evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })))
    expect(allowed).toBe(true)
    await expect.poll(() => calls(page)).toContainEqual(custom(name))
  }
  const commands = await calls(page)
  expect(commands.filter(command => command[1] === 'custom')).toEqual([
    custom('form_started'), custom('whatsapp_form_handoff'), custom('whatsapp_clicked'), custom('phone_clicked'), custom('email_clicked'),
  ])
  expect(JSON.stringify(commands)).not.toMatch(/synthetic@example|0501234567|הודעת בדיקה|lead_created/)
  expect(requests.externalRequests).toEqual([])
})

test('blocked popup produces a working draft link without a premature handoff event', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => { window.open = () => null })
  await page.goto(origin)
  await accept(page).click()
  const form = page.locator('form')
  await form.locator('[name=name]').fill('שם בדיקה')
  await form.locator('[name=phone]').fill('050-1234567')
  await form.getByRole('button').click()
  await expect(form.getByRole('status')).toHaveCount(0)
  await form.locator('[name=whatsappConsent]').check()
  await form.getByRole('button').click()
  await expect(form.getByRole('status')).toBeVisible()
  expect(await calls(page)).not.toContainEqual(custom('whatsapp_form_handoff'))
  const [popup] = await Promise.all([page.waitForEvent('popup'), form.getByRole('status').getByRole('link').click()])
  await popup.waitForURL('https://wa.me/**')
  await expect.poll(() => calls(page)).toContainEqual(custom('whatsapp_form_handoff'))
})

for (const width of [390, 1280]) {
  test(`consent panel fits ${width}px and leaves contact controls accessible`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await setup(page)
    await page.goto(origin)
    const panel = page.getByRole('region', { name: 'מדידת פרסום' })
    await expect(panel).toBeVisible()
    const box = (await panel.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    if (width === 390) {
      const bar = (await page.locator('.mobile-cta').boundingBox())!
      expect(box.y + box.height).toBeLessThanOrEqual(bar.y)
    }
    await reject(page).click()
    await expect(panel).toBeHidden()
    await expect(page.locator(width === 390 ? '.mobile-cta a[href^="tel:"]' : '.header-cta')).toBeVisible()
  })
}
