import { expect, test } from '@playwright/test'

test('la app carga con su título y su política de seguridad', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Protege DNI')
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("connect-src 'self'")
})
