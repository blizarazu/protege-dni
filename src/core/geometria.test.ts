import { describe, expect, it } from 'vitest'
import {
  aPixeles,
  aPixelesEnteros,
  escalaParaLadoMaximo,
  esRecuadroValido,
  normalizar,
  recuadroEn,
} from './geometria'

describe('normalizar', () => {
  it('convierte un arrastre de izquierda a derecha y de arriba abajo', () => {
    expect(normalizar(100, 50, 300, 150, 400, 200)).toEqual({ x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 })
  })

  it('da el mismo resultado en las cuatro direcciones de arrastre', () => {
    const esperado = { x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 }
    expect(normalizar(300, 150, 100, 50, 400, 200)).toEqual(esperado)
    expect(normalizar(300, 50, 100, 150, 400, 200)).toEqual(esperado)
    expect(normalizar(100, 150, 300, 50, 400, 200)).toEqual(esperado)
  })

  it('recorta a los bordes si el arrastre sale de la página', () => {
    expect(normalizar(-50, -20, 500, 300, 400, 200)).toEqual({ x: 0, y: 0, ancho: 1, alto: 1 })
  })
})

describe('conversión a píxeles', () => {
  it('aPixeles escala sin redondear', () => {
    expect(aPixeles({ x: 0.25, y: 0.5, ancho: 0.5, alto: 0.25 }, 400, 200)).toEqual({ x: 100, y: 100, ancho: 200, alto: 50 })
  })

  it('aPixelesEnteros redondea hacia fuera', () => {
    expect(aPixelesEnteros({ x: 0.1003, y: 0.1003, ancho: 0.2, alto: 0.2 }, 300, 300)).toEqual({
      x: 30,
      y: 30,
      ancho: 61,
      alto: 61,
    })
  })
})

describe('validez y selección', () => {
  it('un toque sin arrastre no es un recuadro válido', () => {
    expect(esRecuadroValido({ x: 0.5, y: 0.5, ancho: 0, alto: 0 })).toBe(false)
    expect(esRecuadroValido({ x: 0.5, y: 0.5, ancho: 0.009, alto: 0.2 })).toBe(false)
    expect(esRecuadroValido({ x: 0.5, y: 0.5, ancho: 0.01, alto: 0.01 })).toBe(true)
  })

  it('recuadroEn devuelve el de encima (el último) que contiene el punto', () => {
    const a = { id: 'a', x: 0, y: 0, ancho: 0.5, alto: 0.5 }
    const b = { id: 'b', x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 }
    expect(recuadroEn([a, b], 0.3, 0.3)?.id).toBe('b')
    expect(recuadroEn([a, b], 0.1, 0.1)?.id).toBe('a')
    expect(recuadroEn([a, b], 0.9, 0.9)).toBeUndefined()
  })
})

describe('escalaParaLadoMaximo', () => {
  it('reduce solo si el lado mayor supera el máximo', () => {
    expect(escalaParaLadoMaximo(5000, 1000, 4096)).toBeCloseTo(4096 / 5000)
    expect(escalaParaLadoMaximo(1000, 5000, 4096)).toBeCloseTo(4096 / 5000)
    expect(escalaParaLadoMaximo(800, 600, 4096)).toBe(1)
  })
})
