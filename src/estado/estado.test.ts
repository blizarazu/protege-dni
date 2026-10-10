import { describe, expect, it } from 'vitest'
import type { Pagina } from '../core/tipos'
import { avisosDe, estadoInicial, paginaActual, reducir, textoMarca, type Estado } from './estado'

const HOY = new Date(2026, 9, 10)
const pagina = (id: string): Pagina => ({
  id,
  imagen: {} as ImageBitmap,
  anchoPx: 100,
  altoPx: 100,
  anchoPt: 36,
  altoPt: 36,
  recuadros: [],
})
const conPaginas = (...ids: string[]): Estado =>
  reducir(estadoInicial(HOY), { tipo: 'anadir-paginas', paginas: ids.map(pagina) })
const recuadro = (id: string) => ({ id, x: 0.1, y: 0.1, ancho: 0.2, alto: 0.2 })

describe('estadoInicial', () => {
  it('parte de valores seguros y la fecha de hoy', () => {
    const e = estadoInicial(HOY)
    expect(e.opciones).toEqual({ opacidad: 40, densidad: 'normal', color: false, formato: 'pdf' })
    expect(e.modoTexto).toBe('guiado')
    expect(e.datosGuiados).toEqual({
      caso: 'otro',
      destinatario: '',
      finalidad: '',
      referencia: '',
      incluirFecha: true,
      fecha: '10/10/2026',
    })
    expect(e.paginas).toEqual([])
    expect(e.paginaSeleccionada).toBeNull()
  })
})

describe('páginas', () => {
  it('añadir selecciona la primera nueva si no había selección', () => {
    const e = conPaginas('a', 'b')
    expect(e.paginas.map((p) => p.id)).toEqual(['a', 'b'])
    expect(e.paginaSeleccionada).toBe('a')
    expect(reducir(e, { tipo: 'anadir-paginas', paginas: [pagina('c')] }).paginaSeleccionada).toBe('a')
  })

  it('nunca supera 10 páginas', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`)
    expect(conPaginas(...ids).paginas).toHaveLength(10)
  })

  it('eliminar la seleccionada selecciona la vecina, o nada si no quedan', () => {
    let e = conPaginas('a', 'b', 'c')
    e = reducir(e, { tipo: 'seleccionar-pagina', id: 'c' })
    e = reducir(e, { tipo: 'eliminar-pagina', id: 'c' })
    expect(e.paginaSeleccionada).toBe('b')
    e = reducir(e, { tipo: 'seleccionar-pagina', id: 'a' })
    e = reducir(e, { tipo: 'eliminar-pagina', id: 'a' })
    expect(e.paginaSeleccionada).toBe('b')
    e = reducir(e, { tipo: 'eliminar-pagina', id: 'b' })
    expect(e.paginaSeleccionada).toBeNull()
  })

  it('mover intercambia con la vecina y no hace nada en los extremos', () => {
    const e = conPaginas('a', 'b')
    expect(reducir(e, { tipo: 'mover-pagina', id: 'a', direccion: 1 }).paginas.map((p) => p.id)).toEqual(['b', 'a'])
    expect(reducir(e, { tipo: 'mover-pagina', id: 'a', direccion: -1 })).toBe(e)
    expect(reducir(e, { tipo: 'mover-pagina', id: 'b', direccion: 1 })).toBe(e)
  })

  it('cambiar de página quita la selección de recuadro', () => {
    let e = conPaginas('a', 'b')
    e = reducir(e, { tipo: 'anadir-recuadro', paginaId: 'a', recuadro: recuadro('r1') })
    expect(e.recuadroSeleccionado).toBe('r1')
    e = reducir(e, { tipo: 'seleccionar-pagina', id: 'b' })
    expect(e.recuadroSeleccionado).toBeNull()
  })
})

describe('recuadros', () => {
  it('añadir, eliminar y quitar todos', () => {
    let e = conPaginas('a')
    e = reducir(e, { tipo: 'anadir-recuadro', paginaId: 'a', recuadro: recuadro('r1') })
    e = reducir(e, { tipo: 'anadir-recuadro', paginaId: 'a', recuadro: recuadro('r2') })
    expect(paginaActual(e)?.recuadros.map((r) => r.id)).toEqual(['r1', 'r2'])
    e = reducir(e, { tipo: 'eliminar-recuadro', paginaId: 'a', id: 'r2' })
    expect(e.recuadroSeleccionado).toBeNull()
    expect(paginaActual(e)?.recuadros.map((r) => r.id)).toEqual(['r1'])
    e = reducir(e, { tipo: 'quitar-recuadros', paginaId: 'a' })
    expect(paginaActual(e)?.recuadros).toEqual([])
  })
})

describe('texto', () => {
  it('elegir caso rellena la finalidad sugerida', () => {
    const e = reducir(estadoInicial(HOY), { tipo: 'cambiar-caso', caso: 'alquiler' })
    expect(e.datosGuiados).toMatchObject({ caso: 'alquiler', finalidad: 'solicitud de alquiler de vivienda' })
  })

  it('editar a mano pasa al modo libre con el texto generado', () => {
    let e = reducir(estadoInicial(HOY), { tipo: 'cambiar-datos-guiados', cambios: { destinatario: 'BANCO X' } })
    e = reducir(e, { tipo: 'editar-a-mano' })
    expect(e.modoTexto).toBe('libre')
    expect(e.textoLibre).toBe('Copia para BANCO X · 10/10/2026 · No válida para otro uso')
  })

  it('el texto libre se limita a 200 caracteres', () => {
    const e = reducir(estadoInicial(HOY), { tipo: 'cambiar-texto-libre', texto: 'x'.repeat(250) })
    expect(e.textoLibre).toHaveLength(200)
  })

  it('textoMarca: en modo libre recorta espacios y un texto solo de espacios queda vacío', () => {
    let e = reducir(estadoInicial(HOY), { tipo: 'cambiar-modo-texto', modo: 'libre' })
    e = reducir(e, { tipo: 'cambiar-texto-libre', texto: '   ' })
    expect(textoMarca(e)).toBe('')
    e = reducir(e, { tipo: 'cambiar-texto-libre', texto: '  Copia para X  ' })
    expect(textoMarca(e)).toBe('Copia para X')
  })
})

describe('opciones y avisos', () => {
  it('la opacidad se limita a 10–90 y se redondea', () => {
    const e = estadoInicial(HOY)
    expect(reducir(e, { tipo: 'cambiar-opciones', cambios: { opacidad: 5 } }).opciones.opacidad).toBe(10)
    expect(reducir(e, { tipo: 'cambiar-opciones', cambios: { opacidad: 95 } }).opciones.opacidad).toBe(90)
    expect(reducir(e, { tipo: 'cambiar-opciones', cambios: { opacidad: 42.4 } }).opciones.opacidad).toBe(42)
  })

  it('avisosDe cuenta los recuadros de todas las páginas', () => {
    let e = conPaginas('a', 'b')
    expect(avisosDe(e).map((a) => a.id)).toContain('sin-recuadros')
    e = reducir(e, { tipo: 'anadir-recuadro', paginaId: 'b', recuadro: recuadro('r1') })
    expect(avisosDe(e).map((a) => a.id)).not.toContain('sin-recuadros')
  })
})
