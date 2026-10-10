import { finalidadSugerida } from '../contenido/plantillas'
import { evaluarAvisos } from '../core/avisos'
import { LONGITUD_MAXIMA_TEXTO, MAXIMO_PAGINAS, OPACIDAD_MAXIMA, OPACIDAD_MINIMA } from '../core/limites'
import { construirTexto, formatearFecha } from '../core/texto'
import type { Aviso, CasoId, DatosGuiados, ModoTexto, Opciones, Pagina, Recuadro } from '../core/tipos'

export type Estado = {
  paginas: Pagina[]
  paginaSeleccionada: string | null
  recuadroSeleccionado: string | null
  modoTexto: ModoTexto
  datosGuiados: DatosGuiados
  textoLibre: string
  opciones: Opciones
}

export type Accion =
  | { tipo: 'anadir-paginas'; paginas: Pagina[] }
  | { tipo: 'eliminar-pagina'; id: string }
  | { tipo: 'mover-pagina'; id: string; direccion: -1 | 1 }
  | { tipo: 'seleccionar-pagina'; id: string }
  | { tipo: 'anadir-recuadro'; paginaId: string; recuadro: Recuadro }
  | { tipo: 'seleccionar-recuadro'; id: string | null }
  | { tipo: 'eliminar-recuadro'; paginaId: string; id: string }
  | { tipo: 'quitar-recuadros'; paginaId: string }
  | { tipo: 'cambiar-modo-texto'; modo: ModoTexto }
  | { tipo: 'cambiar-caso'; caso: CasoId }
  | { tipo: 'cambiar-datos-guiados'; cambios: Partial<Omit<DatosGuiados, 'caso'>> }
  | { tipo: 'cambiar-texto-libre'; texto: string }
  | { tipo: 'editar-a-mano' }
  | { tipo: 'cambiar-opciones'; cambios: Partial<Opciones> }

export function estadoInicial(hoy: Date): Estado {
  return {
    paginas: [],
    paginaSeleccionada: null,
    recuadroSeleccionado: null,
    modoTexto: 'guiado',
    datosGuiados: {
      caso: 'otro',
      destinatario: '',
      finalidad: '',
      referencia: '',
      incluirFecha: true,
      fecha: formatearFecha(hoy),
    },
    textoLibre: '',
    opciones: { opacidad: 40, densidad: 'normal', color: false, formato: 'pdf' },
  }
}

const limitarOpacidad = (v: number) => Math.min(OPACIDAD_MAXIMA, Math.max(OPACIDAD_MINIMA, Math.round(v)))

function actualizarPagina(estado: Estado, id: string, cambio: (p: Pagina) => Pagina): Estado {
  return { ...estado, paginas: estado.paginas.map((p) => (p.id === id ? cambio(p) : p)) }
}

/** Reducer puro: no libera imágenes ni toca el DOM (ver useLiberarImagenes). */
export function reducir(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case 'anadir-paginas': {
      const nuevas = accion.paginas.slice(0, Math.max(0, MAXIMO_PAGINAS - estado.paginas.length))
      if (nuevas.length === 0) return estado
      return {
        ...estado,
        paginas: [...estado.paginas, ...nuevas],
        paginaSeleccionada: estado.paginaSeleccionada ?? nuevas[0].id,
      }
    }
    case 'eliminar-pagina': {
      const indice = estado.paginas.findIndex((p) => p.id === accion.id)
      if (indice === -1) return estado
      const paginas = estado.paginas.filter((p) => p.id !== accion.id)
      const seleccionada =
        estado.paginaSeleccionada === accion.id
          ? (paginas[Math.min(indice, paginas.length - 1)]?.id ?? null)
          : estado.paginaSeleccionada
      return {
        ...estado,
        paginas,
        paginaSeleccionada: seleccionada,
        recuadroSeleccionado: seleccionada === estado.paginaSeleccionada ? estado.recuadroSeleccionado : null,
      }
    }
    case 'mover-pagina': {
      const i = estado.paginas.findIndex((p) => p.id === accion.id)
      const j = i + accion.direccion
      if (i === -1 || j < 0 || j >= estado.paginas.length) return estado
      const paginas = [...estado.paginas]
      ;[paginas[i], paginas[j]] = [paginas[j], paginas[i]]
      return { ...estado, paginas }
    }
    case 'seleccionar-pagina':
      if (!estado.paginas.some((p) => p.id === accion.id)) return estado
      return {
        ...estado,
        paginaSeleccionada: accion.id,
        recuadroSeleccionado: accion.id === estado.paginaSeleccionada ? estado.recuadroSeleccionado : null,
      }
    case 'anadir-recuadro':
      return {
        ...actualizarPagina(estado, accion.paginaId, (p) => ({ ...p, recuadros: [...p.recuadros, accion.recuadro] })),
        recuadroSeleccionado: accion.recuadro.id,
      }
    case 'seleccionar-recuadro':
      return { ...estado, recuadroSeleccionado: accion.id }
    case 'eliminar-recuadro':
      return {
        ...actualizarPagina(estado, accion.paginaId, (p) => ({
          ...p,
          recuadros: p.recuadros.filter((r) => r.id !== accion.id),
        })),
        recuadroSeleccionado: estado.recuadroSeleccionado === accion.id ? null : estado.recuadroSeleccionado,
      }
    case 'quitar-recuadros':
      return { ...actualizarPagina(estado, accion.paginaId, (p) => ({ ...p, recuadros: [] })), recuadroSeleccionado: null }
    case 'cambiar-modo-texto':
      return { ...estado, modoTexto: accion.modo }
    case 'cambiar-caso':
      return {
        ...estado,
        datosGuiados: { ...estado.datosGuiados, caso: accion.caso, finalidad: finalidadSugerida(accion.caso) },
      }
    case 'cambiar-datos-guiados':
      return { ...estado, datosGuiados: { ...estado.datosGuiados, ...accion.cambios } }
    case 'cambiar-texto-libre':
      return { ...estado, textoLibre: accion.texto.slice(0, LONGITUD_MAXIMA_TEXTO) }
    case 'editar-a-mano':
      return {
        ...estado,
        modoTexto: 'libre',
        textoLibre: construirTexto(estado.datosGuiados).slice(0, LONGITUD_MAXIMA_TEXTO),
      }
    case 'cambiar-opciones': {
      const opciones = { ...estado.opciones, ...accion.cambios }
      return { ...estado, opciones: { ...opciones, opacidad: limitarOpacidad(opciones.opacidad) } }
    }
  }
}

export function paginaActual(estado: Estado): Pagina | undefined {
  return estado.paginas.find((p) => p.id === estado.paginaSeleccionada)
}

/** Texto final de la marca. En modo libre, un texto solo de espacios cuenta como vacío. */
export function textoMarca(estado: Estado): string {
  return estado.modoTexto === 'guiado' ? construirTexto(estado.datosGuiados) : estado.textoLibre.trim()
}

export function avisosDe(estado: Estado): Aviso[] {
  return evaluarAvisos({
    modoTexto: estado.modoTexto,
    datosGuiados: estado.datosGuiados,
    textoLibre: estado.textoLibre,
    opciones: estado.opciones,
    numPaginas: estado.paginas.length,
    numRecuadros: estado.paginas.reduce((n, p) => n + p.recuadros.length, 0),
  })
}
