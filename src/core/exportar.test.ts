import { PDFDocument } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canvasAJpeg, compartir, descargar, generarFicheros, pdfDesdeJpegs, puedeCompartir } from './exportar'
import type { Opciones, Pagina } from './tipos'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

function lienzo(ancho: number, alto: number, color = '#ff0000'): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = ancho
  c.height = alto
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, ancho, alto)
  return c
}

async function pagina(ancho: number, alto: number): Promise<Pagina> {
  return {
    id: crypto.randomUUID(),
    imagen: await createImageBitmap(lienzo(ancho, alto)),
    anchoPx: ancho,
    altoPx: alto,
    anchoPt: (ancho * 72) / 200,
    altoPt: (alto * 72) / 200,
    recuadros: [],
  }
}

const OPCIONES: Opciones = { opacidad: 40, densidad: 'normal', color: false, formato: 'pdf' }
const FECHA = new Date(2026, 9, 10)
const bytesDe = async (b: Blob) => new Uint8Array(await b.arrayBuffer())
const contieneExif = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes).includes('Exif')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('canvasAJpeg', () => {
  it('genera un JPEG sin segmento EXIF', async () => {
    const bytes = await bytesDe(await canvasAJpeg(lienzo(50, 50)))
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8])
    expect(contieneExif(bytes)).toBe(false)
  })
})

describe('pdfDesdeJpegs', () => {
  it('una página por imagen, con su tamaño y sin metadatos identificativos', async () => {
    const jpegs = [
      { jpeg: await canvasAJpeg(lienzo(100, 140)), anchoPt: 595, altoPt: 842 },
      { jpeg: await canvasAJpeg(lienzo(140, 100)), anchoPt: 842, altoPt: 595 },
    ]
    const pdf = await pdfDesdeJpegs(jpegs)
    expect(pdf.type).toBe('application/pdf')
    const doc = await PDFDocument.load(await bytesDe(pdf), { updateMetadata: false })
    expect(doc.getPageCount()).toBe(2)
    expect(doc.getPage(0).getSize()).toEqual({ width: 595, height: 842 })
    expect(doc.getPage(1).getSize()).toEqual({ width: 842, height: 595 })
    expect(doc.getProducer()).toBe('Protege DNI')
    expect(doc.getTitle()).toBeUndefined()
    expect(doc.getAuthor()).toBeUndefined()
  })

  it('el PDF no tiene texto extraíble ni XMP', async () => {
    const pdf = await pdfDesdeJpegs([{ jpeg: await canvasAJpeg(lienzo(100, 100)), anchoPt: 100, altoPt: 100 }])
    const documento = await pdfjs.getDocument({ data: await bytesDe(pdf) }).promise
    const texto = await (await documento.getPage(1)).getTextContent()
    expect(texto.items).toHaveLength(0)
    expect((await documento.getMetadata()).metadata).toBeNull()
  })
})

describe('generarFicheros', () => {
  it('PDF: un fichero con el nombre fechado', async () => {
    const ficheros = await generarFicheros([await pagina(200, 280), await pagina(200, 280)], 'Copia para PRUEBA', OPCIONES, FECHA)
    expect(ficheros.map((f) => [f.name, f.type])).toEqual([['copia-protegida-2026-10-10.pdf', 'application/pdf']])
    const doc = await PDFDocument.load(await bytesDe(ficheros[0]))
    expect(doc.getPageCount()).toBe(2)
  })

  it('JPG: un fichero por página', async () => {
    const ficheros = await generarFicheros([await pagina(200, 280), await pagina(200, 280)], 'Copia para PRUEBA', { ...OPCIONES, formato: 'jpg' }, FECHA)
    expect(ficheros.map((f) => [f.name, f.type])).toEqual([
      ['copia-protegida-2026-10-10-p1.jpg', 'image/jpeg'],
      ['copia-protegida-2026-10-10-p2.jpg', 'image/jpeg'],
    ])
  })
})

describe('compartir y descargar', () => {
  const ficheros = [new File(['x'], 'copia.pdf', { type: 'application/pdf' })]

  it('puedeCompartir exige share y canShare', () => {
    expect(puedeCompartir(ficheros, {})).toBe(false)
    expect(puedeCompartir(ficheros, { share: async () => {}, canShare: () => false })).toBe(false)
    expect(puedeCompartir(ficheros, { share: async () => {}, canShare: () => true })).toBe(true)
  })

  it('compartir distingue cancelación de error', async () => {
    expect(await compartir(ficheros, { share: async () => {} })).toBe('compartido')
    const cancelar = async () => {
      throw new DOMException('cancelado', 'AbortError')
    }
    expect(await compartir(ficheros, { share: cancelar })).toBe('cancelado')
    const fallar = async () => {
      throw new DOMException('no permitido', 'NotAllowedError')
    }
    await expect(compartir(ficheros, { share: fallar })).rejects.toThrow('no permitido')
  })

  it('descargar pulsa un enlace por fichero con su nombre', () => {
    const nombres: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nombres.push(this.download)
    })
    descargar([...ficheros, new File(['y'], 'otra.jpg', { type: 'image/jpeg' })])
    expect(nombres).toEqual(['copia.pdf', 'otra.jpg'])
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })
})
