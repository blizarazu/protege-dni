import { PIXELES_POR_PUNTO } from './limites'
import type { Densidad } from './tipos'

export const FACTORES_DENSIDAD: Record<Densidad, { tamano: number; paso: number }> = {
  baja: { tamano: 1.3, paso: 3.6 },
  normal: { tamano: 1, paso: 2.6 },
  alta: { tamano: 0.85, paso: 2.1 },
}

/** −30°: con el eje y del canvas hacia abajo, el texto sube de izquierda a derecha. */
export const ANGULO_MARCA = -Math.PI / 6
export const COLOR_MARCA = 'rgb(25, 25, 25)'
export const FUENTE_MARCA = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const SEPARACION = '     '

export function tamanoFuente(
  ancho: number,
  alto: number,
  densidad: Densidad,
  pixelesPorPunto: number = PIXELES_POR_PUNTO,
): number {
  return Math.max(7 * pixelesPorPunto, Math.min(ancho, alto) / 45) * FACTORES_DENSIDAD[densidad].tamano
}

/** Texto diagonal repetido sobre toda la superficie; las filas impares se desplazan media línea. */
export function dibujarMarca(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  texto: string,
  opacidad: number,
  densidad: Densidad,
  pixelesPorPunto: number = PIXELES_POR_PUNTO,
): void {
  if (!texto.trim()) return
  const tamano = tamanoFuente(ancho, alto, densidad, pixelesPorPunto)
  const paso = tamano * FACTORES_DENSIDAD[densidad].paso
  ctx.save()
  ctx.globalAlpha = opacidad / 100
  ctx.fillStyle = COLOR_MARCA
  ctx.font = `${tamano}px ${FUENTE_MARCA}`
  const linea = texto + SEPARACION
  const anchoLinea = ctx.measureText(linea).width
  // Se rellena un cuadrado que cubre la página incluso después de girarlo.
  const radio = Math.hypot(ancho, alto)
  const fila = linea.repeat(Math.ceil((2 * radio) / anchoLinea) + 2)
  ctx.translate(ancho / 2, alto / 2)
  ctx.rotate(ANGULO_MARCA)
  for (let y = -radio, i = 0; y < radio; y += paso, i++) {
    ctx.fillText(fila, -radio - (i % 2) * (anchoLinea / 2), y)
  }
  ctx.restore()
}
