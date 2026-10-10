import type { CodigoErrorCarga } from '../core/cargar'

type ClaveError = Exclude<CodigoErrorCarga, 'cancelado'> | 'limite' | 'desconocido' | 'exportar' | 'compartir'

/** Nunca incluyen datos del documento. */
export const MENSAJES_ERROR: Record<ClaveError, string> = {
  tipo: 'Este tipo de archivo no es compatible. Usa PDF, JPG o PNG.',
  heic: 'Tu navegador no puede abrir fotos HEIC. Expórtala como JPG o usa «Hacer foto».',
  'pdf-danado': 'No se ha podido leer el PDF. Comprueba que no esté dañado.',
  'imagen-danada': 'No se ha podido abrir la imagen. Comprueba que no esté dañada.',
  limite: 'Solo se admiten 10 páginas.',
  desconocido: 'No se ha podido abrir el archivo.',
  exportar: 'No se ha podido generar el archivo. Prueba con menos páginas o recarga la página.',
  compartir: 'No se ha podido compartir. Prueba con «Descargar».',
}
