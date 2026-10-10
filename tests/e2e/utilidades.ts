import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, type Locator, type Page } from '@playwright/test'
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export const DIRECTORIO_FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url))
export const fixture = (nombre: string): string => `${DIRECTORIO_FIXTURES}${nombre}`

/** Geometría del DNI ficticio A4 (tests/fixtures/generar.mjs), en coordenadas relativas. */
export const CENTRO_ROJO: [number, number] = [0.252, 0.178]
export const CENTRO_AZUL: [number, number] = [0.756, 0.178]
export const ROJO_INTERIOR = { x: 0.19, y: 0.135, ancho: 0.12, alto: 0.085 }
export const AZUL_INTERIOR = { x: 0.69, y: 0.135, ancho: 0.13, alto: 0.085 }
/** Arrastre que cubre el cuadrado rojo con margen. */
export const ARRASTRE_SOBRE_ROJO: [[number, number], [number, number]] = [
  [0.15, 0.1],
  [0.36, 0.26],
]

export function vigilarConsola(page: Page): string[] {
  const errores: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text())
  })
  page.on('pageerror', (e) => errores.push(String(e)))
  return errores
}

export function paso(page: Page, titulo: string): Locator {
  return page.locator('details.paso').filter({ has: page.locator(':scope > summary', { hasText: titulo }) })
}

export async function abrirPaso(page: Page, titulo: string): Promise<void> {
  const detalles = paso(page, titulo)
  if (!(await detalles.evaluate((d: HTMLDetailsElement) => d.open))) {
    await detalles.locator(':scope > summary').click()
  }
}

export async function cargar(page: Page, ...nombres: string[]): Promise<void> {
  await page.getByLabel('Elegir archivo').setInputFiles(nombres.map(fixture))
}

export function lienzoVista(page: Page): Locator {
  return page.locator('canvas[aria-label^="Vista previa"]')
}

export async function esperarVistaPrevia(page: Page): Promise<void> {
  await expect(lienzoVista(page)).toHaveAttribute('data-renderizado', 'si')
}

export async function pixelVista(page: Page, fx: number, fy: number): Promise<[number, number, number]> {
  return lienzoVista(page).evaluate(
    (c: HTMLCanvasElement, [x, y]) => {
      const d = c.getContext('2d')!.getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data
      return [d[0], d[1], d[2]] as [number, number, number]
    },
    [fx, fy] as const,
  )
}

export async function dibujarRecuadro(page: Page, desde: [number, number], hasta: [number, number]): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0))
  const caja = (await page.getByTestId('editor-recuadros').boundingBox())!
  await page.mouse.move(caja.x + caja.width * desde[0], caja.y + caja.height * desde[1])
  await page.mouse.down()
  await page.mouse.move(caja.x + caja.width * hasta[0], caja.y + caja.height * hasta[1], { steps: 5 })
  await page.mouse.up()
}

export async function tocarVista(page: Page, punto: [number, number]): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0))
  const caja = (await page.getByTestId('editor-recuadros').boundingBox())!
  await page.mouse.click(caja.x + caja.width * punto[0], caja.y + caja.height * punto[1])
}

export async function generarYDescargar(page: Page): Promise<{ bytes: Uint8Array; nombre: string }> {
  await abrirPaso(page, 'Exportar')
  await page.getByRole('button', { name: 'Generar copia protegida' }).click()
  const boton = page.getByRole('button', { name: 'Descargar' })
  await expect(boton).toBeVisible()
  const descarga = page.waitForEvent('download')
  await boton.click()
  const d = await descarga
  return { bytes: new Uint8Array(await readFile((await d.path())!)), nombre: d.suggestedFilename() }
}

export async function analizarPdf(bytes: Uint8Array) {
  const tarea = getDocument({ data: bytes.slice() })
  const pdf = await tarea.promise
  const paginas = pdf.numPages
  let items = 0
  for (let n = 1; n <= paginas; n++) items += (await (await pdf.getPage(n)).getTextContent()).items.length
  const meta = await pdf.getMetadata()
  await tarea.destroy()
  return { paginas, items, info: meta.info as Record<string, unknown>, xmp: meta.metadata }
}

export async function jpegsDelPdf(bytes: Uint8Array): Promise<Uint8Array[]> {
  const doc = await PDFDocument.load(bytes)
  const jpegs: Uint8Array[] = []
  for (const [, objeto] of doc.context.enumerateIndirectObjects()) {
    if (objeto instanceof PDFRawStream && objeto.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
      jpegs.push(objeto.contents)
    }
  }
  return jpegs
}

export type Region = { x: number; y: number; ancho: number; alto: number }

/** Decodifica el JPEG en el navegador y resume los píxeles de una región relativa. */
export async function estadisticasJpeg(page: Page, jpeg: Uint8Array, region: Region = { x: 0, y: 0, ancho: 1, alto: 1 }) {
  const base64 = Buffer.from(jpeg).toString('base64')
  return page.evaluate(
    async ({ base64, region }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const imagen = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }))
      const lienzo = new OffscreenCanvas(imagen.width, imagen.height)
      const ctx = lienzo.getContext('2d')!
      ctx.drawImage(imagen, 0, 0)
      const x = Math.floor(region.x * imagen.width)
      const y = Math.floor(region.y * imagen.height)
      const w = Math.max(1, Math.floor(region.ancho * imagen.width))
      const h = Math.max(1, Math.floor(region.alto * imagen.height))
      const d = ctx.getImageData(x, y, w, h).data
      let maximo = 0
      let maxDiferenciaCanales = 0
      let r = 0
      let g = 0
      let b = 0
      for (let i = 0; i < d.length; i += 4) {
        maximo = Math.max(maximo, d[i], d[i + 1], d[i + 2])
        maxDiferenciaCanales = Math.max(maxDiferenciaCanales, Math.abs(d[i] - d[i + 1]), Math.abs(d[i + 1] - d[i + 2]), Math.abs(d[i] - d[i + 2]))
        r += d[i]
        g += d[i + 1]
        b += d[i + 2]
      }
      const n = d.length / 4
      return { maximo, maxDiferenciaCanales, mediaR: r / n, mediaG: g / n, mediaB: b / n }
    },
    { base64, region },
  )
}

export function contieneExif(bytes: Uint8Array): boolean {
  return Buffer.from(bytes).includes(Buffer.from('Exif'))
}
