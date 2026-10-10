import { describe, expect, it } from 'vitest'
import { tamanoFuente } from './marca'
import { procesarPagina, type OpcionesProcesado } from './procesar'
import type { Pagina, Recuadro } from './tipos'

const TEXTO = 'Copia para PRUEBA · Solo para test · 10/10/2026 · No válida para otro uso'
const GRISES: OpcionesProcesado = { opacidad: 40, densidad: 'normal', color: false }
const COLOR: OpcionesProcesado = { ...GRISES, color: true }

async function crearPagina(
  ancho: number,
  alto: number,
  relleno: string | null,
  recuadros: Recuadro[] = [],
): Promise<Pagina> {
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')!
  if (relleno) {
    ctx.fillStyle = relleno
    ctx.fillRect(0, 0, ancho, alto)
  }
  return {
    id: 'p',
    imagen: await createImageBitmap(lienzo),
    anchoPx: ancho,
    altoPx: alto,
    anchoPt: (ancho * 72) / 200,
    altoPt: (alto * 72) / 200,
    recuadros,
  }
}

function datos(lienzo: HTMLCanvasElement, x = 0, y = 0, ancho = lienzo.width, alto = lienzo.height) {
  return lienzo.getContext('2d')!.getImageData(x, y, ancho, alto).data
}

/** Valor mínimo y máximo de los canales RGB (sin alfa). */
function extremos(d: Uint8ClampedArray) {
  let minimo = 255
  let maximo = 0
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      minimo = Math.min(minimo, d[i + c])
      maximo = Math.max(maximo, d[i + c])
    }
  }
  return { minimo, maximo }
}

function oscuros(d: Uint8ClampedArray, umbral = 235) {
  let n = 0
  for (let i = 0; i < d.length; i += 4) if (d[i] < umbral) n++
  return n
}

describe('tamanoFuente', () => {
  it('es proporcional a la página con un mínimo de 7 pt', () => {
    expect(tamanoFuente(1654, 2339, 'normal', 200 / 72)).toBeCloseTo(1654 / 45)
    expect(tamanoFuente(100, 100, 'normal', 200 / 72)).toBeCloseTo((7 * 200) / 72)
    expect(tamanoFuente(1654, 2339, 'baja', 200 / 72)).toBeCloseTo((1654 / 45) * 1.3)
  })
})

describe('procesarPagina', () => {
  it('sin texto no dibuja marca', async () => {
    const r = procesarPagina(await crearPagina(300, 200, '#ffffff'), '', GRISES)
    expect(extremos(datos(r)).minimo).toBe(255)
  })

  it('la marca cubre todo el documento (cuadrícula 4 × 4)', async () => {
    const r = procesarPagina(await crearPagina(800, 600, '#ffffff'), TEXTO, GRISES)
    for (let fila = 0; fila < 4; fila++) {
      for (let col = 0; col < 4; col++) {
        expect(oscuros(datos(r, col * 200, fila * 150, 200, 150))).toBeGreaterThan(0)
      }
    }
  })

  it('más densidad, más superficie marcada', async () => {
    const pagina = await crearPagina(800, 600, '#ffffff')
    const cuenta = (densidad: OpcionesProcesado['densidad']) =>
      oscuros(datos(procesarPagina(pagina, TEXTO, { ...GRISES, densidad })))
    expect(cuenta('alta')).toBeGreaterThan(cuenta('normal'))
    expect(cuenta('normal')).toBeGreaterThan(cuenta('baja'))
  })

  it('más opacidad, marca más oscura', async () => {
    const pagina = await crearPagina(400, 300, '#ffffff')
    const minimo = (opacidad: number) => extremos(datos(procesarPagina(pagina, TEXTO, { ...GRISES, opacidad }))).minimo
    expect(minimo(80)).toBeLessThan(minimo(20))
  })

  it('en escala de grises R = G = B en todos los píxeles', async () => {
    const d = datos(procesarPagina(await crearPagina(200, 200, '#ff0000'), TEXTO, GRISES))
    let distintos = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] !== d[i + 1] || d[i + 1] !== d[i + 2]) distintos++
    expect(distintos).toBe(0)
  })

  it('con color se conserva el color fuera de la marca', async () => {
    const d = datos(procesarPagina(await crearPagina(200, 200, '#ff0000'), TEXTO, COLOR))
    let rojos = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60) rojos++
    expect(rojos).toBeGreaterThan(0)
  })

  it('los recuadros son opacos: dentro solo queda negro y la marca tenue', async () => {
    const recuadro = { id: 'r', x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 }
    const r = procesarPagina(await crearPagina(400, 300, '#ff0000', [recuadro]), TEXTO, COLOR)
    expect(extremos(datos(r, 100, 75, 200, 150)).maximo).toBeLessThanOrEqual(12)
  })

  it('los recuadros se redondean hacia fuera a píxeles enteros', async () => {
    const recuadro = { id: 'r', x: 0.1003, y: 0.1003, ancho: 0.2, alto: 0.2 }
    const r = procesarPagina(await crearPagina(300, 300, '#ff0000', [recuadro]), '', COLOR)
    expect(extremos(datos(r, 30, 30, 61, 61)).maximo).toBe(0)
  })

  it('las zonas transparentes de un PNG salen blancas', async () => {
    const r = procesarPagina(await crearPagina(100, 100, null), '', COLOR)
    expect(extremos(datos(r, 10, 10, 1, 1)).minimo).toBe(255)
  })

  it('la vista previa respeta el lado máximo; la exportación usa la resolución completa', async () => {
    const pagina = await crearPagina(2400, 1200, '#ffffff')
    const vista = procesarPagina(pagina, TEXTO, GRISES, 1200)
    expect([vista.width, vista.height]).toEqual([1200, 600])
    const completa = procesarPagina(pagina, TEXTO, GRISES)
    expect([completa.width, completa.height]).toEqual([2400, 1200])
  })
})
