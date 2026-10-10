import type { Recuadro } from './tipos'

export type Rect = Omit<Recuadro, 'id'>

/** Lado mínimo (relativo) para considerar que hubo arrastre y no un simple toque. */
export const TAMANO_MINIMO_RECUADRO = 0.01

const limitar = (v: number) => Math.min(1, Math.max(0, v))

/** Arrastre en píxeles (en cualquier dirección) → rectángulo relativo recortado a la página. */
export function normalizar(x1: number, y1: number, x2: number, y2: number, ancho: number, alto: number): Rect {
  const izquierda = limitar(Math.min(x1, x2) / ancho)
  const derecha = limitar(Math.max(x1, x2) / ancho)
  const arriba = limitar(Math.min(y1, y2) / alto)
  const abajo = limitar(Math.max(y1, y2) / alto)
  return { x: izquierda, y: arriba, ancho: derecha - izquierda, alto: abajo - arriba }
}

export function aPixeles(r: Rect, ancho: number, alto: number): Rect {
  return { x: r.x * ancho, y: r.y * alto, ancho: r.ancho * ancho, alto: r.alto * alto }
}

/** Rectángulo en píxeles enteros que contiene por completo al recuadro (redondeo hacia fuera). */
export function aPixelesEnteros(r: Rect, ancho: number, alto: number): Rect {
  const x0 = Math.floor(r.x * ancho)
  const y0 = Math.floor(r.y * alto)
  const x1 = Math.ceil((r.x + r.ancho) * ancho)
  const y1 = Math.ceil((r.y + r.alto) * alto)
  return { x: x0, y: y0, ancho: x1 - x0, alto: y1 - y0 }
}

export function esRecuadroValido(r: Rect): boolean {
  return r.ancho >= TAMANO_MINIMO_RECUADRO && r.alto >= TAMANO_MINIMO_RECUADRO
}

/** Recuadro que contiene el punto relativo (x, y); si se solapan, el último dibujado. */
export function recuadroEn(recuadros: Recuadro[], x: number, y: number): Recuadro | undefined {
  for (let i = recuadros.length - 1; i >= 0; i--) {
    const r = recuadros[i]
    if (x >= r.x && x <= r.x + r.ancho && y >= r.y && y <= r.y + r.alto) return r
  }
  return undefined
}

export function escalaParaLadoMaximo(ancho: number, alto: number, ladoMaximo: number): number {
  return Math.min(1, ladoMaximo / Math.max(ancho, alto))
}
