import { describe, expect, it } from 'vitest'
import { nombresDeSalida } from './nombres'

describe('nombresDeSalida', () => {
  const fecha = new Date(2026, 9, 5)

  it('un único PDF con la fecha', () => {
    expect(nombresDeSalida(fecha, 'pdf', 3)).toEqual(['copia-protegida-2026-10-05.pdf'])
  })

  it('un JPG por página, numerados desde 1', () => {
    expect(nombresDeSalida(fecha, 'jpg', 2)).toEqual([
      'copia-protegida-2026-10-05-p1.jpg',
      'copia-protegida-2026-10-05-p2.jpg',
    ])
  })
})
