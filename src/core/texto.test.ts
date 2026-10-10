import { describe, expect, it } from 'vitest'
import { finalidadSugerida, PLANTILLAS } from '../contenido/plantillas'
import { construirTexto, fechaAIso, formatearFecha, isoAFecha } from './texto'
import type { DatosGuiados } from './tipos'

const base: DatosGuiados = {
  caso: 'suministros',
  destinatario: 'E-DISTRIBUCIÓN',
  finalidad: 'cambio de titular o de datos del suministro',
  referencia: 'CUPS ES0031000000000000XX',
  incluirFecha: true,
  fecha: '10/10/2026',
}

describe('construirTexto', () => {
  it('une todas las partes con « · » y termina con el cierre', () => {
    expect(construirTexto(base)).toBe(
      'Copia para E-DISTRIBUCIÓN · Solo para cambio de titular o de datos del suministro · CUPS ES0031000000000000XX · 10/10/2026 · No válida para otro uso',
    )
  })

  it('omite las partes vacías o con solo espacios', () => {
    expect(construirTexto({ ...base, destinatario: '   ', referencia: '' })).toBe(
      'Solo para cambio de titular o de datos del suministro · 10/10/2026 · No válida para otro uso',
    )
  })

  it('no incluye la fecha si está desactivada', () => {
    expect(construirTexto({ ...base, referencia: '', incluirFecha: false })).toBe(
      'Copia para E-DISTRIBUCIÓN · Solo para cambio de titular o de datos del suministro · No válida para otro uso',
    )
  })

  it('no incluye la fecha si está vacía aunque esté activada', () => {
    expect(construirTexto({ ...base, fecha: '' })).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('recorta los espacios de cada campo', () => {
    expect(
      construirTexto({ ...base, destinatario: '  BANCO X  ', finalidad: '', referencia: '', incluirFecha: false }),
    ).toBe('Copia para BANCO X · No válida para otro uso')
  })

  it('sin datos queda solo el cierre', () => {
    expect(construirTexto({ ...base, destinatario: '', finalidad: '', referencia: '', incluirFecha: false })).toBe(
      'No válida para otro uso',
    )
  })
})

describe('fechas', () => {
  it('formatearFecha usa dd/mm/aaaa con ceros a la izquierda', () => {
    expect(formatearFecha(new Date(2026, 0, 5))).toBe('05/01/2026')
  })

  it('convierte entre ISO y dd/mm/aaaa', () => {
    expect(isoAFecha('2026-10-10')).toBe('10/10/2026')
    expect(fechaAIso('10/10/2026')).toBe('2026-10-10')
  })

  it('devuelve cadena vacía si la entrada está incompleta', () => {
    expect(isoAFecha('')).toBe('')
    expect(fechaAIso('10/2026')).toBe('')
  })
})

describe('plantillas', () => {
  it('cubren todos los casos en el orden del selector', () => {
    expect(PLANTILLAS.map((p) => p.id)).toEqual(['alquiler', 'banco', 'suministros', 'administracion', 'empleo', 'otro'])
  })

  it('sugieren la finalidad del caso y ninguna para «Otro»', () => {
    expect(finalidadSugerida('suministros')).toBe('cambio de titular o de datos del suministro')
    expect(finalidadSugerida('otro')).toBe('')
  })
})
