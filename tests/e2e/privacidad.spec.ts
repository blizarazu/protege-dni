import { expect, test, type Page } from '@playwright/test'
import {
  abrirPaso,
  analizarPdf,
  ARRASTRE_SOBRE_ROJO,
  cargar,
  dibujarRecuadro,
  esperarVistaPrevia,
  generarYDescargar,
  vigilarConsola,
} from './utilidades.ts'

async function flujoCompleto(page: Page) {
  await cargar(page, 'dni-ficticio.pdf')
  await esperarVistaPrevia(page)
  await abrirPaso(page, 'Ocultar datos')
  await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
  return generarYDescargar(page)
}

test.describe('Privacidad', () => {
  test('ninguna petición sale del propio origen y no hay errores de CSP', async ({ page, context, baseURL }) => {
    const errores = vigilarConsola(page)
    const origenes = new Set<string>()
    context.on('request', (peticion) => {
      const url = peticion.url()
      if (!/^(data|blob):/.test(url)) origenes.add(new URL(url).origin)
    })
    await page.goto('/')
    await flujoCompleto(page)
    expect([...origenes]).toEqual([new URL(baseURL!).origin])
    expect(errores).toEqual([])
  })

  test('no guarda nada en el navegador', async ({ page }) => {
    await page.goto('/')
    await flujoCompleto(page)
    const almacen = await page.evaluate(async () => ({
      local: localStorage.length,
      sesion: sessionStorage.length,
      cookies: document.cookie,
      bases: (await indexedDB.databases()).map((b) => b.name),
    }))
    expect(almacen).toEqual({ local: 0, sesion: 0, cookies: '', bases: [] })
  })

  test('funciona sin conexión tras la primera visita', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', 'El service worker de WebKit en Playwright no es fiable; se verifica a mano (tarea 18)')
    await page.goto('/')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
    await context.setOffline(true)
    await page.reload()
    const { bytes } = await flujoCompleto(page)
    expect((await analizarPdf(bytes)).paginas).toBe(1)
  })

  test('es instalable: manifest con nombre, idioma, iconos y modo standalone', async ({ page, request, baseURL }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    const manifest = await (await request.get(new URL(href!, baseURL).href)).json()
    expect(manifest).toMatchObject({ name: 'Protege DNI', lang: 'es', display: 'standalone' })
    expect(manifest.icons).toHaveLength(3)
  })
})
