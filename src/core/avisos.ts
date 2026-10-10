import { MENSAJES_AVISO } from '../contenido/avisos'
import type { Aviso, DatosGuiados, IdAviso, ModoTexto, NivelAviso, NumeroPaso, Opciones } from './tipos'

export type EntradaAvisos = {
  modoTexto: ModoTexto
  datosGuiados: DatosGuiados
  textoLibre: string
  opciones: Opciones
  numPaginas: number
  numRecuadros: number
}

export const UMBRAL_OPACIDAD_BAJA = 25
export const UMBRAL_OPACIDAD_ALTA = 70
export const MINIMO_TEXTO_LIBRE = 20

/** Reglas de la sección 4 de la especificación. Nunca bloquean: solo informan. */
export function evaluarAvisos(e: EntradaAvisos): Aviso[] {
  const avisos: Aviso[] = []
  const anadir = (id: IdAviso, nivel: NivelAviso, paso: NumeroPaso) =>
    avisos.push({ id, nivel, paso, mensaje: MENSAJES_AVISO[id] })

  if (e.modoTexto === 'guiado') {
    const d = e.datosGuiados
    if (!d.destinatario.trim()) anadir('sin-destinatario', 'riesgo', 3)
    if (!d.finalidad.trim()) anadir('sin-finalidad', 'riesgo', 3)
    if (!d.incluirFecha || !d.fecha.trim()) anadir('sin-fecha', 'riesgo', 3)
  } else if (e.textoLibre.trim().length < MINIMO_TEXTO_LIBRE) {
    anadir('texto-libre-corto', 'riesgo', 3)
  }

  if (e.opciones.opacidad < UMBRAL_OPACIDAD_BAJA) anadir('opacidad-baja', 'riesgo', 4)
  if (e.opciones.opacidad > UMBRAL_OPACIDAD_ALTA) anadir('opacidad-alta', 'consejo', 4)
  if (e.opciones.densidad === 'baja') anadir('densidad-baja', 'riesgo', 4)
  if (e.opciones.color) anadir('color', 'riesgo', 4)

  if (e.numPaginas > 0 && e.numRecuadros === 0) anadir('sin-recuadros', 'consejo', 2)
  if (e.numPaginas >= 2) anadir('varias-paginas', 'consejo', 1)
  return avisos
}
