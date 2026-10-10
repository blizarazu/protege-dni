import { expect, test } from '@playwright/test'
import { abrirPaso, ARRASTRE_SOBRE_ROJO, cargar, dibujarRecuadro, esperarVistaPrevia, lienzoVista, paso } from './utilidades.ts'

const PASOS_CERRADOS = ['Ocultar datos', 'Texto de la marca', 'Opciones de seguridad', 'Exportar']

test.describe('Maquetación y navegación', () => {
  test('dos columnas desde 900 px y vista previa arriba en móvil, sin scroll horizontal ni cabecera encima', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    for (const titulo of PASOS_CERRADOS) await abrirPaso(page, titulo)

    const vista = (await page.locator('.editor__vista').boundingBox())!
    const pasos = (await page.locator('.editor__pasos').boundingBox())!
    const escritorio = page.viewportSize()!.width >= 900
    if (escritorio) expect(vista.x).toBeGreaterThanOrEqual(pasos.x + pasos.width)
    else expect(vista.y + vista.height).toBeLessThanOrEqual(pasos.y)

    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
    expect(ancho[0]).toBeLessThanOrEqual(ancho[1])

    // En escritorio la vista previa acompaña al desplazamiento: ni la cabecera la tapa ni se sale por abajo.
    if (escritorio) await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    else await page.evaluate(() => window.scrollTo(0, 0))
    const cabecera = (await page.locator('.cabecera').boundingBox())!
    const lienzo = (await lienzoVista(page).boundingBox())!
    expect(lienzo.y).toBeGreaterThanOrEqual(cabecera.y + cabecera.height)
    expect(lienzo.y + lienzo.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  })

  test('el estado del editor se conserva al visitar las páginas informativas', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Ocultar datos')
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await abrirPaso(page, 'Texto de la marca')
    await page.getByLabel('Destinatario').fill('BANCO FICTICIO')

    await page.getByRole('link', { name: 'Buenas prácticas' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Buenas prácticas para compartir tu DNI' })).toBeVisible()
    await page.getByRole('link', { name: 'Volver al editor' }).click()
    await page.getByRole('link', { name: '¿Cómo puedo comprobarlo?' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('¿Cómo puedo comprobar')
    await page.getByRole('link', { name: 'Volver al editor' }).click()

    await expect(page.getByRole('list', { name: 'Páginas' }).getByRole('listitem')).toHaveCount(1)
    await expect(page.getByText('Recuadros en esta página: 1')).toBeVisible()
    await expect(page.getByLabel('Destinatario')).toHaveValue('BANCO FICTICIO')
    await expect(paso(page, 'Texto de la marca')).toHaveAttribute('open', '')
    await esperarVistaPrevia(page)
  })
})
