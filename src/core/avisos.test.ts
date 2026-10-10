import { describe, expect, it } from 'vitest'
import { MENSAJES_AVISO } from '../contenido/avisos'
import { evaluarAvisos, type EntradaAvisos } from './avisos'

const segura: EntradaAvisos = {
  modoTexto: 'guiado',
  datosGuiados: {
    caso: 'banco',
    destinatario: 'BANCO X',
    finalidad: 'verificación de identidad como cliente',
    referencia: '',
    incluirFecha: true,
    fecha: '10/10/2026',
  },
  textoLibre: '',
  opciones: { opacidad: 40, densidad: 'normal', color: false, formato: 'pdf' },
  numPaginas: 1,
  numRecuadros: 1,
}

const ids = (e: EntradaAvisos) => evaluarAvisos(e).map((a) => a.id)
const conDatos = (cambios: Partial<EntradaAvisos['datosGuiados']>): EntradaAvisos => ({
  ...segura,
  datosGuiados: { ...segura.datosGuiados, ...cambios },
})
const conOpciones = (cambios: Partial<EntradaAvisos['opciones']>): EntradaAvisos => ({
  ...segura,
  opciones: { ...segura.opciones, ...cambios },
})

describe('evaluarAvisos', () => {
  it('una configuración segura no genera avisos', () => {
    expect(evaluarAvisos(segura)).toEqual([])
  })

  it('modo guiado: destinatario, finalidad y fecha', () => {
    expect(ids(conDatos({ destinatario: '  ' }))).toEqual(['sin-destinatario'])
    expect(ids(conDatos({ finalidad: '' }))).toEqual(['sin-finalidad'])
    expect(ids(conDatos({ incluirFecha: false }))).toEqual(['sin-fecha'])
  })

  it('avisa sin fecha si «Incluir fecha» está activada pero la fecha está vacía', () => {
    expect(ids(conDatos({ fecha: ' ' }))).toEqual(['sin-fecha'])
  })

  it('modo libre: avisa con menos de 20 caracteres sin contar los espacios de los lados', () => {
    const libre = (texto: string): EntradaAvisos => ({ ...segura, modoTexto: 'libre', textoLibre: texto })
    expect(ids(libre('COPIA'))).toEqual(['texto-libre-corto'])
    expect(ids(libre(`   ${'x'.repeat(19)}   `))).toEqual(['texto-libre-corto'])
    expect(ids(libre('x'.repeat(20)))).toEqual([])
  })

  it('modo libre no evalúa los campos guiados', () => {
    const e: EntradaAvisos = {
      ...conDatos({ destinatario: '', finalidad: '', incluirFecha: false }),
      modoTexto: 'libre',
      textoLibre: 'Copia para BANCO X · solo apertura de cuenta',
    }
    expect(ids(e)).toEqual([])
  })

  it('opacidad: límites 25 % y 70 %', () => {
    expect(ids(conOpciones({ opacidad: 25 }))).toEqual([])
    expect(ids(conOpciones({ opacidad: 24 }))).toEqual(['opacidad-baja'])
    expect(ids(conOpciones({ opacidad: 70 }))).toEqual([])
    expect(evaluarAvisos(conOpciones({ opacidad: 71 }))).toEqual([
      { id: 'opacidad-alta', nivel: 'consejo', paso: 4, mensaje: MENSAJES_AVISO['opacidad-alta'] },
    ])
  })

  it('densidad baja y color son riesgos del paso 4', () => {
    expect(evaluarAvisos(conOpciones({ densidad: 'baja' }))).toEqual([
      { id: 'densidad-baja', nivel: 'riesgo', paso: 4, mensaje: MENSAJES_AVISO['densidad-baja'] },
    ])
    expect(ids(conOpciones({ color: true }))).toEqual(['color'])
  })

  it('sin recuadros solo aconseja si hay páginas', () => {
    expect(evaluarAvisos({ ...segura, numRecuadros: 0 })).toEqual([
      { id: 'sin-recuadros', nivel: 'consejo', paso: 2, mensaje: MENSAJES_AVISO['sin-recuadros'] },
    ])
    expect(ids({ ...segura, numPaginas: 0, numRecuadros: 0 })).toEqual([])
  })

  it('con 2 o más páginas aconseja enviar solo las caras pedidas', () => {
    expect(evaluarAvisos({ ...segura, numPaginas: 2 })).toEqual([
      { id: 'varias-paginas', nivel: 'consejo', paso: 1, mensaje: MENSAJES_AVISO['varias-paginas'] },
    ])
  })

  it('los riesgos del texto son del paso 3', () => {
    expect(evaluarAvisos(conDatos({ destinatario: '' }))[0]).toMatchObject({ nivel: 'riesgo', paso: 3 })
  })
})
