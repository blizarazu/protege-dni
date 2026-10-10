import { expect, test } from '@playwright/test'
import { abrirPaso, paso } from './utilidades.ts'

test.describe('Paso 3 · Texto de la marca', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await abrirPaso(page, 'Texto de la marca')
  })

  test('el modo guiado construye el texto y quita los avisos', async ({ page }) => {
    const bloque = paso(page, 'Texto de la marca')
    await expect(bloque.getByText('Sin destinatario, la copia sirve para cualquier trámite.')).toBeVisible()
    await expect(bloque.locator('[data-opcion="destinatario"] [data-aviso="sin-destinatario"]')).toBeVisible()
    await expect(bloque.locator('[data-opcion="finalidad"] [data-aviso="sin-finalidad"]')).toBeVisible()
    await bloque.getByLabel('Caso').selectOption('suministros')
    await expect(bloque.getByLabel('Finalidad')).toHaveValue('cambio de titular o de datos del suministro')
    await bloque.getByLabel('Destinatario').fill('E-DISTRIBUCIÓN')
    await bloque.getByLabel('Fecha', { exact: true }).fill('2026-10-10')
    await expect(bloque.getByLabel('Texto generado')).toHaveText(
      'Copia para E-DISTRIBUCIÓN · Solo para cambio de titular o de datos del suministro · 10/10/2026 · No válida para otro uso',
    )
    await expect(bloque.locator('[data-aviso]')).toHaveCount(0)
  })

  test('sin fecha avisa y oculta el campo de fecha', async ({ page }) => {
    const bloque = paso(page, 'Texto de la marca')
    await bloque.getByLabel('Incluir fecha').uncheck()
    await expect(bloque.getByText('Sin fecha, la copia no caduca y puede reutilizarse dentro de años.')).toBeVisible()
    await expect(bloque.getByLabel('Fecha', { exact: true })).toHaveCount(0)
    await expect(bloque.locator('[data-opcion="fecha"] [data-aviso="sin-fecha"]')).toBeVisible()
  })

  test('«Editar a mano» pasa al modo libre con el texto generado', async ({ page }) => {
    const bloque = paso(page, 'Texto de la marca')
    await bloque.getByLabel('Destinatario').fill('BANCO X')
    await bloque.getByRole('button', { name: 'Editar a mano' }).click()
    await expect(bloque.getByLabel('Libre')).toBeChecked()
    await expect(bloque.getByLabel('Texto de la marca de agua')).toHaveValue(/^Copia para BANCO X · /)
  })

  test('un texto libre corto avisa; el texto se limita a 200 caracteres', async ({ page }) => {
    const bloque = paso(page, 'Texto de la marca')
    await bloque.getByLabel('Libre').check()
    const area = bloque.getByLabel('Texto de la marca de agua')
    await area.fill('COPIA')
    await expect(bloque.getByText('Un texto tan corto o genérico (por ejemplo, «COPIA») no indica para quién ni para qué es.')).toBeVisible()
    await expect(bloque.locator('[data-opcion="texto-libre"] [data-aviso="texto-libre-corto"]')).toBeVisible()
    await expect(bloque.getByText('5/200')).toBeVisible()
    await area.fill('x'.repeat(250))
    await expect(area).toHaveValue('x'.repeat(200))
  })
})
