/// <reference types="vite/client" />

const pixelId = import.meta.env.VITE_OPENAI_PIXEL_ID?.trim() ?? ''
const host = globalThis.location?.hostname.toLowerCase().replace(/\.$/, '') ?? ''
const isLocal = ['localhost', '0.0.0.0', '[::1]'].includes(host)
  || host.endsWith('.localhost') || host.startsWith('127.')

export const pixelConfig = {
  pixelId,
  enabled: import.meta.env.VITE_OPENAI_PIXEL_ENABLED === 'true'
    && /^[A-Za-z0-9_-]+$/.test(pixelId)
    && host !== '' && !isLocal,
  debug: import.meta.env.VITE_OPENAI_PIXEL_DEBUG === 'true',
}
