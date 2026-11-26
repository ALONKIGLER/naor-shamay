import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    browserName: 'chromium',
    channel: process.env.PIXEL_TEST_BROWSER || undefined,
  },
  webServer: [
    { port: 5180, enabled: 'true', id: 'test_pixel_123' },
    { port: 5181, enabled: 'false', id: 'test_pixel_123' },
    { port: 5182, enabled: 'true', id: '' },
  ].map(({ port, enabled, id }) => ({
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    env: {
      VITE_OPENAI_PIXEL_ENABLED: enabled,
      VITE_OPENAI_PIXEL_ID: id,
      VITE_OPENAI_PIXEL_DEBUG: 'false',
    },
  })),
})
