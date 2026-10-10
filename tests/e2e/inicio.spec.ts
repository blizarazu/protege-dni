import { expect, test } from '@playwright/test'
import { paso, vigilarConsola } from './utilidades.ts'

test('la app carga con su título y su política de seguridad', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Protege DNI')
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("connect-src 'self'")
})

test('muestra el distintivo de privacidad y los cinco pasos', async ({ page }) => {
  const errores = vigilarConsola(page)
  await page.goto('/')
  await expect(page.getByText('Tu documento no sale de este dispositivo')).toBeVisible()
  for (const titulo of ['Documento', 'Ocultar datos (opcional)', 'Texto de la marca', 'Opciones de seguridad', 'Exportar']) {
    await expect(paso(page, titulo)).toBeVisible()
  }
  await expect(paso(page, 'Documento')).toHaveAttribute('open', '')
  expect(errores).toEqual([])
})

test('navega a buenas prácticas, con fuentes seguras, y vuelve', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Buenas prácticas' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Buenas prácticas para compartir tu DNI' })).toBeVisible()
  await expect(page.locator('.lista-practicas > li')).toHaveCount(9)
  const externos = page.locator('a[target="_blank"]')
  expect(await externos.count()).toBeGreaterThan(0)
  for (const enlace of await externos.all()) await expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
  await page.getByRole('link', { name: 'Volver al editor' }).click()
  await expect(paso(page, 'Documento')).toBeVisible()
})

test('explica cómo comprobar que el documento no sale del dispositivo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '¿Cómo puedo comprobarlo?' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('¿Cómo puedo comprobar')
  await expect(page.getByRole('heading', { level: 2, name: 'Pruébalo en modo avión' })).toBeVisible()
  // La PWA guarda sus propios ficheros para funcionar sin conexión: la promesa es sobre el documento.
  await expect(page.getByRole('heading', { level: 2, name: 'Nada de tu documento se guarda' })).toBeVisible()
  await expect(page.getByText('El navegador solo guarda los ficheros de la propia app')).toBeVisible()
})
