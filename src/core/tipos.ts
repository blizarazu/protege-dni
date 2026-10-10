/** Recuadro de ocultación en coordenadas relativas a la página (0..1). */
export type Recuadro = { id: string; x: number; y: number; ancho: number; alto: number }

export type Pagina = {
  id: string
  /** Página rasterizada (PDF a 200 ppp) o foto, ya reducida si hacía falta. */
  imagen: ImageBitmap
  anchoPx: number
  altoPx: number
  /** Tamaño de la página en puntos PDF, para la exportación. */
  anchoPt: number
  altoPt: number
  recuadros: Recuadro[]
}

export type CasoId = 'alquiler' | 'banco' | 'suministros' | 'administracion' | 'empleo' | 'otro'

export type DatosGuiados = {
  caso: CasoId
  destinatario: string
  finalidad: string
  referencia: string
  incluirFecha: boolean
  /** Formato dd/mm/aaaa. */
  fecha: string
}

export type ModoTexto = 'guiado' | 'libre'
export type Densidad = 'baja' | 'normal' | 'alta'
export type Formato = 'pdf' | 'jpg'

export type Opciones = {
  /** Porcentaje entero entre 10 y 90. */
  opacidad: number
  densidad: Densidad
  color: boolean
  formato: Formato
}

export type IdAviso =
  | 'sin-destinatario'
  | 'sin-finalidad'
  | 'sin-fecha'
  | 'texto-libre-corto'
  | 'opacidad-baja'
  | 'opacidad-alta'
  | 'densidad-baja'
  | 'color'
  | 'sin-recuadros'
  | 'varias-paginas'

export type NivelAviso = 'riesgo' | 'consejo'
export type NumeroPaso = 1 | 2 | 3 | 4 | 5

export type Aviso = { id: IdAviso; nivel: NivelAviso; mensaje: string; paso: NumeroPaso }
