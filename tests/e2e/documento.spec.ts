import { expect, test } from '@playwright/test'
import { CENTRO_AZUL, cargar, esperarVistaPrevia, paso, pixelVista, vigilarConsola } from './utilidades.ts'

test.describe('Paso 1 · Documento', () => {
  test('carga un PDF y muestra la vista previa en escala de grises', async ({ page }) => {
    const errores = vigilarConsola(page)
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await expect(page.getByRole('button', { name: 'Ver página 1' })).toBeVisible()
    const [r, g, b] = await pixelVista(page, ...CENTRO_AZUL)
    expect(Math.abs(r - g)).toBeLessThanOrEqual(1)
    expect(Math.abs(g - b)).toBeLessThanOrEqual(1)
    expect(errores).toEqual([])
  })

  test('carga una foto JPG', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.jpg')
    await esperarVistaPrevia(page)
    await expect(page.getByRole('button', { name: 'Ver página 1' })).toBeVisible()
  })

  test('pide la contraseña de un PDF cifrado y la vuelve a pedir si es incorrecta', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio-cifrado.pdf')
    const dialogo = page.getByRole('dialog', { name: 'Este PDF está protegido' })
    await expect(dialogo).toBeVisible()
    await dialogo.getByLabel('Contraseña del PDF').fill('mala')
    await dialogo.getByRole('button', { name: 'Abrir' }).click()
    await expect(dialogo.getByRole('alert')).toHaveText('Contraseña incorrecta')
    await dialogo.getByLabel('Contraseña del PDF').fill('clave-de-prueba')
    await dialogo.getByRole('button', { name: 'Abrir' }).click()
    await expect(dialogo).toBeHidden()
    await esperarVistaPrevia(page)
  })

  test('cancelar la contraseña no carga nada ni muestra error', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio-cifrado.pdf')
    const dialogo = page.getByRole('dialog', { name: 'Este PDF está protegido' })
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('button', { name: 'Ver página 1' })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('rechaza un archivo no compatible y avisa de un PDF dañado', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'texto.txt')
    await expect(page.getByRole('alert')).toHaveText('Este tipo de archivo no es compatible. Usa PDF, JPG o PNG.')
    await cargar(page, 'no-es-un-pdf.pdf')
    await expect(page.getByRole('alert')).toHaveText('No se ha podido leer el PDF. Comprueba que no esté dañado.')
  })

  test('varias páginas: aviso, reordenar y eliminar', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio-2-paginas.pdf')
    await expect(page.getByRole('button', { name: 'Ver página 2' })).toBeVisible()
    // Acotado al paso 1: desde la tarea 14 el mismo aviso aparece también en el resumen del paso 5.
    const aviso = paso(page, 'Documento').getByText('Envía las dos caras solo si te las piden.')
    await expect(aviso).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver página 1' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Bajar página 1' }).click()
    await expect(page.getByRole('button', { name: 'Ver página 2' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Eliminar página 1' }).click()
    await expect(page.getByRole('button', { name: /^Ver página \d+$/ })).toHaveCount(1)
    await expect(aviso).toHaveCount(0)
  })

  test('no admite más de 10 páginas', async ({ page }) => {
    await page.goto('/')
    await cargar(page, ...Array<string>(6).fill('dni-ficticio-2-paginas.pdf'))
    await expect(page.getByRole('alert')).toHaveText('Solo se admiten 10 páginas.')
    await expect(page.getByRole('button', { name: /^Ver página \d+$/ })).toHaveCount(10)
  })

  test('en móvil ofrece hacer una foto', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'escritorio', 'Solo en dispositivos táctiles')
    await page.goto('/')
    await expect(page.getByText('Hacer foto')).toBeVisible()
  })
})
