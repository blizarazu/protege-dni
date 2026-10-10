import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

// Las pruebas unitarias se ejecutan en un Chromium real: core/ usa canvas, ImageBitmap y pdf.js.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
