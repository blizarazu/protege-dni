import { degrees, PDFDocument } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'
import cifradoUrl from '../../tests/fixtures/dni-ficticio-cifrado.pdf?url'
import dosPaginasUrl from '../../tests/fixtures/dni-ficticio-2-paginas.pdf?url'
import jpgUrl from '../../tests/fixtures/dni-ficticio.jpg?url'
import pdfUrl from '../../tests/fixtures/dni-ficticio.pdf?url'
import danadoUrl from '../../tests/fixtures/no-es-un-pdf.pdf?url'
import { cargarArchivo, type PedirContrasena } from './cargar'

async function fichero(url: string, nombre: string, tipo: string): Promise<File> {
  const blob = await (await fetch(url)).blob()
  return new File([blob], nombre, { type: tipo })
}

const sinContrasena = (): PedirContrasena => vi.fn(async () => null)

function pixel(imagen: ImageBitmap, x: number, y: number) {
  const lienzo = document.createElement('canvas')
  lienzo.width = imagen.width
  lienzo.height = imagen.height
  const ctx = lienzo.getContext('2d')!
  ctx.drawImage(imagen, 0, 0)
  return Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
}

describe('cargarArchivo · PDF', () => {
  it('rasteriza a 200 ppp y conserva el tamaño en puntos', async () => {
    const pedir = sinContrasena()
    const { paginas, omitidas } = await cargarArchivo(await fichero(pdfUrl, 'dni.pdf', 'application/pdf'), pedir)
    expect(omitidas).toBe(0)
    expect(paginas).toHaveLength(1)
    const [p] = paginas
    expect([p.anchoPx, p.altoPx]).toEqual([1653, 2339])
    expect([p.anchoPt, p.altoPt]).toEqual([595, 842])
    expect(p.recuadros).toEqual([])
    const [r, g] = pixel(p.imagen, Math.round((150 * 200) / 72), Math.round((150 * 200) / 72))
    expect(r).toBeGreaterThan(200)
    expect(g).toBeLessThan(60)
    expect(pedir).not.toHaveBeenCalled()
  })

  it('no rasteriza más páginas de las que caben', async () => {
    const f = await fichero(dosPaginasUrl, 'dos.pdf', 'application/pdf')
    const { paginas, omitidas } = await cargarArchivo(f, sinContrasena(), 1)
    expect(paginas).toHaveLength(1)
    expect(omitidas).toBe(1)
  })

  it('respeta la rotación de la página', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([595, 842]).setRotation(degrees(90))
    const f = new File([new Uint8Array(await doc.save())], 'rotado.pdf', { type: 'application/pdf' })
    const [p] = (await cargarArchivo(f, sinContrasena())).paginas
    expect([Math.round(p.anchoPt), Math.round(p.altoPt)]).toEqual([842, 595])
    expect([p.anchoPx, p.altoPx]).toEqual([2339, 1653])
  })

  it('limita el lado mayor a 4096 px en páginas grandes (PDF escaneado con imagen DCT)', async () => {
    const doc = await PDFDocument.create()
    const imagen = await doc.embedJpg(new Uint8Array(await (await fetch(jpgUrl)).arrayBuffer()))
    doc.addPage([3000, 3000]).drawImage(imagen, { x: 0, y: 0, width: 3000, height: 3000 })
    const f = new File([new Uint8Array(await doc.save())], 'grande.pdf', { type: 'application/pdf' })
    const [p] = (await cargarArchivo(f, sinContrasena())).paginas
    expect(Math.max(p.anchoPx, p.altoPx)).toBe(4096)
    expect([p.anchoPt, p.altoPt]).toEqual([3000, 3000])
    // El cuadrado rojo del DNI ficticio (centro relativo 0,252 × 0,178 en el A4) sigue siendo rojo.
    const [r, g, b] = pixel(p.imagen, Math.round(p.anchoPx * 0.25), Math.round(p.altoPx * 0.18))
    expect(r).toBeGreaterThan(200)
    expect(g).toBeLessThan(80)
    expect(b).toBeLessThan(80)
  })

  it('pide la contraseña y vuelve a pedirla si es incorrecta', async () => {
    const pedir = vi.fn<PedirContrasena>().mockResolvedValueOnce('mala').mockResolvedValueOnce('clave-de-prueba')
    const { paginas } = await cargarArchivo(await fichero(cifradoUrl, 'cifrado.pdf', 'application/pdf'), pedir)
    expect(paginas).toHaveLength(1)
    expect(pedir.mock.calls).toEqual([[false], [true]])
  })

  it('cancelar la contraseña lanza ErrorCarga «cancelado»', async () => {
    const f = await fichero(cifradoUrl, 'cifrado.pdf', 'application/pdf')
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ name: 'ErrorCarga', codigo: 'cancelado' })
  })

  it('un PDF dañado lanza «pdf-danado»', async () => {
    const f = await fichero(danadoUrl, 'roto.pdf', 'application/pdf')
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ codigo: 'pdf-danado' })
  })
})

describe('cargarArchivo · imágenes y tipos', () => {
  it('carga un JPG tratándolo como un escaneo a 200 ppp', async () => {
    const [p] = (await cargarArchivo(await fichero(jpgUrl, 'dni.jpg', 'image/jpeg'), sinContrasena())).paginas
    expect([p.anchoPx, p.altoPx]).toEqual([827, 1170])
    expect(p.anchoPt).toBeCloseTo((827 * 72) / 200)
  })

  it('reduce las imágenes cuyo lado mayor supera 4096 px', async () => {
    const lienzo = document.createElement('canvas')
    lienzo.width = 5000
    lienzo.height = 1000
    const blob: Blob = await new Promise((ok) => lienzo.toBlob((b) => ok(b!), 'image/png'))
    const [p] = (await cargarArchivo(new File([blob], 'grande.png', { type: 'image/png' }), sinContrasena())).paginas
    expect([p.anchoPx, p.altoPx]).toEqual([4096, 819])
  })

  it('rechaza tipos no admitidos', async () => {
    const f = new File(['hola'], 'notas.txt', { type: 'text/plain' })
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ codigo: 'tipo' })
  })

  it('un HEIC que el navegador no decodifica lanza «heic»', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'foto.heic', { type: 'image/heic' })
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ codigo: 'heic' })
  })

  it('una imagen dañada lanza «imagen-danada»', async () => {
    const f = new File([new Uint8Array([0xff, 0xd8, 1, 2])], 'rota.jpg', { type: 'image/jpeg' })
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ codigo: 'imagen-danada' })
  })
})
