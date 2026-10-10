import { aPixelesEnteros, escalaParaLadoMaximo } from './geometria'
import { PIXELES_POR_PUNTO } from './limites'
import { dibujarMarca } from './marca'
import type { Opciones, Pagina } from './tipos'

export type OpcionesProcesado = Pick<Opciones, 'opacidad' | 'densidad' | 'color'>

/** Luminancia BT.601, igual en los tres canales. Se evita `ctx.filter`, poco fiable en Safari. */
export function aGrises(ctx: CanvasRenderingContext2D, ancho: number, alto: number): void {
  const imagen = ctx.getImageData(0, 0, ancho, alto)
  const p = imagen.data
  for (let i = 0; i < p.length; i += 4) {
    const y = Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2])
    p[i] = y
    p[i + 1] = y
    p[i + 2] = y
  }
  ctx.putImageData(imagen, 0, 0)
}

/**
 * Orden fijo: fondo blanco → imagen → recuadros negros → marca → grises.
 * Sin `ladoMaximo`: resolución completa (exportación). Con él: vista previa reducida.
 */
export function procesarPagina(
  pagina: Pagina,
  texto: string,
  opciones: OpcionesProcesado,
  ladoMaximo?: number,
): HTMLCanvasElement {
  const escala = ladoMaximo ? escalaParaLadoMaximo(pagina.anchoPx, pagina.altoPx, ladoMaximo) : 1
  const ancho = Math.max(1, Math.round(pagina.anchoPx * escala))
  const alto = Math.max(1, Math.round(pagina.altoPx * escala))
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('El navegador no permite dibujar en un canvas 2D')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(pagina.imagen, 0, 0, ancho, alto)

  ctx.fillStyle = '#000000'
  for (const recuadro of pagina.recuadros) {
    const p = aPixelesEnteros(recuadro, ancho, alto)
    ctx.fillRect(p.x, p.y, p.ancho, p.alto)
  }

  dibujarMarca(ctx, ancho, alto, texto, opciones.opacidad, opciones.densidad, PIXELES_POR_PUNTO * escala)

  if (!opciones.color) aGrises(ctx, ancho, alto)
  return lienzo
}
