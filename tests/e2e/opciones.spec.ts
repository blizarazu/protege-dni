import { expect, test } from '@playwright/test'
import { abrirPaso, CENTRO_AZUL, cargar, esperarVistaPrevia, paso, pixelVista } from './utilidades.ts'

test.describe('Paso 4 · Opciones de seguridad', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await abrirPaso(page, 'Opciones de seguridad')
  })

  test('la opacidad avisa por debajo del 25 % y aconseja por encima del 70 %', async ({ page }) => {
    const bloque = paso(page, 'Opciones de seguridad')
    const opacidad = bloque.getByLabel('Opacidad')
    await opacidad.fill('20')
    await expect(bloque.getByText('La marca es tan tenue que es fácil borrarla.')).toBeVisible()
    await expect(bloque.locator('[data-opcion="opacidad"] [data-aviso="opacidad-baja"]')).toBeVisible()
    await opacidad.fill('75')
    await expect(bloque.getByText('Puede que no se lean los datos y te rechacen el documento.')).toBeVisible()
    await opacidad.fill('40')
    await expect(bloque.locator('[data-aviso]')).toHaveCount(0)
    await expect(bloque.getByText('40 %')).toBeVisible()
  })

  test('la densidad baja avisa', async ({ page }) => {
    const bloque = paso(page, 'Opciones de seguridad')
    await bloque.getByLabel('Baja').check()
    await expect(bloque.getByText('Quedan zonas sin cubrir que se pueden recortar.')).toBeVisible()
    await expect(bloque.locator('[data-opcion="densidad"] [data-aviso="densidad-baja"]')).toBeVisible()
  })

  test('«Mantener el color» avisa y la vista previa recupera el color', async ({ page }) => {
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    const [r0, , b0] = await pixelVista(page, ...CENTRO_AZUL)
    expect(Math.abs(b0 - r0)).toBeLessThanOrEqual(1)
    const bloque = paso(page, 'Opciones de seguridad')
    await bloque.getByLabel('Mantener el color').check()
    await expect(bloque.getByText('En color es más fácil manipular la copia o imprimirla como si fuera el original.')).toBeVisible()
    await expect(bloque.locator('[data-opcion="color"] [data-aviso="color"]')).toBeVisible()
    await expect.poll(async () => {
      const [r, , b] = await pixelVista(page, ...CENTRO_AZUL)
      return b - r
    }).toBeGreaterThan(80)
  })

  test('«¿Por qué importa?» explica la opción', async ({ page }) => {
    const bloque = paso(page, 'Opciones de seguridad')
    await bloque.getByText('ⓘ ¿Por qué importa?').first().click()
    await expect(bloque.getByText('Entre el 30 % y el 60 % es un buen equilibrio.')).toBeVisible()
  })
})
