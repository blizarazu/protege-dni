import type { DatosGuiados } from './tipos'

export const SEPARADOR = ' · '
export const CIERRE = 'No válida para otro uso'

/** Construye el texto de la marca a partir de los datos guiados (sección 3.4 de la especificación). */
export function construirTexto(datos: DatosGuiados): string {
  const partes: string[] = []
  const destinatario = datos.destinatario.trim()
  const finalidad = datos.finalidad.trim()
  const referencia = datos.referencia.trim()
  const fecha = datos.fecha.trim()
  if (destinatario) partes.push(`Copia para ${destinatario}`)
  if (finalidad) partes.push(`Solo para ${finalidad}`)
  if (referencia) partes.push(referencia)
  if (datos.incluirFecha && fecha) partes.push(fecha)
  partes.push(CIERRE)
  return partes.join(SEPARADOR)
}

const dosCifras = (n: number) => String(n).padStart(2, '0')

export function formatearFecha(fecha: Date): string {
  return `${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}/${fecha.getFullYear()}`
}

/** `aaaa-mm-dd` (valor de `<input type="date">`) → `dd/mm/aaaa`. */
export function isoAFecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : ''
}

/** `dd/mm/aaaa` → `aaaa-mm-dd`. */
export function fechaAIso(fecha: string): string {
  const [dia, mes, anio] = fecha.split('/')
  return anio && mes && dia ? `${anio}-${mes}-${dia}` : ''
}
