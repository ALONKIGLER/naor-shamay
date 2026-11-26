import { pixelConfig } from './config'
import { toMeasureCommand, type MeasureCommand, type MeasurementEvent } from './events'

const sdkUrl = 'https://bzrcdn.openai.com/sdk/oaiq.min.js'
const consentKey = 'naor:openai-measurement:v1'
type Consent = 'accepted' | 'rejected' | 'unset'
type Command = MeasureCommand | ['consent', boolean] | ['init', { pixelId: string; debug: boolean }]
type SDK = ((...command: Command) => void) & { q?: IArguments[] }
const browser = globalThis as typeof globalThis & { oaiq?: SDK }
let queue: SDK | undefined
let initialized = false
let failed = false
let loaded = false
let pageViewed = false
const recent = new Map<string, number>()

function readConsent(): Consent {
  if (!pixelConfig.enabled) return 'unset'
  try {
    const saved = localStorage.getItem(consentKey)
    if (saved === 'accepted' || saved === 'rejected') return saved
  } catch {
    // Storage restrictions still allow a choice for the current document.
  }
  return 'unset'
}

let consent = readConsent()
const listeners = new Set<() => void>()
export const getMeasurementConsent = () => consent
export function subscribeMeasurementConsent(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function issue(...command: Command) {
  try {
    browser.oaiq?.(...command)
  } catch {
    if (pixelConfig.debug) console.debug('[OpenAI Pixel] SDK command failed', command[0])
  }
}

function initialize() {
  if (initialized) return
  initialized = true
  if (!browser.oaiq) {
    const stub: SDK = function () {
      // Match the SDK bootstrap contract, which stores arguments objects.
      // eslint-disable-next-line prefer-rest-params
      stub.q?.push(arguments)
    }
    stub.q = []
    queue = stub
    browser.oaiq = stub
  }
  issue('consent', false)
  issue('init', { pixelId: pixelConfig.pixelId, debug: pixelConfig.debug })
  issue('consent', true)
  if (document.querySelector(`script[src="${sdkUrl}"]`) || !queue) return

  const script = document.createElement('script')
  script.src = sdkUrl
  script.async = true
  script.addEventListener('load', () => { loaded = true }, { once: true })
  script.addEventListener('error', () => {
    failed = true
    if (queue?.q) queue.q.length = 0
    if (pixelConfig.debug) console.debug('[OpenAI Pixel] SDK failed to load')
  }, { once: true })
  document.head.append(script)
}

export function track(event: MeasurementEvent) {
  if (!pixelConfig.enabled || consent !== 'accepted' || failed) return
  if (event.name === 'page_viewed') {
    if (pageViewed) return
    pageViewed = true
  } else if (!loaded && browser.oaiq === queue && (queue?.q?.length ?? 0) >= 100) {
    return
  } else {
    const key = event.name === 'contents_viewed' ? event.service : event.name
    const now = performance.now()
    if (now - (recent.get(key) ?? -Infinity) < 700) return
    recent.set(key, now)
  }
  initialize()
  issue(...toMeasureCommand(event))
}

function updateConsent(choice: Consent) {
  if (consent === choice) return
  consent = choice
  if (initialized && !failed) {
    if (choice !== 'accepted' && !loaded && browser.oaiq === queue && queue?.q) {
      // The SDK has yet to consume the stub. Remove pending measurements and grants.
      for (let i = queue.q.length - 1; i >= 0; i--) {
        const [command, value] = queue.q[i]
        if (command === 'measure' || (command === 'consent' && value === true)) queue.q.splice(i, 1)
      }
    }
    issue('consent', choice === 'accepted')
  }
  if (choice === 'accepted') track({ name: 'page_viewed' })
  listeners.forEach(listener => listener())
}

export function setMeasurementConsent(choice: Exclude<Consent, 'unset'>) {
  if (!pixelConfig.enabled) return
  try {
    localStorage.setItem(consentKey, choice)
  } catch {
    // Keep functional in this tab when persistence is unavailable.
  }
  updateConsent(choice)
}

export function startMeasurement() {
  track({ name: 'page_viewed' })
}

if (pixelConfig.enabled) {
  window.addEventListener('storage', event => {
    if (event.key === consentKey || event.key === null) updateConsent(readConsent())
  })
}
