import { expect, test } from '@playwright/test'
import {
  abrirPaso,
  ARRASTRE_SOBRE_ROJO,
  CENTRO_ROJO,
  cargar,
  dibujarRecuadro,
  esperarVistaPrevia,
  paso,
  pixelVista,
  tocarVista,
} from './utilidades.ts'

const AVISO = 'Si el trámite no necesita la firma u otros datos, ocúltalos con un recuadro.'

test.describe('Paso 2 · Ocultar datos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
  })

  test('con el paso cerrado no se pueden dibujar recuadros', async ({ page }) => {
    await expect(page.getByTestId('editor-recuadros')).toHaveCount(0)
  })

  test('dibujar un recuadro tapa el dato en la vista previa', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    await expect(bloque.getByText(AVISO)).toBeVisible()
    expect((await pixelVista(page, ...CENTRO_ROJO))[0]).toBeGreaterThan(50)
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await expect(bloque.getByText('Recuadros en esta página: 1')).toBeVisible()
    await expect.poll(async () => (await pixelVista(page, ...CENTRO_ROJO))[0]).toBeLessThanOrEqual(15)
    await expect(bloque.getByText(AVISO)).toHaveCount(0)
  })

  test('eliminar el recuadro seleccionado y quitar todos', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await bloque.getByRole('button', { name: 'Eliminar recuadro' }).click()
    await expect(bloque.getByText('Recuadros en esta página: 0')).toBeVisible()
    await expect.poll(async () => (await pixelVista(page, ...CENTRO_ROJO))[0]).toBeGreaterThan(50)
    await dibujarRecuadro(page, [0.1, 0.4], [0.3, 0.5])
    await dibujarRecuadro(page, [0.5, 0.4], [0.7, 0.5])
    await expect(bloque.getByText('Recuadros en esta página: 2')).toBeVisible()
    await bloque.getByRole('button', { name: 'Quitar todos' }).click()
    await expect(bloque.getByText('Recuadros en esta página: 0')).toBeVisible()
  })

  test('un toque no crea recuadros: selecciona o deselecciona', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    const eliminar = bloque.getByRole('button', { name: 'Eliminar recuadro' })
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await tocarVista(page, [0.8, 0.8])
    await expect(eliminar).toBeDisabled()
    await expect(bloque.getByText('Recuadros en esta página: 1')).toBeVisible()
    await tocarVista(page, CENTRO_ROJO)
    await expect(eliminar).toBeEnabled()
  })

  test('se puede dibujar cerca del borde inferior y la capa coincide con el canvas', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    await dibujarRecuadro(page, [0.2, 0.85], [0.6, 0.95])
    await expect(bloque.getByText('Recuadros en esta página: 1')).toBeVisible()
    const capa = (await page.getByTestId('editor-recuadros').boundingBox())!
    const lienzo = (await page.locator('.vista-previa canvas').boundingBox())!
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(capa[k] - lienzo[k])).toBeLessThanOrEqual(1)
    }
    const alto = page.viewportSize()!.height
    expect(capa.y + capa.height).toBeLessThanOrEqual(alto)
  })

  test('muestra la guía de qué se puede ocultar', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    await expect(bloque.getByRole('heading', { name: '✅ Normalmente puedes ocultarlo, salvo que te lo pidan expresamente' })).toBeVisible()
    await expect(bloque.getByRole('heading', { name: '⚠️ Ocúltalo solo si sabes que no lo necesitan' })).toBeVisible()
    await expect(bloque.getByRole('heading', { name: '⛔ No lo ocultes: te lo rechazarán' })).toBeVisible()
  })
})
