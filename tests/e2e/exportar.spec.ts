import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  abrirPaso,
  analizarPdf,
  ARRASTRE_SOBRE_ROJO,
  AZUL_INTERIOR,
  cargar,
  contieneExif,
  dibujarRecuadro,
  esperarVistaPrevia,
  estadisticasJpeg,
  fixture,
  generarYDescargar,
  jpegsDelPdf,
  paso,
  ROJO_INTERIOR,
  vigilarConsola,
} from './utilidades.ts'

test.describe('Paso 5 · Exportar', () => {
  test('sin documento no se puede generar', async ({ page }) => {
    await page.goto('/')
    await abrirPaso(page, 'Exportar')
    const bloque = paso(page, 'Exportar')
    await expect(bloque.getByRole('button', { name: 'Generar copia protegida' })).toBeDisabled()
    await expect(bloque.getByText('Carga un documento para poder exportarlo.')).toBeVisible()
  })

  test('exporta un PDF aplanado, sin texto ni metadatos y con los datos tapados', async ({ page }) => {
    const errores = vigilarConsola(page)
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Ocultar datos')
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await abrirPaso(page, 'Texto de la marca')
    await paso(page, 'Texto de la marca').getByLabel('Destinatario').fill('EMPRESA DE PRUEBA')
    const { bytes, nombre } = await generarYDescargar(page)
    expect(nombre).toMatch(/^copia-protegida-\d{4}-\d{2}-\d{2}\.pdf$/)
    const analisis = await analizarPdf(bytes)
    expect(analisis.paginas).toBe(1)
    expect(analisis.items).toBe(0)
    expect(analisis.info.Producer).toBe('Protege DNI')
    for (const campo of ['Title', 'Author', 'Subject', 'Keywords']) expect(analisis.info[campo]).toBeUndefined()
    expect(analisis.xmp).toBeNull()
    const [jpeg] = await jpegsDelPdf(bytes)
    const tapada = await estadisticasJpeg(page, jpeg, ROJO_INTERIOR)
    expect(tapada.maximo).toBeLessThanOrEqual(60)
    expect((tapada.mediaR + tapada.mediaG + tapada.mediaB) / 3).toBeLessThanOrEqual(12)
    expect((await estadisticasJpeg(page, jpeg)).maxDiferenciaCanales).toBeLessThanOrEqual(3)
    await expect(page.getByText('Listo. Cuando ya no la necesites')).toBeVisible()
    expect(errores).toEqual([])
  })

  test('con «Mantener el color» el PDF conserva el color', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Opciones de seguridad')
    await paso(page, 'Opciones de seguridad').getByLabel('Mantener el color').check()
    const { bytes } = await generarYDescargar(page)
    const [jpeg] = await jpegsDelPdf(bytes)
    const azul = await estadisticasJpeg(page, jpeg, AZUL_INTERIOR)
    expect(azul.mediaB - azul.mediaR).toBeGreaterThan(80)
  })

  test('exporta JPG sin metadatos EXIF', async ({ page }) => {
    expect(contieneExif(new Uint8Array(await readFile(fixture('dni-ficticio-exif.jpg'))))).toBe(true)
    await page.goto('/')
    await cargar(page, 'dni-ficticio-exif.jpg')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Exportar')
    await paso(page, 'Exportar').getByLabel('JPG').check()
    const { bytes, nombre } = await generarYDescargar(page)
    expect(nombre).toMatch(/^copia-protegida-\d{4}-\d{2}-\d{2}-p1\.jpg$/)
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8])
    expect(contieneExif(bytes)).toBe(false)
  })

  test('un JPG de varias páginas se descarga con un botón por página', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio-2-paginas.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Exportar')
    const bloque = paso(page, 'Exportar')
    await bloque.getByLabel('JPG').check()
    await bloque.getByRole('button', { name: 'Generar copia protegida' }).click()
    await expect(bloque.getByText('Descarga cada página por separado.')).toBeVisible()
    await expect(bloque.getByRole('button', { name: 'Descargar', exact: true })).toHaveCount(0)
    const listo = page.getByText('Listo. Cuando ya no la necesites')
    for (const n of [1, 2]) {
      const descarga = page.waitForEvent('download')
      await bloque.getByRole('button', { name: `Descargar página ${n}` }).click()
      expect((await descarga).suggestedFilename()).toMatch(new RegExp(`^copia-protegida-\\d{4}-\\d{2}-\\d{2}-p${n}\\.jpg$`))
      await expect(bloque.getByText(`Página ${n} descargada ✓`)).toBeVisible()
      if (n === 1) await expect(listo).toHaveCount(0)
    }
    await expect(listo).toBeVisible()
  })

  test('un texto libre vacío o solo con espacios bloquea la exportación', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Texto de la marca')
    const texto = paso(page, 'Texto de la marca')
    await texto.getByLabel('Libre').check()
    await texto.getByLabel('Texto de la marca de agua').fill('   ')
    await abrirPaso(page, 'Exportar')
    const bloque = paso(page, 'Exportar')
    await expect(bloque.getByRole('button', { name: 'Generar copia protegida' })).toBeDisabled()
    await expect(bloque.getByText('Escribe el texto de la marca de agua.')).toBeVisible()
  })

  test('cambiar una opción después de generar obliga a generar de nuevo', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Exportar')
    const bloque = paso(page, 'Exportar')
    await bloque.getByRole('button', { name: 'Generar copia protegida' }).click()
    await expect(bloque.getByRole('button', { name: 'Descargar' })).toBeVisible()
    await abrirPaso(page, 'Opciones de seguridad')
    await paso(page, 'Opciones de seguridad').getByLabel('Opacidad').fill('50')
    await expect(bloque.getByRole('button', { name: 'Descargar' })).toHaveCount(0)
    await expect(bloque.getByRole('button', { name: 'Generar copia protegida' })).toBeEnabled()
  })

  test('resume los avisos activos', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Exportar')
    // Por defecto: sin destinatario, sin finalidad y sin recuadros.
    await expect(paso(page, 'Exportar').getByText('Avisos activos (3)')).toBeVisible()
  })
})
